// Dotenv als eerste laden — sommige modules (mailer) lezen bij require al uit
// process.env. Bestand mag ontbreken; dotenv geeft dan een nette waarschuwing
// terug via debug maar breekt de start niet.
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
require('./db');
const materialsRouter = require('./routes/materials');
const setsRouter = require('./routes/sets');
const usersRouter = require('./routes/users');
const bonsRouter = require('./routes/bons');
const authRouter = require('./routes/auth');
const importRouter = require('./routes/import');
const backupRouter = require('./routes/backup');
const adminRouter = require('./routes/admin');
const logsRouter = require('./routes/logs');
const damageRouter = require('./routes/damage');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = 3001;

// CORS is er voor de dev-situatie: Vite draait op :5173, backend op :3001,
// dus die twee praten cross-origin en de browser vraagt een preflight.
// In productie serveert dit process de gebouwde frontend zelf onder
// /materiaalhok-SF/ op :3001 — same-origin verkeer doet geen preflight en
// laat deze middleware ongemoeid. Één regel houdt zowel dev als prod juist,
// dus geen env-afhankelijke config die per ongeluk verkeerd kan staan.
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// -- Static-serving detectie --------------------------------------------------
// Productiemodus: één Node-proces serveert de gebouwde SPA (uit dist/) onder
// dezelfde origin als de API. Dev-modus: Vite draait de frontend los; dist/
// bestaat dan meestal niet, en we slaan static-serving stilletjes over met
// een duidelijke logregel.
//
// Volgorde binnen express is bewust:
//   1. cors + express.json
//   2. GET / (root — redirect in prod, plain-text in dev)
//   3. /api/* routers                       ← API voorrang
//   4. static-mount /materiaalhok-SF/       ← alleen als dist/ bestaat
//   5. SPA-fallback /materiaalhok-SF/*      ← index.html voor client-routes
// De API-routers staan bewust vóór de static-mount zodat /api/* nooit door
// static of de fallback wordt afgevangen; een onbekend /api-pad geeft de
// gewone 404 van express, niet index.html.
const distDir = path.join(__dirname, '..', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const hasDist = fs.existsSync(indexHtmlPath);

if (hasDist) {
  app.get('/', (req, res) => res.redirect(302, '/materiaalhok-SF/'));
} else {
  app.get('/', (req, res) => {
    res.type('text/plain').send('Hallo, ik ben de backend van materiaalhok-SF');
  });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/materials', materialsRouter);
app.use('/api/sets', setsRouter);
app.use('/api/users', usersRouter);
app.use('/api/bons', bonsRouter);
app.use('/api', authRouter);
app.use('/api/import', importRouter);
app.use('/api/backup', backupRouter);
app.use('/api/admin', adminRouter);
app.use('/api/logs', logsRouter);
app.use('/api/damage-reports', damageRouter);
app.use('/api/settings', settingsRouter);

if (hasDist) {
  // express.static serveert bestaande assets (bv. /materiaalhok-SF/vite.svg,
  // /materiaalhok-SF/assets/*.js). index: false — de fallback verderop
  // beslist zelf wanneer 'ie index.html teruggeeft, zodat directory-index
  // en SPA-fallback niet met elkaar botsen.
  app.use('/materiaalhok-SF', express.static(distDir, {
    index: false,
    fallthrough: true,
    maxAge: '1h',
  }));

  // SPA-fallback: onbekende paden onder de base-path krijgen index.html
  // zodat client-side routing werkt bij verversen. Regex-patroon in plaats
  // van '/materiaalhok-SF/*' omdat Express 5 (path-to-regexp 6) de asterisk-
  // notatie niet meer accepteert. Het patroon dekt exact /materiaalhok-SF
  // en alles daaronder; /api/* valt er niet in.
  app.get(/^\/materiaalhok-SF(\/.*)?$/, (req, res) => {
    res.sendFile(indexHtmlPath);
  });

  console.log(`[static] dist/ serveert onder /materiaalhok-SF/ (${distDir})`);
} else {
  console.log('[static] dist/ niet gevonden — statische serving overgeslagen (dev-modus). Draai \'npm run build\' in de projectroot voor productie.');
}

const { startReminderScheduler } = require('./mail/scheduler');

app.listen(PORT, () => {
  console.log(`Server luistert op http://localhost:${PORT}`);
  startReminderScheduler();
});
