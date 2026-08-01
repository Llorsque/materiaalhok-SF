const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'database.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const INDEXES_PATH = path.join(__dirname, 'indexes.sql');

const db = new Database(DB_PATH);

// Foreign keys staan in SQLite per connectie standaard uit.
db.pragma('foreign_keys = ON');
// WAL voor betere concurrency tussen lees-/schrijfacties.
db.pragma('journal_mode = WAL');

// ============================================================================
// Init-volgorde van de database (v1.15.1).
//
// Een grote sprong-update over een oude productiedatabase liep vast omdat de
// bons-herbouw een INSERT ... SELECT deed met kolommen die pas later door de
// migratie werden toegevoegd (bv. reminder_sent_at). De crash brak de
// migratieketen af, waardoor daaropvolgende kolom-toevoegingen (notify_*,
// bon_items-vlaggen, return_condition, available_status) nooit werden
// uitgevoerd. De DB stond dan structureel half-af.
//
// Nieuwe vaste volgorde — elke stap idempotent zodat herhaald opstarten
// veilig is en een half-gemigreerde DB in één restart wordt gerepareerd:
//
//   1. DB openen + pragmas                              (hierboven)
//   2. Legacy barcode-UNIQUE opruiming voor materials/sets
//   3. db.exec(schema.sql)                              // alleen CREATE TABLE
//   4. runColumnMigrations()                            // ensureColumn per veld
//   5. rebuildBonsIfNeeded()                            // user_id nullable + CHECK
//   6. migrateUsersEmailRemindersLegacy()               // v1.7.0 datamigratie
//   7. db.exec(indexes.sql)                             // alle indexen
//
// Regels voor toekomstige migraties:
//   - Nieuwe kolommen ALTIJD toevoegen aan schema.sql (voor verse DBs) én
//     aan runColumnMigrations() via ensureColumn (voor bestaande DBs).
//   - Nooit een kolom in de bons-herbouw (stap 5) verwachten die niet in
//     stap 4 wordt gegarandeerd.
//   - Indexen horen in indexes.sql; nooit inline in db.js.
//   - Data-migraties (waar rijen worden gewijzigd) staan apart, na stap 5.
// ============================================================================

// -- Stap 2: legacy barcode-UNIQUE opruiming --------------------------------
// Voor tabellen die zijn aangemaakt vóór het UNIQUE-besluit op barcode:
// droppen als ze leeg zijn. Bij data: harde fout — dat vereist een echte
// migratie die deze stap bewust niet uitvoert.
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

// -- Stap 3: schema.sql (alleen CREATE TABLE) --------------------------------
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

// -- Stap 4: kolom-migraties -------------------------------------------------
// ensureColumn is idempotent per kolom: checkt of de tabel bestaat, checkt of
// de kolom al bestaat, en voegt anders toe. Zo blokkeert één missende kolom
// nooit de rest — belangrijk voor het repareren van een half-gemigreerde DB
// die door een eerdere crash is achtergebleven.
function ensureColumn(table, name, def) {
  if (!tableExists(table)) return;
  const cols = db.pragma(`table_info(${table})`).map((c) => c.name);
  if (cols.includes(name)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
}

function runColumnMigrations() {
  // -- bons -----------------------------------------------------------------
  // v1.2.0 aanhalingsvelden + v1.5.0 admin-namens-flow
  ensureColumn('bons', 'notes', 'TEXT');
  ensureColumn('bons', 'created_by_admin_id',
    'INTEGER REFERENCES users(id) ON DELETE SET NULL');
  // v1.7.0 retourherinnering-timestamp. Kritisch: moet vóór de bons-herbouw
  // bestaan, anders faalt de INSERT ... SELECT (dit was de productie-crash).
  ensureColumn('bons', 'reminder_sent_at', 'TEXT');
  // v1.12.0 externe verhuur — data op de bon zelf, geen aparte tabel.
  ensureColumn('bons', 'external_org',     'TEXT');
  ensureColumn('bons', 'external_contact', 'TEXT');
  ensureColumn('bons', 'external_phone',   'TEXT');
  ensureColumn('bons', 'external_email',   'TEXT');
  ensureColumn('bons', 'rental_price',     'REAL NOT NULL DEFAULT 0');
  ensureColumn('bons', 'deposit',          'REAL NOT NULL DEFAULT 0');
  ensureColumn('bons', 'payment_status',   'TEXT');

  // -- users ----------------------------------------------------------------
  // v1.7.0 splitsing van email_reminders in drie voorkeuren. De legacy-
  // migratie (stap 6) neemt de oude waarde over en dropt email_reminders.
  ensureColumn('users', 'notify_reservation', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('users', 'notify_pickup',      'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('users', 'notify_reminder',    'INTEGER NOT NULL DEFAULT 1');

  // -- bon_items ------------------------------------------------------------
  // Ronde B soft-delete-vlaggen + kwijt/kapot-conditie.
  ensureColumn('bon_items', 'removed_at_pickup', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('bon_items', 'added_at_pickup',   'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('bon_items', 'return_condition',  "TEXT NOT NULL DEFAULT 'returned'");

  // -- materials / sets -----------------------------------------------------
  // Ronde B blok 2: out-of-service-vlag voor kwijt/kapot unieke items.
  ensureColumn('materials', 'available_status', "TEXT NOT NULL DEFAULT 'available'");
  ensureColumn('sets',      'available_status', "TEXT NOT NULL DEFAULT 'available'");
}

runColumnMigrations();

// -- Stap 5: bons-herbouw voor nullable user_id + intern/extern CHECK -------
// v1.12.0. SQLite kan NOT NULL niet direct weghalen; we detecteren de oude
// vorm via PRAGMA table_info en herbouwen dan eenmalig. Bestaande bonnen
// zijn per definitie intern (user_id gevuld, externe kolommen NULL) en
// voldoen dus aan de nieuwe CHECK. Alle bronkolommen (inclusief
// reminder_sent_at en external_*) bestaan gegarandeerd door stap 4.
//
// De indexen op bons worden bewust NIET inline opnieuw aangemaakt — die
// horen bij stap 7 (indexes.sql) die na deze functie draait.
function rebuildBonsIfNeeded() {
  const info = db.pragma('table_info(bons)');
  const userIdCol = info.find((c) => c.name === 'user_id');
  if (!userIdCol || userIdCol.notnull !== 1) return;

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
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    db.pragma('foreign_keys = ON');
    throw err;
  }
  db.pragma('foreign_keys = ON');
}

rebuildBonsIfNeeded();

// -- Stap 6: users email_reminders → notify_* legacy-migratie ---------------
// v1.7.0. De notify_* kolommen zijn door stap 4 al toegevoegd. Hier nemen we
// de oude waarde over per rij en droppen de oude kolom. Idempotent: als
// email_reminders er niet is (want al eerder gemigreerd of verse DB), doet
// deze stap niks.
function migrateUsersEmailRemindersLegacy() {
  if (!tableExists('users')) return;
  const cols = db.pragma('table_info(users)').map((c) => c.name);
  if (!cols.includes('email_reminders')) return;
  db.exec(`
    UPDATE users
       SET notify_reservation = email_reminders,
           notify_pickup      = email_reminders,
           notify_reminder    = email_reminders
  `);
  db.exec('ALTER TABLE users DROP COLUMN email_reminders');
}

migrateUsersEmailRemindersLegacy();

// -- Stap 7: indexen (altijd als laatste) -----------------------------------
const indexes = fs.readFileSync(INDEXES_PATH, 'utf8');
db.exec(indexes);

module.exports = db;
