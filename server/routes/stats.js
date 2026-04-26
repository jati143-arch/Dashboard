const express = require('express');
const db = require('../db');

const router = express.Router();

// Mutual funds are tracked separately — exclude from all trading stats by default
const CLOSED = "status = 'closed' AND instrument_type != 'mutual_fund'";

// GET /api/stats/summary?period=daily|weekly|monthly|all&market=us|indian|crypto|etf|mf
router.get('/summary', (req, res) => {
  const { period = 'all', market = '' } = req.query;
  let dateFilter = '';
  let marketFilter = '';

  if (period === 'daily')        dateFilter = "AND date = date('now')";
  else if (period === 'weekly')  dateFilter = "AND date >= date('now', '-7 days')";
  else if (period === 'monthly') dateFilter = "AND date >= date('now', '-30 days')";

  if (market === 'us')           marketFilter = "AND instrument_type='stock' AND symbol NOT LIKE '%.NS' AND symbol NOT LIKE '%.BO'";
  else if (market === 'indian')  marketFilter = "AND (symbol LIKE '%.NS' OR symbol LIKE '%.BO')";
  else if (market === 'crypto')  marketFilter = "AND instrument_type='crypto'";
  else if (market === 'etf')     marketFilter = "AND instrument_type='etf'";
  else if (market === 'mf')      marketFilter = "AND instrument_type='mutual_fund'";

  // For mf market, allow mutual_fund in the base filter
  const baseFilter = market === 'mf' ? "status = 'closed'" : CLOSED;

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
    WHERE ${baseFilter} ${dateFilter} ${marketFilter}
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
