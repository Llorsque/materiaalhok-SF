// Dotenv als eerste laden — sommige modules (mailer) lezen bij require al uit
// process.env. Bestand mag ontbreken; dotenv geeft dan een nette waarschuwing
// terug via debug maar breekt de start niet.
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

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

const app = express();
const PORT = 3001;

// Sta alleen de Vite dev-server expliciet toe — niet '*', dat is te open.
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/', (req, res) => {
  res.type('text/plain').send('Hallo, ik ben de backend van materiaalhok-SF');
});

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

const { startReminderScheduler } = require('./mail/scheduler');

app.listen(PORT, () => {
  console.log(`Server luistert op http://localhost:${PORT}`);
  startReminderScheduler();
});
