const express = require('express');
const { readJSON, writeJSON } = require('../lib/driveStore');
const { analyzeTrades, explainPattern, activeProvider } = require('../services/aiProvider');

const router = express.Router();

// GET /api/ai/provider
router.get('/provider', (req, res) => {
  res.json(activeProvider());
});

// POST /api/ai/daily-analysis
router.post('/daily-analysis', async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'date is required' });

  try {
    const token  = req.user.accessToken;
    const trades = await readJSON(token, 'dashboard-trades.json', []);
    const daily  = await readJSON(token, 'dashboard-daily.json', {});

    const dayTrades   = trades.filter(t => t.date === date);
    const dailyRecord = daily[date] || {};

    const insight = await analyzeTrades(date, dayTrades, dailyRecord);

    daily[date] = { ...dailyRecord, ai_insight: insight, updated_at: new Date().toISOString() };
    await writeJSON(token, 'dashboard-daily.json', daily);

    res.json({ insight });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/explain-pattern
router.post('/explain-pattern', async (req, res) => {
  const { slug } = req.body;
  if (!slug) return res.status(400).json({ error: 'slug is required' });

  try {
    const patterns = await readJSON(req.user.accessToken, 'dashboard-patterns.json', []);
    const pattern  = patterns.find(p => p.slug === slug);
    if (!pattern) return res.status(404).json({ error: 'Pattern not found' });

    const explanation = await explainPattern(pattern);
    res.json({ explanation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
