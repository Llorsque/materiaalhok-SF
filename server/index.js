const express = require('express');

const app = express();
const PORT = 3001;

app.get('/', (req, res) => {
  res.type('text/plain').send('Hallo, ik ben de backend van materiaalhok-SF');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server luistert op http://localhost:${PORT}`);
});
