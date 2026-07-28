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
if (bonsCols.length > 0 && !bonsCols.includes('created_by_admin_id')) {
  // Nullable FK. Bij het verwijderen van de admin wordt de kolom NULL zodat de
  // bon zelf blijft bestaan (audit-trail via logs). Bestaande bonnen krijgen
  // automatisch NULL — die zijn per definitie door de gebruiker zelf gemaakt.
  db.exec('ALTER TABLE bons ADD COLUMN created_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL');
}

// Herinneringen-opt-out per gebruiker. Bestaande accounts krijgen 1 (aan) als
// default. Bevestigingsmails blijven altijd gaan, zie BESLUITEN.md.
//
// Migratie-verhaal:
//   v1.6.0 → v1.7.0: de grofmazige email_reminders wordt vervangen door drie
//   aparte kolommen (notify_reservation / notify_pickup / notify_reminder).
//   Bestaande waarde wordt naar alle drie de nieuwe kolommen gekopieerd
//   zodat gebruikers niet ineens andere voorkeuren hebben.
{
  const cols = db.pragma('table_info(users)').map((c) => c.name);
  const addIfMissing = (name) => {
    if (!cols.includes(name)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${name} INTEGER NOT NULL DEFAULT 1`);
    }
  };
  if (cols.length > 0) {
    const hadOld = cols.includes('email_reminders');
    addIfMissing('notify_reservation');
    addIfMissing('notify_pickup');
    addIfMissing('notify_reminder');
    if (hadOld) {
      // Neem de oude waarde over voor iedere rij en droppen daarna de oude
      // kolom. SQLite 3.35+ ondersteunt DROP COLUMN; we draaien op 3.53.
      db.exec(`
        UPDATE users
           SET notify_reservation = email_reminders,
               notify_pickup      = email_reminders,
               notify_reminder    = email_reminders
      `);
      db.exec('ALTER TABLE users DROP COLUMN email_reminders');
    }
  }
}

// Retourherinnering-vlag op bons: NULL zolang 'ie niet verstuurd is, ISO-
// timestamp van verzending zodra dat wél gebeurd is. Zo weten we in elke
// scheduler-cyclus welke bonnen nog een herinnering nodig hebben.
if (bonsCols.length > 0 && !bonsCols.includes('reminder_sent_at')) {
  db.exec('ALTER TABLE bons ADD COLUMN reminder_sent_at TEXT');
}

module.exports = db;
