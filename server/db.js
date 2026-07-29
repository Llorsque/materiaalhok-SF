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

// v1.12.0 externe verhuur: kolommen op bons voor externe huurder-data en
// bedragen. Idempotent: alleen toevoegen wat nog niet bestaat.
{
  const cols = db.pragma('table_info(bons)').map((c) => c.name);
  if (cols.length > 0) {
    if (!cols.includes('external_org'))     db.exec('ALTER TABLE bons ADD COLUMN external_org TEXT');
    if (!cols.includes('external_contact')) db.exec('ALTER TABLE bons ADD COLUMN external_contact TEXT');
    if (!cols.includes('external_phone'))   db.exec('ALTER TABLE bons ADD COLUMN external_phone TEXT');
    if (!cols.includes('external_email'))   db.exec('ALTER TABLE bons ADD COLUMN external_email TEXT');
    if (!cols.includes('rental_price'))     db.exec('ALTER TABLE bons ADD COLUMN rental_price REAL NOT NULL DEFAULT 0');
    if (!cols.includes('deposit'))          db.exec('ALTER TABLE bons ADD COLUMN deposit REAL NOT NULL DEFAULT 0');
    if (!cols.includes('payment_status'))   db.exec('ALTER TABLE bons ADD COLUMN payment_status TEXT');
  }
}

// v1.12.0 externe verhuur: user_id op bons moet nullable worden, en de
// intern-vs-extern CHECK moet erop staan. SQLite kan NOT NULL niet direct
// weghalen — we detecteren of dat nodig is en herbouwen de tabel dan
// eenmalig. Bestaande bonnen zijn per definitie intern (user_id gevuld,
// externe kolommen NULL) en voldoen dus aan de nieuwe CHECK.
{
  const info = db.pragma('table_info(bons)');
  const userIdCol = info.find((c) => c.name === 'user_id');
  const needsRebuild = userIdCol && userIdCol.notnull === 1;
  if (needsRebuild) {
    // Herbouw binnen één transactie zonder foreign_keys, zodat de CASCADE-
    // gevoelige tabellen (bon_items, damage_reports) tijdens de rename
    // niet klappen. Sessies/logs raken bons niet met een FK, dus veilig.
    db.pragma('foreign_keys = OFF');
    db.exec('BEGIN');
    try {
      db.exec(`
        CREATE TABLE bons_new (
          id                     INTEGER PRIMARY KEY AUTOINCREMENT,
          bon_number             TEXT    NOT NULL UNIQUE,
          user_id                INTEGER,
          start_date             TEXT,
          return_date            TEXT,
          status                 TEXT    NOT NULL CHECK (status IN ('active', 'reserved', 'completed')),
          notes                  TEXT,
          created_at             TEXT    NOT NULL,
          completed_at           TEXT,
          created_by_admin_id    INTEGER,
          reminder_sent_at       TEXT,
          external_org           TEXT,
          external_contact       TEXT,
          external_phone         TEXT,
          external_email         TEXT,
          rental_price           REAL    NOT NULL DEFAULT 0,
          deposit                REAL    NOT NULL DEFAULT 0,
          payment_status         TEXT    CHECK (payment_status IS NULL OR payment_status IN ('open', 'paid')),
          FOREIGN KEY (user_id)             REFERENCES users(id) ON DELETE RESTRICT,
          FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
          CHECK (
            (user_id IS NOT NULL AND external_org IS NULL)
            OR
            (user_id IS NULL AND external_org IS NOT NULL)
          )
        )
      `);
      db.exec(`
        INSERT INTO bons_new (
          id, bon_number, user_id, start_date, return_date, status, notes,
          created_at, completed_at, created_by_admin_id, reminder_sent_at,
          external_org, external_contact, external_phone, external_email,
          rental_price, deposit, payment_status
        )
        SELECT
          id, bon_number, user_id, start_date, return_date, status, notes,
          created_at, completed_at, created_by_admin_id, reminder_sent_at,
          external_org, external_contact, external_phone, external_email,
          rental_price, deposit, payment_status
        FROM bons
      `);
      db.exec('DROP TABLE bons');
      db.exec('ALTER TABLE bons_new RENAME TO bons');
      // Indexen opnieuw zetten — CREATE IF NOT EXISTS in schema.sql heeft
      // ze na de rename niet meer, dus de volgende schema.exec zou ze
      // aanmaken, maar we willen niet vertrouwen op volgorde: hier expliciet.
      db.exec('CREATE INDEX IF NOT EXISTS idx_bons_bon_number ON bons (bon_number)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_bons_user_id    ON bons (user_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_bons_status     ON bons (status)');
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      db.pragma('foreign_keys = ON');
      throw err;
    }
    db.pragma('foreign_keys = ON');
  }
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

// Ronde B — reservering/ophaal-flow: bon_items krijgen twee soft-delete-
// vlaggen om de gescheiden momenten reservering en ophalen te ondersteunen.
// Bestaande items zijn per definitie noch removed noch added → default 0.
{
  const cols = db.pragma('table_info(bon_items)').map((c) => c.name);
  if (cols.length > 0) {
    if (!cols.includes('removed_at_pickup')) {
      db.exec('ALTER TABLE bon_items ADD COLUMN removed_at_pickup INTEGER NOT NULL DEFAULT 0');
    }
    if (!cols.includes('added_at_pickup')) {
      db.exec('ALTER TABLE bon_items ADD COLUMN added_at_pickup INTEGER NOT NULL DEFAULT 0');
    }
  }
}

// Ronde B blok 2 — kwijt/kapot melden: return_condition op bon_items, plus
// available_status op materials en sets. Bestaande rijen krijgen de default
// mee ('returned' / 'available'), wat historisch klopt.
{
  const cols = db.pragma('table_info(bon_items)').map((c) => c.name);
  if (cols.length > 0 && !cols.includes('return_condition')) {
    db.exec("ALTER TABLE bon_items ADD COLUMN return_condition TEXT NOT NULL DEFAULT 'returned'");
  }
}
for (const table of ['materials', 'sets']) {
  const cols = db.pragma(`table_info(${table})`).map((c) => c.name);
  if (cols.length > 0 && !cols.includes('available_status')) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN available_status TEXT NOT NULL DEFAULT 'available'`);
  }
}

module.exports = db;
