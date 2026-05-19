// Excel-import voor materialen en sets. Twee endpoints op /api/import:
//   POST /preview  → parsen + valideren + tellen, geen wijzigingen in DB
//   POST /execute  → preview opnieuw doen, daarna in één transactie wegschrijven
//
// Ontwerpkeuzes staan in BESLUITEN.md ("Iteratie 6 — import-strategie").

const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../db');
const { nowDutchISO, generateBarcode } = require('../utils');

const router = express.Router();

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

// Leest een werkboek uit een Buffer en geeft {error} of {workbook}.
function readWorkbook(buffer) {
  try {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    return { workbook: wb };
  } catch (err) {
    return { error: `kon Excel-bestand niet lezen: ${err.message}` };
  }
}

// Geeft een array van objecten waarin de keys de kolomtitels zijn (eerste rij).
// __rowNum__ wordt door SheetJS aan elk object gehangen (0-indexed positie in
// het sheet); we converteren naar 1-indexed met +1 voor de header en +1 voor
// menselijke nummering = +2 t.o.v. de data-index.
function sheetRows(workbook, name) {
  const sheet = workbook.Sheets[name];
  if (!sheet) return null;
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
}

// Haalt de daadwerkelijke kolomnamen uit het sheet (eerste rij), zodat we
// "ontbrekende kolom"-fouten kunnen geven die rechtstreeks verwijzen naar de
// verwachte naam.
function sheetHeaders(workbook, name) {
  const sheet = workbook.Sheets[name];
  if (!sheet || !sheet['!ref']) return [];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const headers = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
    if (cell && cell.v !== undefined && cell.v !== null) {
      headers.push(String(cell.v).trim());
    }
  }
  return headers;
}

function checkStructure(workbook) {
  const errors = [];

  for (const [sheetName, expectedCols] of [
    [SHEET_MATERIALS, MATERIAL_COLUMNS],
    [SHEET_SETS, SET_COLUMNS],
  ]) {
    if (!workbook.Sheets[sheetName]) {
      errors.push(`tabblad '${sheetName}' ontbreekt`);
      continue;
    }
    const headers = sheetHeaders(workbook, sheetName);
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
  const matRowsRaw = sheetRows(workbook, SHEET_MATERIALS) || [];
  const setRowsRaw = sheetRows(workbook, SHEET_SETS) || [];

  const errors = [];
  const validMaterials = [];
  const validSets = [];

  matRowsRaw.forEach((row, idx) => {
    const rowNum = (row.__rowNum__ !== undefined ? row.__rowNum__ + 1 : idx + 2);
    const { value, errors: rowErrors } = validateRow(row, 'Naam', 'Aantal', rowNum);
    if (rowErrors) {
      errors.push(...rowErrors);
    } else {
      validMaterials.push(value);
    }
  });

  setRowsRaw.forEach((row, idx) => {
    const rowNum = (row.__rowNum__ !== undefined ? row.__rowNum__ + 1 : idx + 2);
    const { value, errors: rowErrors } = validateRow(row, 'Set-naam', 'Aantal sets', rowNum);
    if (rowErrors) {
      errors.push(...rowErrors);
    } else {
      validSets.push(value);
    }
  });

  return { validMaterials, validSets, errors };
}

router.post('/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'geen bestand ontvangen (veldnaam moet "file" zijn)' });

  const { workbook, error } = readWorkbook(req.file.buffer);
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
    ignoredSheetFound: !!workbook.Sheets[SHEET_IGNORED],
  });
});

router.post('/execute', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'geen bestand ontvangen (veldnaam moet "file" zijn)' });

  const { workbook, error } = readWorkbook(req.file.buffer);
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
