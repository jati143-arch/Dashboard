const express = require('express');
const db = require('../db');
const { analyzeTrades, explainPattern } = require('../services/claude');

const router = express.Router();

// POST /api/ai/daily-analysis
router.post('/daily-analysis', async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'date is required' });

  const trades = db.prepare('SELECT * FROM trades WHERE date = ? ORDER BY entry_time ASC').all(date);
  const daily = db.prepare('SELECT * FROM daily_records WHERE date = ?').get(date);

  try {
    const insight = await analyzeTrades(date, trades, daily);

    db.prepare(`
      INSERT INTO daily_records (date, ai_insight, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(date) DO UPDATE SET ai_insight = excluded.ai_insight, updated_at = excluded.updated_at
    `).run(date, insight);

    res.json({ insight });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/explain-pattern
router.post('/explain-pattern', async (req, res) => {
  const { slug } = req.body;
  if (!slug) return res.status(400).json({ error: 'slug is required' });

  const pattern = db.prepare('SELECT * FROM patterns WHERE slug = ?').get(slug);
  if (!pattern) return res.status(404).json({ error: 'Pattern not found' });

  try {
    const explanation = await explainPattern(pattern);
    res.json({ explanation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
