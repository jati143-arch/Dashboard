const express = require('express');
const db = require('../db');

const router = express.Router();

function getOrCreate(date) {
  let record = db.prepare('SELECT * FROM daily_records WHERE date = ?').get(date);
  if (!record) {
    db.prepare('INSERT INTO daily_records (date) VALUES (?)').run(date);
    record = db.prepare('SELECT * FROM daily_records WHERE date = ?').get(date);
  }
  if (record.best_setups) {
    try { record.best_setups = JSON.parse(record.best_setups); } catch { record.best_setups = []; }
  } else {
    record.best_setups = [];
  }
  return record;
}

// GET /api/daily — list last 30 days with trade summary
router.get('/', (req, res) => {
  const records = db.prepare(`
    SELECT dr.*,
      COUNT(t.id) as trade_count,
      SUM(t.pnl_dollar) as total_pnl,
      SUM(CASE WHEN t.pnl_dollar > 0 THEN 1 ELSE 0 END) as wins
    FROM daily_records dr
    LEFT JOIN trades t ON t.date = dr.date
    GROUP BY dr.date
    ORDER BY dr.date DESC
    LIMIT 30
  `).all();
  res.json(records);
});

// GET /api/daily/:date
router.get('/:date', (req, res) => {
  res.json(getOrCreate(req.params.date));
});

// PUT /api/daily/:date
router.put('/:date', (req, res) => {
  const { lesson_of_day, best_setups } = req.body;
  const date = req.params.date;

  getOrCreate(date); // ensure record exists

  db.prepare(`
    UPDATE daily_records
    SET lesson_of_day = ?, best_setups = ?, updated_at = datetime('now')
    WHERE date = ?
  `).run(
    lesson_of_day !== undefined ? lesson_of_day : null,
    best_setups !== undefined ? JSON.stringify(best_setups) : null,
    date
  );

  res.json(getOrCreate(date));
});

module.exports = router;
