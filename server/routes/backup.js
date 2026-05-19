// Backup-endpoints. Twee routes:
//   GET  /api/backup/status — leest backups/last-backup.json en berekent ageHours/isStale
//   POST /api/backup/run    — draait backup.js synchroon en geeft de nieuwe status terug

const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const router = express.Router();

const SERVER_DIR = path.join(__dirname, '..');
const STATUS_FILE = path.join(SERVER_DIR, 'backups', 'last-backup.json');
const BACKUP_SCRIPT = path.join(SERVER_DIR, 'backup.js');

const STALE_HOURS = 48;

function readStatus() {
  if (!fs.existsSync(STATUS_FILE)) {
    return {
      lastBackup: null,
      success: false,
      error: 'nog geen backup gemaakt',
      ageHours: null,
      isStale: true,
      filename: null,
    };
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  } catch (err) {
    return {
      lastBackup: null,
      success: false,
      error: `kon status-bestand niet lezen: ${err.message}`,
      ageHours: null,
      isStale: true,
      filename: null,
    };
  }

  const ts = raw.timestamp ? new Date(raw.timestamp) : null;
  const ageHours = ts && !Number.isNaN(ts.getTime())
    ? (Date.now() - ts.getTime()) / 3600_000
    : null;

  const isStale = !raw.success || ageHours === null || ageHours > STALE_HOURS;

  return {
    lastBackup: raw.timestamp || null,
    success: !!raw.success,
    error: raw.error || null,
    filename: raw.filename || null,
    ageHours,
    isStale,
  };
}

router.get('/status', (req, res) => {
  res.json(readStatus());
});

router.post('/run', (req, res) => {
  try {
    execFileSync(process.execPath, [BACKUP_SCRIPT], {
      cwd: SERVER_DIR,
      stdio: 'pipe',
    });
  } catch (err) {
    // Het script schrijft zelf al een failed-status weg; we geven die terug
    // zodat de UI exact dezelfde foutboodschap toont.
    return res.status(500).json({
      ...readStatus(),
      runError: err.message,
    });
  }
  res.json(readStatus());
});

module.exports = router;
