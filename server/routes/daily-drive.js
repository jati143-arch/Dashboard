const express = require('express');
const { readJSON, writeJSON } = require('../lib/driveStore');

const router = express.Router();
const FILE        = 'dashboard-daily.json';
const TRADES_FILE = 'dashboard-trades.json';

// GET /api/daily — last 30 days with trade summary
router.get('/', async (req, res) => {
  try {
    const [daily, trades] = await Promise.all([
      readJSON(req.user.accessToken, FILE, {}),
      readJSON(req.user.accessToken, TRADES_FILE, []),
    ]);
    const dates = new Set([...Object.keys(daily), ...trades.map(t => t.date)]);
    const sorted = [...dates].sort().reverse().slice(0, 30);
    res.json(sorted.map(date => {
      const r   = daily[date] || {};
      const day = trades.filter(t => t.date === date);
      return {
        date,
        lesson_of_day: r.lesson_of_day || null,
        best_setups:   r.best_setups   || [],
        updated_at:    r.updated_at    || null,
        trade_count:   day.length,
        total_pnl:     day.reduce((s, t) => s + (t.pnl_dollar || 0), 0),
        wins:          day.filter(t => t.pnl_dollar > 0).length,
      };
    }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/daily/:date
router.get('/:date', async (req, res) => {
  try {
    const daily = await readJSON(req.user.accessToken, FILE, {});
    const r     = daily[req.params.date] || {};
    res.json({ date: req.params.date, lesson_of_day: r.lesson_of_day || null,
      best_setups: r.best_setups || [], updated_at: r.updated_at || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/daily/:date
router.put('/:date', async (req, res) => {
  try {
    const { lesson_of_day, best_setups } = req.body;
    const daily = await readJSON(req.user.accessToken, FILE, {});
    daily[req.params.date] = {
      ...daily[req.params.date],
      lesson_of_day: lesson_of_day !== undefined ? lesson_of_day : null,
      best_setups:   best_setups   !== undefined ? best_setups   : [],
      updated_at:    new Date().toISOString(),
    };
    await writeJSON(req.user.accessToken, FILE, daily);
    res.json({ date: req.params.date, ...daily[req.params.date] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
