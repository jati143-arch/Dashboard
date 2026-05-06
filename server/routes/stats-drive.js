const express = require('express');
const { readJSON } = require('../lib/driveStore');
const { getSector } = require('../lib/sectorMap');

const router = express.Router();
const FILE = 'dashboard-trades.json';

function applyMarket(trades, market) {
  if (market === 'mf')     return trades.filter(t => t.instrument_type === 'mutual_fund');
  const base = trades.filter(t => t.instrument_type !== 'mutual_fund');
  if (!market)             return base;
  if (market === 'indian') return base.filter(t => t.symbol?.endsWith('.NS') || t.symbol?.endsWith('.BO'));
  if (market === 'us')     return base.filter(t => t.instrument_type === 'stock' && !t.symbol?.endsWith('.NS') && !t.symbol?.endsWith('.BO'));
  if (market === 'crypto') return base.filter(t => t.instrument_type === 'crypto');
  if (market === 'etf')    return base.filter(t => t.instrument_type === 'etf');
  return base;
}

// GET /api/stats/summary
router.get('/summary', async (req, res) => {
  try {
    const { period = 'all', market = '' } = req.query;
    let trades = await readJSON(req.user.accessToken, FILE, []);

    const today = new Date().toISOString().slice(0, 10);
    if (period === 'daily')   trades = trades.filter(t => t.date === today);
    else if (period === 'weekly')  { const f = new Date(Date.now() - 7*864e5).toISOString().slice(0,10);  trades = trades.filter(t => t.date >= f); }
    else if (period === 'monthly') { const f = new Date(Date.now() - 30*864e5).toISOString().slice(0,10); trades = trades.filter(t => t.date >= f); }

    const filtered = applyMarket(trades, market).filter(t => t.status === 'closed');
    const wins     = filtered.filter(t => t.pnl_dollar > 0);
    const losses   = filtered.filter(t => t.pnl_dollar <= 0);
    const pnls     = filtered.map(t => t.pnl_dollar).filter(p => p != null);

    res.json({
      total_trades: filtered.length,
      wins:         wins.length,
      losses:       losses.length,
      total_pnl:    filtered.reduce((s, t) => s + (t.pnl_dollar || 0), 0),
      avg_winner:   wins.length   ? wins.reduce((s, t)   => s + t.pnl_dollar, 0) / wins.length   : null,
      avg_loser:    losses.length ? losses.reduce((s, t) => s + t.pnl_dollar, 0) / losses.length : null,
      best_trade:   pnls.length ? Math.max(...pnls) : null,
      worst_trade:  pnls.length ? Math.min(...pnls) : null,
      win_rate:     filtered.length ? Math.round((wins.length / filtered.length) * 100) : 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats/winloss
router.get('/winloss', async (req, res) => {
  try {
    const trades   = await readJSON(req.user.accessToken, FILE, []);
    const filtered = trades.filter(t =>
      t.status === 'closed' && t.instrument_type !== 'mutual_fund' &&
      !t.parent_trade_id && t.pnl_dollar != null
    );
    const wins = filtered.filter(t => t.pnl_dollar > 0).length;
    res.json({
      total:    filtered.length,
      wins,
      losses:   filtered.filter(t => t.pnl_dollar <= 0).length,
      win_rate: filtered.length ? Math.round((wins / filtered.length) * 100) : 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats/pnl-series
router.get('/pnl-series', async (req, res) => {
  try {
    const { from, to } = req.query;
    let trades = await readJSON(req.user.accessToken, FILE, []);
    trades = trades.filter(t => t.status === 'closed' && t.instrument_type !== 'mutual_fund');
    if (from) trades = trades.filter(t => (t.exit_date || t.date) >= from);
    if (to)   trades = trades.filter(t => (t.exit_date || t.date) <= to);

    const byDay = {};
    for (const t of trades) {
      const day = t.exit_date || t.date;
      if (!byDay[day]) byDay[day] = { pnl: 0, trades: 0 };
      byDay[day].pnl += t.pnl_dollar || 0;
      byDay[day].trades++;
    }
    res.json(Object.entries(byDay).sort(([a],[b]) => a<b?-1:1).map(([day,v]) => ({ date: day, pnl: v.pnl, trades: v.trades })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats/by-pattern
router.get('/by-pattern', async (req, res) => {
  try {
    const trades  = await readJSON(req.user.accessToken, FILE, []);
    const closed  = trades.filter(t => t.status === 'closed' && t.instrument_type !== 'mutual_fund');
    const groups  = {};
    for (const t of closed) {
      const tag = t.pattern_tag || 'untagged';
      if (!groups[tag]) groups[tag] = { pattern_tag: tag, total_trades: 0, wins: 0, total_pnl: 0, pnls: [] };
      groups[tag].total_trades++;
      if (t.pnl_dollar > 0) groups[tag].wins++;
      groups[tag].total_pnl += t.pnl_dollar || 0;
      if (t.pnl_dollar != null) groups[tag].pnls.push(t.pnl_dollar);
    }
    res.json(Object.values(groups).map(p => {
      const W = p.pnls.filter(x => x > 0);
      const L = p.pnls.filter(x => x <= 0);
      return {
        pattern_tag:  p.pattern_tag,
        total_trades: p.total_trades,
        wins:         p.wins,
        total_pnl:    p.total_pnl,
        avg_pnl:      p.pnls.length ? p.total_pnl / p.pnls.length : 0,
        avg_winner:   W.length ? W.reduce((s,x)=>s+x,0)/W.length : null,
        avg_loser:    L.length ? L.reduce((s,x)=>s+x,0)/L.length : null,
        win_rate:     p.total_trades ? Math.round((p.wins / p.total_trades) * 100) : 0,
      };
    }).sort((a, b) => b.total_pnl - a.total_pnl));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats/portfolio-series
router.get('/portfolio-series', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { from = '2000-01-01', to = today } = req.query;
    const trades = await readJSON(req.user.accessToken, FILE, []);
    const rel    = trades.filter(t => t.instrument_type !== 'mutual_fund');

    let baseDeployed = 0, baseRealized = 0;
    for (const t of rel) {
      if (t.date >= from) continue;
      if (!t.parent_trade_id) baseDeployed += (t.entry_price || 0) * (t.size || 0);
      if (t.status === 'closed') baseRealized += t.pnl_dollar || 0;
    }

    const byDate = {};
    for (const t of rel) {
      if (t.date < from || t.date > to) continue;
      if (!byDate[t.date]) byDate[t.date] = { deployed: 0, realized: 0 };
      if (!t.parent_trade_id) byDate[t.date].deployed += (t.entry_price || 0) * (t.size || 0);
      if (t.status === 'closed') byDate[t.date].realized += t.pnl_dollar || 0;
    }

    let cumD = baseDeployed, cumR = baseRealized;
    res.json(Object.entries(byDate).sort(([a],[b]) => a<b?-1:1).map(([date,v]) => {
      cumD += v.deployed; cumR += v.realized;
      return { date, invested: Math.round(cumD), realizedPnl: Math.round(cumR), portfolio: Math.round(cumD + cumR) };
    }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats/sector-breakdown
router.get('/sector-breakdown', async (req, res) => {
  try {
    const trades = await readJSON(req.user.accessToken, FILE, []);
    const byS = {};

    for (const t of trades) {
      const sector = getSector(t.symbol);
      if (!byS[sector]) byS[sector] = { sector, trades: 0, wins: 0, pnl: 0, open: 0, symbols: new Set() };
      byS[sector].symbols.add(t.symbol);

      if (t.status === 'open') {
        byS[sector].open++;
      } else if (t.status === 'closed' && t.pnl_dollar != null) {
        byS[sector].trades++;
        byS[sector].pnl += t.pnl_dollar;
        if (t.pnl_dollar > 0) byS[sector].wins++;
      }
    }

    const result = Object.values(byS).map(s => ({
      sector:   s.sector,
      trades:   s.trades,
      open:     s.open,
      pnl:      s.pnl,
      win_rate: s.trades ? Math.round((s.wins / s.trades) * 100) : null,
      symbols:  [...s.symbols],
    })).sort((a, b) => (b.trades + b.open) - (a.trades + a.open));

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
