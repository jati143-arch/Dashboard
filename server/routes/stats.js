const express = require('express');
const db = require('../db');

const router = express.Router();

// Only count CLOSED trades in all stats — open positions have unrealized P&L
const CLOSED = "status = 'closed'";

// GET /api/stats/summary?period=daily|weekly|monthly|all
router.get('/summary', (req, res) => {
  const { period = 'all' } = req.query;
  let dateFilter = '';

  if (period === 'daily')   dateFilter = "AND date = date('now')";
  else if (period === 'weekly')  dateFilter = "AND date >= date('now', '-7 days')";
  else if (period === 'monthly') dateFilter = "AND date >= date('now', '-30 days')";

  const row = db.prepare(`
    SELECT
      COUNT(*) as total_trades,
      SUM(CASE WHEN pnl_dollar > 0 THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN pnl_dollar <= 0 THEN 1 ELSE 0 END) as losses,
      SUM(pnl_dollar) as total_pnl,
      AVG(CASE WHEN pnl_dollar > 0 THEN pnl_dollar END) as avg_winner,
      AVG(CASE WHEN pnl_dollar <= 0 THEN pnl_dollar END) as avg_loser,
      MAX(pnl_dollar) as best_trade,
      MIN(pnl_dollar) as worst_trade
    FROM trades
    WHERE ${CLOSED} ${dateFilter}
  `).get();

  row.win_rate = row.total_trades > 0
    ? Math.round((row.wins / row.total_trades) * 100)
    : 0;

  res.json(row);
});

// GET /api/stats/pnl-series?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/pnl-series', (req, res) => {
  const { from, to } = req.query;
  let sql = `
    SELECT date, SUM(pnl_dollar) as pnl, COUNT(*) as trades
    FROM trades
    WHERE ${CLOSED}
  `;
  const params = [];
  if (from) { sql += ' AND date >= ?'; params.push(from); }
  if (to)   { sql += ' AND date <= ?'; params.push(to); }
  sql += ' GROUP BY date ORDER BY date ASC';

  res.json(db.prepare(sql).all(...params));
});

// GET /api/stats/by-pattern
router.get('/by-pattern', (req, res) => {
  const rows = db.prepare(`
    SELECT
      COALESCE(pattern_tag, 'untagged') as pattern_tag,
      COUNT(*) as total_trades,
      SUM(CASE WHEN pnl_dollar > 0 THEN 1 ELSE 0 END) as wins,
      SUM(pnl_dollar) as total_pnl,
      AVG(pnl_dollar) as avg_pnl,
      AVG(CASE WHEN pnl_dollar > 0 THEN pnl_dollar END) as avg_winner,
      AVG(CASE WHEN pnl_dollar <= 0 THEN pnl_dollar END) as avg_loser
    FROM trades
    WHERE ${CLOSED}
    GROUP BY COALESCE(pattern_tag, 'untagged')
    ORDER BY total_pnl DESC
  `).all();

  res.json(rows.map(r => ({
    ...r,
    win_rate: r.total_trades > 0 ? Math.round((r.wins / r.total_trades) * 100) : 0,
  })));
});

module.exports = router;
