const express = require('express');
require('./db');
const materialsRouter = require('./routes/materials');
const setsRouter = require('./routes/sets');
const usersRouter = require('./routes/users');
const bonsRouter = require('./routes/bons');

const app = express();
const PORT = 3001;

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

app.listen(PORT, () => {
  console.log(`Server luistert op http://localhost:${PORT}`);
});
