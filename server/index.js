const express = require('express');
const cors = require('cors');
require('./db');
const materialsRouter = require('./routes/materials');
const setsRouter = require('./routes/sets');
const usersRouter = require('./routes/users');
const bonsRouter = require('./routes/bons');
const authRouter = require('./routes/auth');

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

app.listen(PORT, () => {
  console.log(`Server luistert op http://localhost:${PORT}`);
});
