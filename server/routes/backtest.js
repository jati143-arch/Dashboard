const express = require('express');
const router = express.Router();
const yahooFinance = require('yahoo-finance2').default;

yahooFinance.setGlobalConfig({ validation: { logErrors: false } });

// --- Indicator helpers ---

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  const ema = Array(closes.length).fill(null);
  let seed = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema[period - 1] = seed;
  for (let i = period; i < closes.length; i++) {
    seed = closes[i] * k + seed * (1 - k);
    ema[i] = seed;
  }
  return ema;
}

function calcSMA(closes, period) {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    return closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}

function calcRSI(closes, period = 14) {
  const rsi = Array(closes.length).fill(null);
  if (closes.length < period + 1) return rsi;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

function avgOfSlice(arr, i, period) {
  if (i < period - 1) return null;
  return arr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
}

// --- Strategy signal generators ---
// Each returns array of { entryIdx, exitIdx } pairs

function strategyEMACross(candles) {
  const closes = candles.map(c => c.close);
  const ema9  = calcEMA(closes, 9);
  const ema20 = calcEMA(closes, 20);
  const trades = [];
  let inTrade = null;

  for (let i = 20; i < candles.length - 1; i++) {
    if (!ema9[i] || !ema20[i] || !ema9[i - 1] || !ema20[i - 1]) continue;
    const crossUp   = ema9[i - 1] <= ema20[i - 1] && ema9[i] > ema20[i];
    const crossDown = ema9[i - 1] >= ema20[i - 1] && ema9[i] < ema20[i];

    if (!inTrade && crossUp)   { inTrade = i + 1; }
    if (inTrade  && crossDown) { trades.push({ entryIdx: inTrade, exitIdx: i + 1 }); inTrade = null; }
  }
  if (inTrade) trades.push({ entryIdx: inTrade, exitIdx: candles.length - 1 });
  return trades;
}

function strategyRSIPullback(candles) {
  const closes = candles.map(c => c.close);
  const sma50 = calcSMA(closes, 50);
  const rsi   = calcRSI(closes, 14);
  const trades = [];
  let inTrade = null;
  let prevRsi = null;

  for (let i = 50; i < candles.length - 1; i++) {
    if (!sma50[i] || !rsi[i]) continue;
    const aboveSma = closes[i] > sma50[i];
    // Entry: above 50 SMA, RSI crosses up through 45 (from below)
    const rsiBounce = prevRsi !== null && prevRsi < 45 && rsi[i] >= 45;

    if (!inTrade && aboveSma && rsiBounce) { inTrade = i + 1; }
    // Exit: RSI overbought OR price closes below 20 SMA
    const sma20 = avgOfSlice(closes, i, 20);
    const exit  = inTrade && (rsi[i] > 70 || (sma20 !== null && closes[i] < sma20));
    if (exit) { trades.push({ entryIdx: inTrade, exitIdx: i + 1 }); inTrade = null; }
    prevRsi = rsi[i];
  }
  if (inTrade) trades.push({ entryIdx: inTrade, exitIdx: candles.length - 1 });
  return trades;
}

function strategyBreakout(candles) {
  const closes  = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  const highs   = candles.map(c => c.high);
  const trades = [];
  let inTrade = null;
  let entryPrice = 0;

  for (let i = 20; i < candles.length - 1; i++) {
    const period = 20;
    const highestHigh = Math.max(...highs.slice(i - period, i));
    const avgVol      = avgOfSlice(volumes, i - 1, period);
    const sma20       = avgOfSlice(closes, i, period);

    // Entry: close breaks above 20-bar high AND volume > 1.5× avg
    if (!inTrade && closes[i] > highestHigh && avgVol && volumes[i] > avgVol * 1.5) {
      inTrade = i + 1;
      entryPrice = candles[i + 1]?.open ?? closes[i];
    }

    // Exit: close below 20 SMA OR 5% trailing stop
    if (inTrade) {
      const trailStop = entryPrice * 0.95;
      const belowSma  = sma20 !== null && closes[i] < sma20;
      if (closes[i] < trailStop || belowSma) {
        trades.push({ entryIdx: inTrade, exitIdx: i + 1 });
        inTrade = null;
      }
    }
  }
  if (inTrade) trades.push({ entryIdx: inTrade, exitIdx: candles.length - 1 });
  return trades;
}

// --- Results builder ---

function buildResults(candles, signalPairs) {
  const trades = signalPairs.map(({ entryIdx, exitIdx }) => {
    const entry = candles[Math.min(entryIdx, candles.length - 1)];
    const exit  = candles[Math.min(exitIdx,  candles.length - 1)];
    const pnlPct = ((exit.close - entry.close) / entry.close) * 100;
    const pnl = exit.close - entry.close;
    return {
      entryDate:  entry.time,
      exitDate:   exit.time,
      entryPrice: parseFloat(entry.close.toFixed(2)),
      exitPrice:  parseFloat(exit.close.toFixed(2)),
      pnl:        parseFloat(pnl.toFixed(2)),
      pnlPct:     parseFloat(pnlPct.toFixed(2)),
      win:        pnl > 0,
    };
  });

  const wins   = trades.filter(t => t.win);
  const losses = trades.filter(t => !t.win);
  const avgWin  = wins.length   ? wins.reduce((s, t)   => s + t.pnlPct, 0) / wins.length   : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + t.pnlPct, 0) / losses.length : 0;

  // Profit factor: gross profit / gross loss
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss   = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? parseFloat((grossProfit / grossLoss).toFixed(2)) : null;

  // Max drawdown (equity curve based on %returns)
  let peak = 100, equity = 100, maxDD = 0;
  trades.forEach(t => {
    equity *= (1 + t.pnlPct / 100);
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak * 100;
    if (dd > maxDD) maxDD = dd;
  });

  // Equity curve points
  let eq = 100;
  const equityCurve = trades.map(t => {
    eq *= (1 + t.pnlPct / 100);
    return { date: t.exitDate, value: parseFloat(eq.toFixed(2)) };
  });

  return {
    trades,
    equityCurve,
    stats: {
      totalTrades:  trades.length,
      wins:         wins.length,
      losses:       losses.length,
      winRate:      trades.length ? Math.round((wins.length / trades.length) * 100) : 0,
      avgWinPct:    parseFloat(avgWin.toFixed(2)),
      avgLossPct:   parseFloat(avgLoss.toFixed(2)),
      profitFactor,
      maxDrawdownPct: parseFloat(maxDD.toFixed(2)),
      finalEquity:  parseFloat(eq.toFixed(2)),
    },
  };
}

// POST /api/backtest
// Body: { symbol, strategy: 'ema_cross'|'rsi_pullback'|'breakout_vol', from, to }
router.post('/', async (req, res) => {
  const { symbol, strategy, from, to } = req.body;
  if (!symbol || !strategy) return res.status(400).json({ error: 'symbol and strategy required' });

  try {
    const rows = await yahooFinance.historical(symbol, {
      period1: from || (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 2); return d.toISOString().slice(0, 10); })(),
      period2: to || new Date().toISOString().slice(0, 10),
      interval: '1d',
    });

    const candles = rows
      .filter(r => r.open && r.high && r.low && r.close)
      .map(r => ({
        time: r.date.toISOString().slice(0, 10),
        open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume ?? 0,
      }));

    if (candles.length < 55) return res.status(400).json({ error: 'Not enough data (need at least 55 trading days)' });

    let signals;
    if (strategy === 'ema_cross')      signals = strategyEMACross(candles);
    else if (strategy === 'rsi_pullback') signals = strategyRSIPullback(candles);
    else if (strategy === 'breakout_vol') signals = strategyBreakout(candles);
    else return res.status(400).json({ error: 'Unknown strategy' });

    res.json(buildResults(candles, signals));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
