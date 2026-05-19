// Dagelijkse backup van de SQLite-database. Standalone draaibaar vanaf de
// Windows-taakplanner of via `npm run backup`. Werkt ook prima als de Express-
// server tegelijk draait (we doen eerst een WAL-checkpoint TRUNCATE zodat een
// kale file-copy een consistent .db-bestand oplevert).
//
// Resultaat:
//   server/backups/database-YYYY-MM-DD.db      (overschreven bij meerdere runs op dezelfde dag)
//   server/backups/last-backup.json            (status-snapshot voor de admin-banner)
//   server/backups/backup.log                  (append-only audit-trail)
//
// Retentie: 14 dagen. Oudere database-YYYY-MM-DD.db bestanden worden geruimd.
//
// Exit codes: 0 = succes, 1 = fout (gelogd, status weggeschreven).

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const RETENTION_DAYS = 14;

const DB_PATH = path.join(__dirname, 'database.db');
const BACKUP_DIR = path.join(__dirname, 'backups');
const STATUS_FILE = path.join(BACKUP_DIR, 'last-backup.json');
const LOG_FILE = path.join(BACKUP_DIR, 'backup.log');

const pad = (n) => String(n).padStart(2, '0');
function todayString(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendLog(line) {
  try {
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch (err) {
    // Logging mag nooit de backup zelf doen falen.
    console.error('kon niet naar backup.log schrijven:', err.message);
  }
}

function writeStatus(status) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), 'utf8');
  } catch (err) {
    console.error('kon last-backup.json niet wegschrijven:', err.message);
  }
}

// Verwijdert database-YYYY-MM-DD.db bestanden ouder dan RETENTION_DAYS.
// Werkt op de datum in de bestandsnaam — robuuster dan mtime (die kan
// veranderen door bv. een handmatige kopieer-actie).
function pruneOld(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = todayString(cutoff);

  const files = fs.readdirSync(BACKUP_DIR);
  const removed = [];
  for (const f of files) {
    const m = f.match(/^database-(\d{4}-\d{2}-\d{2})\.db$/);
    if (!m) continue;
    if (m[1] < cutoffStr) {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        removed.push(f);
      } catch (err) {
        appendLog(`${new Date().toISOString()} WARN kon ${f} niet verwijderen: ${err.message}`);
      }
    }
  }
  return removed;
}

function runBackup() {
  ensureDir(BACKUP_DIR);

  const now = new Date();
  const filename = `database-${todayString(now)}.db`;
  const dst = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`database niet gevonden op ${DB_PATH}`);
  }

  // WAL-checkpoint TRUNCATE: schrijft alle WAL-records terug naar de hoofd-
  // .db en maakt het WAL-bestand leeg. Daarna is een gewone file-copy
  // consistent — geen halve transactie in de backup.
  const db = new Database(DB_PATH);
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } finally {
    db.close();
  }

  fs.copyFileSync(DB_PATH, dst);

  const removed = pruneOld(now);

  return { filename, removed };
}

function main() {
  const startedAt = new Date();
  try {
    const { filename, removed } = runBackup();
    const status = {
      timestamp: startedAt.toISOString(),
      success: true,
      error: null,
      filename,
    };
    writeStatus(status);
    appendLog(`${startedAt.toISOString()} OK ${filename}${removed.length ? ` (gewist: ${removed.join(', ')})` : ''}`);
    process.exit(0);
  } catch (err) {
    const status = {
      timestamp: startedAt.toISOString(),
      success: false,
      error: err.message,
      filename: null,
    };
    ensureDir(BACKUP_DIR);
    writeStatus(status);
    appendLog(`${startedAt.toISOString()} FAIL ${err.message}`);
    console.error('backup mislukt:', err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { runBackup, pruneOld, STATUS_FILE, BACKUP_DIR };
