require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const tradesRouter = require('./routes/trades');
const dailyRouter = require('./routes/daily');
const statsRouter = require('./routes/stats');
const patternsRouter = require('./routes/patterns');
const aiRouter = require('./routes/ai');
const searchRouter = require('./routes/search');
const pricesRouter = require('./routes/prices');
const newsRouter = require('./routes/news');
const mfRouter = require('./routes/mf');
const chartRouter = require('./routes/chart');
const nseRouter = require('./routes/nse');
const backtestRouter = require('./routes/backtest');
const signalsRouter  = require('./routes/signals');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/trades', tradesRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/stats', statsRouter);
app.use('/api/patterns', patternsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/search', searchRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/news', newsRouter);
app.use('/api/mf', mfRouter);
app.use('/api/chart', chartRouter);
app.use('/api/nse', nseRouter);
app.use('/api/backtest', backtestRouter);
app.use('/api/signals',  signalsRouter);

// Serve built React app if dist folder exists
const distPath = path.join(__dirname, '../client/dist');
const fs = require('fs');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Trading Dashboard running on http://0.0.0.0:${PORT}`);
});
