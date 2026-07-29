// Excel-import voor materialen en sets. Twee endpoints op /api/import:
//   POST /preview  → parsen + valideren + tellen, geen wijzigingen in DB
//   POST /execute  → preview opnieuw doen, daarna in één transactie wegschrijven
//
// Ontwerpkeuzes staan in BESLUITEN.md ("Iteratie 6 — import-strategie").
//
// Sinds v1.11.0: leest met exceljs (was xlsx/SheetJS). SheetJS had een open
// high-severity npm audit (prototype pollution + ReDoS) zonder fix, en dat
// moest weg vóór de tool via Cloudflare bereikbaar wordt. Het gedrag is
// gelijk gehouden: zelfde tabbladen, kolomnamen, validatie, foutrapportage
// en API-contract.

const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const db = require('../db');
const { nowDutchISO, generateBarcode, logAction } = require('../utils');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Excel-import muteert de inventaris massief — uitsluitend voor admins.
router.use(requireAdmin);

// Bestand komt binnen in-memory, niet op disk. Beperk grootte zodat een
// per ongeluk geüploade dump van 200MB de server niet platlegt.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const SHEET_MATERIALS = 'Losse materialen';
const SHEET_SETS = 'Sets';
const SHEET_IGNORED = 'Nog op te lossen';

const MATERIAL_COLUMNS = [
  'Naam', 'Categorie', 'Aantal', 'Eenheid', 'Type',
  'Locatie', 'Notities', 'Inkooplink',
];
const SET_COLUMNS = [
  'Set-naam', 'Categorie', 'Aantal sets', 'Type',
  'Samenstelling', 'Locatie', 'Notities', 'Inkooplink',
];

// Hoeveel foutregels we maximaal terugsturen in de preview-respons. Voorkomt
// dat een Excel met duizend kapotte rijen een onleesbare lijst oplevert.
const MAX_REPORTED_ERRORS = 50;

function trimOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function parseIntStrict(v) {
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return parseInt(v.trim(), 10);
  return null;
}

// Normaliseert een exceljs-celwaarde naar een simpele JS-waarde (string,
// number, boolean, Date of null). exceljs kan structuren teruggeven voor
// rich text, hyperlinks, formules en errors — die pakken we hier uit,
// zodat de rest van de validatie identiek werkt aan de oude SheetJS-pad.
function cellValue(cell) {
  if (!cell) return null;
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') return v;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) {
      return v.richText.map((r) => r && r.text ? r.text : '').join('');
    }
    if ('hyperlink' in v || 'text' in v) {
      // Voor hyperlink-cellen geeft SheetJS de zichtbare tekst terug in
      // raw-modus; exceljs slaat die op als `.text` naast `.hyperlink`.
      return v.text != null ? v.text : (v.hyperlink != null ? v.hyperlink : null);
    }
    if ('formula' in v) {
      const r = v.result;
      if (r === null || r === undefined) return null;
      if (typeof r === 'object' && 'error' in r) return null;
      return r;
    }
    if ('error' in v) return null;
    return null;
  }
  return null;
}

// Leest een werkboek uit een Buffer en geeft {error} of {workbook}.
// Async i.v.m. exceljs' promise-API.
async function readWorkbook(buffer) {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    return { workbook: wb };
  } catch (err) {
    return { error: `kon Excel-bestand niet lezen: ${err.message}` };
  }
}

// Kolomkoppen uit rij 1: gebruikt voor de structuurcheck ("mist kolom X").
// Lege header-cellen worden overgeslagen — SheetJS deed dat ook.
function sheetHeaders(worksheet) {
  if (!worksheet) return [];
  const headers = [];
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    const v = cellValue(cell);
    if (v !== null && v !== undefined) {
      const s = String(v).trim();
      if (s !== '') headers.push(s);
    }
  });
  return headers;
}

// Vervangt SheetJS's sheet_to_json({ defval: null, raw: true }): loopt over
// de datarijen en bouwt per rij een object { kolomnaam: waarde | null }.
// Volledig lege rijen worden overgeslagen — SheetJS gedroeg zich zo. Elke
// rij krijgt een `__rowNum`-veld dat 1-indexed het Excel-rijnummer bevat,
// zodat foutmeldingen doorverwijzen naar wat de gebruiker in Excel ziet.
function sheetRows(worksheet) {
  if (!worksheet) return null;

  // Header-mapping: kolomindex (1-indexed) → veldnaam. Lege header = niet mee.
  const headers = {};
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const v = cellValue(cell);
    if (v === null || v === undefined) return;
    const s = String(v).trim();
    if (s !== '') headers[colNumber] = s;
  });

  const rows = [];
  // eachRow met { includeEmpty: false } geeft ons het echte rijnummer terug
  // en slaat volledig lege rijen over — ook als die tussen twee gevulde
  // rijen zitten. Een naïeve for-loop op `rowCount` zou daar op struikelen.
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header-rij zelf niet als data behandelen

    const obj = {};
    let anyValue = false;
    for (const [colStr, key] of Object.entries(headers)) {
      const col = parseInt(colStr, 10);
      const cell = row.getCell(col);
      const v = cellValue(cell);
      obj[key] = v === undefined ? null : v;
      if (v !== null && v !== undefined && v !== '') anyValue = true;
    }
    if (!anyValue) return;

    obj.__rowNum = rowNumber;
    rows.push(obj);
  });
  return rows;
}

function checkStructure(workbook) {
  const errors = [];
  for (const [sheetName, expectedCols] of [
    [SHEET_MATERIALS, MATERIAL_COLUMNS],
    [SHEET_SETS, SET_COLUMNS],
  ]) {
    const ws = workbook.getWorksheet(sheetName);
    if (!ws) {
      errors.push(`tabblad '${sheetName}' ontbreekt`);
      continue;
    }
    const headers = sheetHeaders(ws);
    for (const col of expectedCols) {
      if (!headers.includes(col)) {
        errors.push(`tabblad '${sheetName}' mist kolom '${col}'`);
      }
    }
  }
  return errors;
}

// Valideert één rij en geeft {value} of {error}. nameField geeft aan welke
// kolom de naam bevat (verschilt per tabblad), stockField idem.
function validateRow(row, nameField, stockField, rowNum) {
  const errors = [];

  const name = trimOrNull(row[nameField]);
  if (!name) errors.push({ row: rowNum, column: nameField, message: 'mag niet leeg zijn' });

  const stock = parseIntStrict(row[stockField]);
  if (stock === null || stock < 0) {
    errors.push({ row: rowNum, column: stockField, message: 'moet een geheel getal ≥ 0 zijn' });
  }

  const category = trimOrNull(row.Categorie);
  if (!category) errors.push({ row: rowNum, column: 'Categorie', message: 'mag niet leeg zijn' });

  if (errors.length > 0) return { errors };

  return {
    value: {
      name,
      category,
      stock,
      unit: trimOrNull(row.Eenheid),
      type: trimOrNull(row.Type),
      location: trimOrNull(row.Locatie),
      notes: trimOrNull(row.Notities),
      purchase_link: trimOrNull(row.Inkooplink),
      composition: trimOrNull(row.Samenstelling),
      barcode: trimOrNull(row.Barcode),
      __rowNum: rowNum,
    },
  };
}

// Bouwt het preview-object: aantallen + foutregels. Materiaal-type wordt
// genormaliseerd: 'uniek' of 'bulk', alles anders → 'bulk' (de DB-default).
function buildPreview(workbook) {
  const matWs = workbook.getWorksheet(SHEET_MATERIALS);
  const setWs = workbook.getWorksheet(SHEET_SETS);
  const matRowsRaw = matWs ? (sheetRows(matWs) || []) : [];
  const setRowsRaw = setWs ? (sheetRows(setWs) || []) : [];

  const errors = [];
  const validMaterials = [];
  const validSets = [];

  matRowsRaw.forEach((row) => {
    const { value, errors: rowErrors } = validateRow(row, 'Naam', 'Aantal', row.__rowNum);
    if (rowErrors) errors.push(...rowErrors);
    else validMaterials.push(value);
  });

  setRowsRaw.forEach((row) => {
    const { value, errors: rowErrors } = validateRow(row, 'Set-naam', 'Aantal sets', row.__rowNum);
    if (rowErrors) errors.push(...rowErrors);
    else validSets.push(value);
  });

  return { validMaterials, validSets, errors };
}

router.post('/preview', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'geen bestand ontvangen (veldnaam moet "file" zijn)' });

  const { workbook, error } = await readWorkbook(req.file.buffer);
  if (error) return res.status(400).json({ error });

  const structuralErrors = checkStructure(workbook);
  if (structuralErrors.length > 0) {
    return res.status(400).json({ structuralErrors });
  }

  const { validMaterials, validSets, errors } = buildPreview(workbook);

  res.json({
    materialsCount: validMaterials.length,
    setsCount: validSets.length,
    skippedRows: errors.length,
    rowErrors: errors.slice(0, MAX_REPORTED_ERRORS),
    rowErrorsTruncated: errors.length > MAX_REPORTED_ERRORS,
    ignoredSheetFound: !!workbook.getWorksheet(SHEET_IGNORED),
  });
});

router.post('/execute', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'geen bestand ontvangen (veldnaam moet "file" zijn)' });

  const { workbook, error } = await readWorkbook(req.file.buffer);
  if (error) return res.status(400).json({ error });

  const structuralErrors = checkStructure(workbook);
  if (structuralErrors.length > 0) {
    return res.status(400).json({ structuralErrors });
  }

  const { validMaterials, validSets, errors } = buildPreview(workbook);

  const now = nowDutchISO();
  let createdMaterials = 0;
  let updatedMaterials = 0;
  let createdSets = 0;
  let updatedSets = 0;

  // Eén transactie voor de hele import. Bij een onverwachte fout rolt SQLite
  // alles terug — geen halve import in de DB.
  const tx = db.transaction(() => {
    const findMatByBarcode = db.prepare('SELECT * FROM materials WHERE barcode = ?');
    const updateMat = db.prepare(`
      UPDATE materials SET
        name = @name, category = @category, stock = @stock, unit = @unit,
        type = @type, location = @location, notes = @notes,
        purchase_link = @purchase_link, updated_at = @updated_at
      WHERE id = @id
    `);
    const insertMat = db.prepare(`
      INSERT INTO materials
        (name, category, stock, unit, type, location, notes, purchase_link, barcode, created_at, updated_at)
      VALUES
        (@name, @category, @stock, @unit, @type, @location, @notes, @purchase_link, @barcode, @created_at, @updated_at)
    `);

    for (const m of validMaterials) {
      const matType = (m.type === 'uniek' || m.type === 'bulk') ? m.type : 'bulk';
      const existing = m.barcode ? findMatByBarcode.get(m.barcode) : null;
      if (existing) {
        updateMat.run({
          id: existing.id,
          name: m.name,
          category: m.category,
          stock: m.stock,
          unit: m.unit,
          type: matType,
          location: m.location,
          notes: m.notes,
          purchase_link: m.purchase_link,
          updated_at: now,
        });
        updatedMaterials += 1;
      } else {
        const barcode = generateBarcode(db, 'M');
        insertMat.run({
          name: m.name,
          category: m.category,
          stock: m.stock,
          unit: m.unit,
          type: matType,
          location: m.location,
          notes: m.notes,
          purchase_link: m.purchase_link,
          barcode,
          created_at: now,
          updated_at: now,
        });
        createdMaterials += 1;
      }
    }

    const findSetByBarcode = db.prepare('SELECT * FROM sets WHERE barcode = ?');
    const updateSet = db.prepare(`
      UPDATE sets SET
        name = @name, category = @category, stock = @stock, composition = @composition,
        location = @location, notes = @notes, purchase_link = @purchase_link,
        updated_at = @updated_at
      WHERE id = @id
    `);
    const insertSet = db.prepare(`
      INSERT INTO sets
        (name, category, stock, composition, location, notes, purchase_link, barcode, created_at, updated_at)
      VALUES
        (@name, @category, @stock, @composition, @location, @notes, @purchase_link, @barcode, @created_at, @updated_at)
    `);

    for (const s of validSets) {
      const existing = s.barcode ? findSetByBarcode.get(s.barcode) : null;
      if (existing) {
        updateSet.run({
          id: existing.id,
          name: s.name,
          category: s.category,
          stock: s.stock,
          composition: s.composition,
          location: s.location,
          notes: s.notes,
          purchase_link: s.purchase_link,
          updated_at: now,
        });
        updatedSets += 1;
      } else {
        const barcode = generateBarcode(db, 'S');
        insertSet.run({
          name: s.name,
          category: s.category,
          stock: s.stock,
          composition: s.composition,
          location: s.location,
          notes: s.notes,
          purchase_link: s.purchase_link,
          barcode,
          created_at: now,
          updated_at: now,
        });
        createdSets += 1;
      }
    }
  });

  try {
    tx();
  } catch (err) {
    return res.status(500).json({ error: `import mislukt: ${err.message}` });
  }

  const summaryParts = [];
  if (createdMaterials) summaryParts.push(`${createdMaterials} materialen toegevoegd`);
  if (updatedMaterials) summaryParts.push(`${updatedMaterials} materialen bijgewerkt`);
  if (createdSets) summaryParts.push(`${createdSets} sets toegevoegd`);
  if (updatedSets) summaryParts.push(`${updatedSets} sets bijgewerkt`);
  if (errors.length) summaryParts.push(`${errors.length} rijen overgeslagen`);
  logAction('import', `Excel-import: ${summaryParts.length > 0 ? summaryParts.join(', ') : 'geen wijzigingen'}`, req.user.id);

  res.json({
    createdMaterials,
    updatedMaterials,
    createdSets,
    updatedSets,
    skippedRows: errors.length,
    rowErrors: errors.slice(0, MAX_REPORTED_ERRORS),
    rowErrorsTruncated: errors.length > MAX_REPORTED_ERRORS,
  });
});

// Multer-fouten (te groot bestand, etc.) komen als error met code 'LIMIT_*'.
// Vangen we hier af en zetten om naar nette 400 in plaats van een crash.
router.use((err, req, res, next) => {
  if (err && err.code && err.code.startsWith('LIMIT_')) {
    return res.status(400).json({ error: `upload geweigerd: ${err.message}` });
  }
  next(err);
});

module.exports = router;
