const express = require('express');
const { readJSON } = require('../lib/driveStore');

const router = express.Router();

function calcRisk(trades) {
  const closed = trades.filter(t => t.status === 'closed' && t.pnl_dollar != null);
  if (closed.length === 0) return null;

  // Group by exit date → daily P&L
  const byDay = {};
  for (const t of closed) {
    const day = t.exit_date || t.date;
    byDay[day] = (byDay[day] || 0) + t.pnl_dollar;
  }
  const dailyPnl = Object.values(byDay);
  const n = dailyPnl.length;

  const mean = dailyPnl.reduce((a, b) => a + b, 0) / n;
  const variance = dailyPnl.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const sharpe = std === 0 ? 0 : (mean / std) * Math.sqrt(252);

  const negDays = dailyPnl.filter(p => p < 0);
  const downstd = negDays.length > 0
    ? Math.sqrt(negDays.reduce((a, b) => a + b ** 2, 0) / negDays.length)
    : 0;
  const sortino = downstd === 0 ? 0 : (mean / downstd) * Math.sqrt(252);

  // Max drawdown
  let cumPnl = 0, peak = 0, maxDd = 0;
  let ddStart = null, ddEnd = null, peakDate = null;
  let maxDdDuration = 0;
  const sortedDays = Object.keys(byDay).sort();
  for (const day of sortedDays) {
    cumPnl += byDay[day];
    if (cumPnl > peak) { peak = cumPnl; peakDate = day; }
    const dd = peak - cumPnl;
    if (dd > maxDd) {
      maxDd = dd;
      ddStart = peakDate;
      ddEnd = day;
    }
  }
  if (ddStart && ddEnd) {
    const daysBetween = sortedDays.filter(d => d >= ddStart && d <= ddEnd).length;
    maxDdDuration = daysBetween;
  }

  // VaR 95%
  const sorted = [...dailyPnl].sort((a, b) => a - b);
  const varIdx = Math.floor(n * 0.05);
  const var95 = sorted[varIdx] ?? sorted[0];

  // Profit factor
  const wins   = closed.filter(t => t.pnl_dollar > 0);
  const losses = closed.filter(t => t.pnl_dollar <= 0);
  const grossWin  = wins.reduce((a, t) => a + t.pnl_dollar, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnl_dollar, 0));
  const profitFactor = grossLoss === 0 ? null : grossWin / grossLoss;

  // Expectancy
  const winRate  = wins.length / closed.length;
  const lossRate = losses.length / closed.length;
  const avgWin   = wins.length ? grossWin / wins.length : 0;
  const avgLoss  = losses.length ? grossLoss / losses.length : 0;
  const expectancy = winRate * avgWin - lossRate * avgLoss;

  // Holding time (hours)
  const holdingTimes = closed
    .filter(t => t.entry_date || t.date)
    .map(t => {
      const entry = new Date(t.entry_date || t.date);
      const exit  = new Date(t.exit_date || t.date);
      return (exit - entry) / 3600000;
    })
    .filter(h => h >= 0);
  const avgHolding = holdingTimes.length
    ? holdingTimes.reduce((a, b) => a + b, 0) / holdingTimes.length
    : null;

  // Streaks
  let bestWinStreak = 0, worstLoseStreak = 0;
  let curWin = 0, curLoss = 0;
  for (const t of closed.sort((a, b) => (a.exit_date || a.date) < (b.exit_date || b.date) ? -1 : 1)) {
    if (t.pnl_dollar > 0) { curWin++; curLoss = 0; bestWinStreak = Math.max(bestWinStreak, curWin); }
    else { curLoss++; curWin = 0; worstLoseStreak = Math.max(worstLoseStreak, curLoss); }
  }

  // Calmar
  const totalPnl = closed.reduce((a, t) => a + t.pnl_dollar, 0);
  const tradingDays = n;
  const annualizedReturn = tradingDays > 0 ? (totalPnl / tradingDays) * 252 : 0;
  const calmar = maxDd === 0 ? null : annualizedReturn / maxDd;

  return {
    tradeCount: closed.length,
    winRate: Math.round(winRate * 1000) / 10,
    sharpe: Math.round(sharpe * 100) / 100,
    sortino: Math.round(sortino * 100) / 100,
    maxDrawdown: Math.round(maxDd * 100) / 100,
    maxDrawdownDuration: maxDdDuration,
    var95: Math.round(var95 * 100) / 100,
    profitFactor: profitFactor ? Math.round(profitFactor * 100) / 100 : null,
    expectancy: Math.round(expectancy * 100) / 100,
    avgHoldingHours: avgHolding ? Math.round(avgHolding * 10) / 10 : null,
    bestWinStreak,
    worstLoseStreak,
    calmar: calmar ? Math.round(calmar * 100) / 100 : null,
    totalPnl: Math.round(totalPnl * 100) / 100,
    dailyPnl: Object.entries(byDay).sort().map(([date, pnl]) => ({ date, pnl: Math.round(pnl * 100) / 100 })),
  };
}

// GET /api/risk/metrics?market=&from=&to=
router.get('/metrics', async (req, res) => {
  try {
    let trades = await readJSON(req.user.accessToken, 'dashboard-trades.json', []);
    const { market, from, to } = req.query;
    if (market === 'indian') trades = trades.filter(t => t.symbol?.endsWith('.NS') || t.symbol?.endsWith('.BO'));
    else if (market === 'us') trades = trades.filter(t => !t.symbol?.endsWith('.NS') && !t.symbol?.endsWith('.BO'));
    if (from) trades = trades.filter(t => (t.exit_date || t.date) >= from);
    if (to)   trades = trades.filter(t => (t.exit_date || t.date) <= to);
    const metrics = calcRisk(trades);
    if (!metrics) return res.json({ empty: true });
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
