const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'database.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);

// Foreign keys staan in SQLite per connectie standaard uit.
db.pragma('foreign_keys = ON');
// WAL voor betere concurrency tussen lees-/schrijfacties.
db.pragma('journal_mode = WAL');

// Lichte migratie: voor tabellen die voor het UNIQUE-besluit (barcode) zijn
// aangemaakt, droppen we ze als ze leeg zijn. Bij data: harde fout — daar
// hoort een echte migratie bij, dat heeft deze stap bewust niet.
function tableExists(name) {
  return db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(name) !== undefined;
}

function hasUniqueOnColumn(table, column) {
  const indexes = db.pragma(`index_list(${table})`);
  for (const idx of indexes) {
    if (!idx.unique) continue;
    const cols = db.pragma(`index_info(${idx.name})`);
    if (cols.length === 1 && cols[0].name === column) return true;
  }
  return false;
}

db.pragma('foreign_keys = OFF');
for (const table of ['materials', 'sets']) {
  if (!tableExists(table)) continue;
  if (hasUniqueOnColumn(table, 'barcode')) continue;
  const { c } = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get();
  if (c === 0) {
    db.exec(`DROP TABLE ${table}`);
  } else {
    throw new Error(
      `Migratie nodig: tabel '${table}' bevat ${c} rij(en) maar heeft geen UNIQUE-constraint op barcode. ` +
      `Leeg de tabel of voer handmatig een migratie uit voordat de server start.`,
    );
  }
}
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

// Lichte kolom-migratie: voeg ontbrekende kolommen toe voor bestaande DBs.
const bonsCols = db.pragma('table_info(bons)').map((c) => c.name);
if (bonsCols.length > 0 && !bonsCols.includes('notes')) {
  db.exec('ALTER TABLE bons ADD COLUMN notes TEXT');
}

module.exports = db;
