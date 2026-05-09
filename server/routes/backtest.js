const express = require('express');
const router = express.Router();
const { default: YahooFinance } = require('yahoo-finance2');
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
const { toYahoo } = require('../utils/symbolConvert');

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

function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);
  const macdLine = closes.map((_, i) =>
    emaFast[i] !== null && emaSlow[i] !== null ? emaFast[i] - emaSlow[i] : null,
  );
  // Calculate signal line only over non-null MACD values
  const firstValid = macdLine.findIndex(v => v !== null);
  const signalArr = Array(closes.length).fill(null);
  if (firstValid >= 0) {
    const macdSlice = macdLine.slice(firstValid).map(v => v ?? 0);
    const sigSlice = calcEMA(macdSlice, signal);
    sigSlice.forEach((v, j) => { signalArr[firstValid + j] = v; });
  }
  return { macd: macdLine, signal: signalArr };
}

function calcBB(closes, period = 20, mult = 2) {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    return { upper: mean + mult * std, middle: mean, lower: mean - mult * std };
  });
}

function calcVWAP(candles) {
  let cumPV = 0, cumVol = 0;
  return candles.map(c => {
    const tp = (c.high + c.low + c.close) / 3;
    cumPV += tp * c.volume;
    cumVol += c.volume;
    return cumVol > 0 ? cumPV / cumVol : null;
  });
}

function avgOfSlice(arr, i, period) {
  if (i < period - 1) return null;
  return arr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
}

// --- Strategy signal generators ---

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
    const rsiBounce = prevRsi !== null && prevRsi < 45 && rsi[i] >= 45;

    if (!inTrade && aboveSma && rsiBounce) { inTrade = i + 1; }
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

    if (!inTrade && closes[i] > highestHigh && avgVol && volumes[i] > avgVol * 1.5) {
      inTrade = i + 1;
      entryPrice = candles[i + 1]?.open ?? closes[i];
    }

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

function strategyMACDCross(candles) {
  const closes = candles.map(c => c.close);
  const { macd, signal } = calcMACD(closes);
  const trades = [];
  let inTrade = null;

  for (let i = 27; i < candles.length - 1; i++) {
    if (macd[i] === null || signal[i] === null || macd[i - 1] === null || signal[i - 1] === null) continue;
    const crossUp   = macd[i - 1] <= signal[i - 1] && macd[i] > signal[i];
    const crossDown = macd[i - 1] >= signal[i - 1] && macd[i] < signal[i];

    if (!inTrade && crossUp)   { inTrade = i + 1; }
    if (inTrade  && crossDown) { trades.push({ entryIdx: inTrade, exitIdx: i + 1 }); inTrade = null; }
  }
  if (inTrade) trades.push({ entryIdx: inTrade, exitIdx: candles.length - 1 });
  return trades;
}

function strategyBBSqueeze(candles) {
  const closes = candles.map(c => c.close);
  const bb = calcBB(closes, 20, 2);
  const trades = [];
  let inTrade = null;

  for (let i = 21; i < candles.length - 1; i++) {
    if (!bb[i] || !bb[i - 1]) continue;
    // Entry: price closes above upper band (squeeze breakout)
    const breakout = closes[i - 1] <= bb[i - 1].upper && closes[i] > bb[i].upper;
    // Exit: price closes below middle band
    const exitSignal = inTrade && closes[i] < bb[i].middle;

    if (!inTrade && breakout)  { inTrade = i + 1; }
    if (exitSignal)            { trades.push({ entryIdx: inTrade, exitIdx: i + 1 }); inTrade = null; }
  }
  if (inTrade) trades.push({ entryIdx: inTrade, exitIdx: candles.length - 1 });
  return trades;
}

function strategySMA200Trend(candles) {
  const closes = candles.map(c => c.close);
  const sma200 = calcSMA(closes, 200);
  const ema9   = calcEMA(closes, 9);
  const ema20  = calcEMA(closes, 20);
  const trades = [];
  let inTrade = null;

  for (let i = 200; i < candles.length - 1; i++) {
    if (!sma200[i] || !ema9[i] || !ema20[i] || !ema9[i - 1] || !ema20[i - 1]) continue;
    const aboveSMA200 = closes[i] > sma200[i];
    const emaCrossUp  = ema9[i - 1] <= ema20[i - 1] && ema9[i] > ema20[i];
    const emaCrossDown = ema9[i - 1] >= ema20[i - 1] && ema9[i] < ema20[i];
    const belowSMA200  = closes[i] < sma200[i];

    if (!inTrade && aboveSMA200 && emaCrossUp) { inTrade = i + 1; }
    if (inTrade && (emaCrossDown || belowSMA200)) {
      trades.push({ entryIdx: inTrade, exitIdx: i + 1 });
      inTrade = null;
    }
  }
  if (inTrade) trades.push({ entryIdx: inTrade, exitIdx: candles.length - 1 });
  return trades;
}

function strategyVWAPReclaim(candles) {
  const vwap = calcVWAP(candles);
  const closes = candles.map(c => c.close);
  const trades = [];
  let inTrade = null;

  for (let i = 1; i < candles.length - 1; i++) {
    if (vwap[i] === null || vwap[i - 1] === null) continue;
    const crossUp   = closes[i - 1] <= vwap[i - 1] && closes[i] > vwap[i];
    const crossDown = closes[i - 1] >= vwap[i - 1] && closes[i] < vwap[i];

    if (!inTrade && crossUp)   { inTrade = i + 1; }
    if (inTrade  && crossDown) { trades.push({ entryIdx: inTrade, exitIdx: i + 1 }); inTrade = null; }
  }
  if (inTrade) trades.push({ entryIdx: inTrade, exitIdx: candles.length - 1 });
  return trades;
}

function calcATR(candles, period = 14) {
  const tr = candles.map((c, i) => {
    const prev = i > 0 ? candles[i - 1].close : c.close;
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
  });
  const atr = Array(tr.length).fill(null);
  atr[period - 1] = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < tr.length; i++) atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  return atr;
}

function strategyCompositeSignal(candles) {
  const closes  = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  const ema9    = calcEMA(closes, 9);
  const ema20   = calcEMA(closes, 20);
  const sma50   = calcSMA(closes, 50);
  const rsi     = calcRSI(closes, 14);
  const { macd, signal: macdSig } = calcMACD(closes);
  const atr     = calcATR(candles, 14);
  const trades  = [];
  let inTrade = null, slPrice = null;

  for (let i = 51; i < candles.length - 1; i++) {
    if (!ema9[i] || !ema20[i] || !sma50[i] || !rsi[i] || macd[i] == null || macdSig[i] == null || !atr[i]) continue;
    let score = 0;
    score += ema9[i] > ema20[i] ? 1 : -1;
    score += ema20[i] > sma50[i] ? 1 : -1;
    score += closes[i] > ema20[i] ? 1 : -1;
    const r = rsi[i];
    if      (r > 75)             score -= 2;
    else if (r > 65)             score -= 1;
    else if (r >= 50 && r <= 65) score += 2;
    else if (r >= 40)            score += 1;
    else if (r < 30)             score -= 1;
    const prevMacd = macd[i - 1], prevSig = macdSig[i - 1];
    const freshCross = prevMacd != null && prevSig != null &&
      Math.sign(macd[i] - macdSig[i]) !== Math.sign(prevMacd - prevSig);
    score += macd[i] > macdSig[i] ? (freshCross ? 2 : 1) : (freshCross ? -2 : -1);
    const avgVol = volumes.slice(Math.max(0, i - 21), i).reduce((a, b) => a + b, 0) / 20;
    if (avgVol > 0 && volumes[i] / avgVol > 1.5)
      score += candles[i].close > candles[i].open ? 1 : -1;

    if (!inTrade && score >= 3) { inTrade = i + 1; slPrice = closes[i] - atr[i] * 1.5; }
    if (inTrade) {
      if (score <= -2 || closes[i] <= slPrice) {
        trades.push({ entryIdx: inTrade, exitIdx: i + 1 });
        inTrade = null; slPrice = null;
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

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss   = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? parseFloat((grossProfit / grossLoss).toFixed(2)) : null;

  let peak = 100, equity = 100, maxDD = 0;
  trades.forEach(t => {
    equity *= (1 + t.pnlPct / 100);
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak * 100;
    if (dd > maxDD) maxDD = dd;
  });

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

// Intraday timeframe limits (days back from today when no from/to given)
const TIMEFRAME_DAYS = {
  '5m': 59, '15m': 59, '30m': 59,
  '60m': 365, '1h': 365,
  '1d': 730, '1wk': 1825,
};

// POST /api/backtest
// Body: { symbol, strategy, from, to, timeframe }
router.post('/', async (req, res) => {
  const { symbol, strategy, from, to, timeframe = '1d' } = req.body;
  if (!symbol || !strategy) return res.status(400).json({ error: 'symbol and strategy required' });

  const interval = timeframe === '1h' ? '60m' : timeframe;
  const isIntraday = ['5m', '15m', '30m', '60m', '1h'].includes(timeframe);

  // For intraday, respect Yahoo Finance data limits; for daily+ use from/to
  const defaultDays = TIMEFRAME_DAYS[timeframe] ?? 730;
  const fromDate = (!isIntraday && from)
    ? from
    : (() => { const d = new Date(); d.setDate(d.getDate() - defaultDays); return d.toISOString().slice(0, 10); })();
  const toDate = (!isIntraday && to) ? to : new Date().toISOString().slice(0, 10);

  try {
    const data = await yf.chart(toYahoo(symbol), {
      period1:  fromDate,
      period2:  toDate,
      interval,
    }, { validateResult: false });

    const rows = data?.quotes || [];
    const candles = rows
      .filter(r => r.open && r.high && r.low && r.close)
      .map(r => ({
        time: isIntraday
          ? new Date(r.date).toISOString().slice(0, 16).replace('T', ' ')
          : (r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10)),
        open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume ?? 0,
      }));

    const minCandles = strategy === 'sma200_trend' ? 210 : 55;
    if (candles.length < minCandles) {
      return res.status(400).json({ error: `Not enough data (need at least ${minCandles} bars). Try a longer date range or a higher timeframe.` });
    }

    let signals;
    if      (strategy === 'ema_cross')         signals = strategyEMACross(candles);
    else if (strategy === 'rsi_pullback')       signals = strategyRSIPullback(candles);
    else if (strategy === 'breakout_vol')       signals = strategyBreakout(candles);
    else if (strategy === 'macd_cross')         signals = strategyMACDCross(candles);
    else if (strategy === 'bb_squeeze')         signals = strategyBBSqueeze(candles);
    else if (strategy === 'sma200_trend')       signals = strategySMA200Trend(candles);
    else if (strategy === 'vwap_reclaim')       signals = strategyVWAPReclaim(candles);
    else if (strategy === 'composite_signal')   signals = strategyCompositeSignal(candles);
    else return res.status(400).json({ error: 'Unknown strategy' });

    res.json(buildResults(candles, signals));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backtest/vob — VOB (Volumized Order Blocks) Backtest
router.post('/vob', async (req, res) => {
  const { symbol, from, to, swingLen = 10, atrMult = 3.5, rrRatio = 3 } = req.body;
  
  try {
    const ySym = toYahoo(symbol);
    const start = from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const end = to || new Date().toISOString().slice(0, 10);
    
    const data = await yf.historical(ySym, { period1: start, period2: end, interval: '1d' });
    if (!data?.length) return res.json({ error: 'No data' });
    
    // Calculate ATR
    const atrData = data.slice(-14).map(d => Math.max(d.high - d.low, Math.abs(d.high - d.close), Math.abs(d.low - d.close)));
    const atr = atrData.reduce((a, b) => a + b, 0) / 14;
    const maxOBSize = atr * atrMult;
    
    const trades = [];
    let inPosition = false;
    let entryPrice = 0;
    let entryIndex = 0;
    let stopLoss = 0;
    let takeProfit = 0;
    
    // Find swing highs and VOBs
    for (let i = swingLen; i < data.length - swingLen - 1; i++) {
      // Check for swing high
      let isSwingHigh = true;
      for (let j = 1; j <= swingLen; j++) {
        if (data[i + j].high >= data[i].high || data[i - j].high >= data[i].high) {
          isSwingHigh = false;
          break;
        }
      }
      
      const swingHighPrice = data[i].high;
      
      // Look for bullish OB: price crosses above swing high
      if (!inPosition && isSwingHigh) {
        for (let k = i + 1; k < data.length; k++) {
          if (data[k].close > swingHighPrice && data[k - 1].close <= swingHighPrice) {
            // Found cross - find lowest low between i and k
            let minLow = data[i].low;
            let minLowIndex = i;
            for (let m = i; m <= k; m++) {
              if (data[m].low < minLow) {
                minLow = data[m].low;
                minLowIndex = m;
              }
            }
            
            const obSize = swingHighPrice - minLow;
            if (obSize > 0 && obSize <= maxOBSize) {
              // Entry on close above OB bottom
              if (data[k].close >= minLow) {
                entryPrice = data[k].close;
                entryIndex = k;
                stopLoss = minLow - (atr * 0.1); // 0.1 ATR buffer
                takeProfit = entryPrice + (entryPrice - stopLoss) * rrRatio;
                inPosition = true;
                break;
              }
            }
          }
        }
      }
      
      // Check exits
      if (inPosition) {
        const currentPrice = data[i].close;
        const date = data[i].date.toISOString().slice(0, 10);
        
        // Stop loss hit
        if (currentPrice <= stopLoss) {
          trades.push({
            entry: data[entryIndex].date.toISOString().slice(0, 10),
            exit: date,
            entryPrice: entryPrice.toFixed(2),
            exitPrice: currentPrice.toFixed(2),
            pnl: (currentPrice - entryPrice).toFixed(2),
            pnlPercent: ((currentPrice - entryPrice) / entryPrice * 100).toFixed(2),
            type: 'LONG',
            reason: 'SL'
          });
          inPosition = false;
        }
        // Take profit hit
        else if (currentPrice >= takeProfit) {
          trades.push({
            entry: data[entryIndex].date.toISOString().slice(0, 10),
            exit: date,
            entryPrice: entryPrice.toFixed(2),
            exitPrice: currentPrice.toFixed(2),
            pnl: (currentPrice - entryPrice).toFixed(2),
            pnlPercent: ((currentPrice - entryPrice) / entryPrice * 100).toFixed(2),
            type: 'LONG',
            reason: 'TP'
          });
          inPosition = false;
        }
      }
    }
    
    // Close any open position at end
    if (inPosition) {
      const lastPrice = data[data.length - 1].close;
      trades.push({
        entry: data[entryIndex].date.toISOString().slice(0, 10),
        exit: data[data.length - 1].date.toISOString().slice(0, 10),
        entryPrice: entryPrice.toFixed(2),
        exitPrice: lastPrice.toFixed(2),
        pnl: (lastPrice - entryPrice).toFixed(2),
        pnlPercent: ((lastPrice - entryPrice) / entryPrice * 100).toFixed(2),
        type: 'LONG',
        reason: 'EOD'
      });
    }
    
    const wins = trades.filter(t => parseFloat(t.pnl) > 0).length;
    const total = trades.length;
    const totalPnl = trades.reduce((s, t) => s + parseFloat(t.pnl), 0);
    
    res.json({
      strategy: 'VOB (Volumized Order Blocks)',
      params: { swingLen, atrMult, rrRatio },
      totalTrades: total,
      wins,
      losses: total - wins,
      winRate: total > 0 ? Math.round(wins / total * 100) : 0,
      totalPnl: totalPnl.toFixed(2),
      avgWin: total > 0 ? (trades.filter(t => parseFloat(t.pnl) > 0).reduce((s, t) => s + parseFloat(t.pnl), 0) / wins).toFixed(2) : 0,
      avgLoss: total > 0 ? (trades.filter(t => parseFloat(t.pnl) <= 0).reduce((s, t) => s + parseFloat(t.pnl), 0) / (total - wins)).toFixed(2) : 0,
      trades: trades.slice(-50),
    });
  } catch (err) {
    console.error('[backtest/vob]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
