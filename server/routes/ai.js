const express = require('express');
const { readJSON, writeJSON } = require('../lib/driveStore');
const { analyzePortfolio, explainPattern, activeProvider } = require('../services/aiProvider');

const router = express.Router();

// GET /api/ai/provider
router.get('/provider', (req, res) => {
  res.json(activeProvider());
});

// POST /api/ai/portfolio-analysis
router.post('/portfolio-analysis', async (req, res) => {
  try {
    const token  = req.user.accessToken;
    const trades = await readJSON(token, 'dashboard-trades.json', []);
    const daily  = await readJSON(token, 'dashboard-daily.json', {});

    const insight = await analyzePortfolio(trades);

    // Save under a fixed key so it persists
    daily['__portfolio__'] = { ai_insight: insight, updated_at: new Date().toISOString() };
    await writeJSON(token, 'dashboard-daily.json', daily);

    res.json({ insight, updated_at: daily['__portfolio__'].updated_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/portfolio-analysis — return cached insight
router.get('/portfolio-analysis', async (req, res) => {
  try {
    const daily = await readJSON(req.user.accessToken, 'dashboard-daily.json', {});
    const saved = daily['__portfolio__'];
    if (!saved) return res.json({ insight: null, updated_at: null });
    res.json({ insight: saved.ai_insight, updated_at: saved.updated_at });
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
