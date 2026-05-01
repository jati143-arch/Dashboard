const express = require('express');
const router = express.Router();
const { default: YahooFinance } = require('yahoo-finance2');
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// --- Indicator math ---

function calcEMA(values, period) {
  const k = 2 / (period + 1);
  const ema = Array(values.length).fill(null);
  // seed = simple average of first `period` values
  let seed = 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] == null) continue;
    seed += values[i];
    count++;
    if (count === period) {
      ema[i] = seed / period;
      // fill forward from here
      for (let j = i + 1; j < values.length; j++) {
        if (values[j] == null) { ema[j] = null; continue; }
        ema[j] = values[j] * k + ema[j - 1] * (1 - k);
      }
      break;
    }
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

function calcMACD(closes, fast = 12, slow = 26, sigPeriod = 9) {
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);
  const macd = closes.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null,
  );
  // Signal = EMA of MACD values starting from first non-null
  const start = macd.findIndex(v => v !== null);
  if (start < 0) return { macd, signal: macd.map(() => null), histogram: macd.map(() => null) };
  const macdSlice = macd.slice(start);
  const sigSlice = calcEMA(macdSlice, sigPeriod);
  const signal = [...Array(start).fill(null), ...sigSlice];
  const histogram = macd.map((v, i) => v != null && signal[i] != null ? v - signal[i] : null);
  return { macd, signal, histogram };
}

function calcATR(candles, period = 14) {
  const tr = candles.map((c, i) => {
    const prev = i > 0 ? candles[i - 1].close : c.close;
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
  });
  const atr = Array(tr.length).fill(null);
  const sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
  atr[period - 1] = sum / period;
  for (let i = period; i < tr.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
}

// --- Lux Algo-style detection functions ---

function detectSFP(candles) {
  const n = candles.length - 1;
  const recent = candles.slice(-11);
  const swingHigh = Math.max(...recent.slice(0, -1).map(c => c.high));
  const swingLow  = Math.min(...recent.slice(0, -1).map(c => c.low));
  const last = candles[n];
  const bearSFP = last.high > swingHigh && last.close < swingHigh && (last.high - last.close) > (last.close - last.low);
  const bullSFP = last.low < swingLow && last.close > swingLow && (last.close - last.low) > (last.high - last.close);
  return { bearSFP, bullSFP, swingHigh, swingLow };
}

function detectLiquidity(candles) {
  const recent = candles.slice(-20);
  const highs = recent.map(c => c.high);
  const lows  = recent.map(c => c.low);
  let bsl = null, ssl = null;
  outer1: for (let i = 0; i < highs.length - 1; i++)
    for (let j = i + 1; j < highs.length; j++)
      if (Math.abs(highs[i] - highs[j]) / highs[i] < 0.002) { bsl = (highs[i] + highs[j]) / 2; break outer1; }
  outer2: for (let i = 0; i < lows.length - 1; i++)
    for (let j = i + 1; j < lows.length; j++)
      if (Math.abs(lows[i] - lows[j]) / lows[i] < 0.002) { ssl = (lows[i] + lows[j]) / 2; break outer2; }
  return { bsl, ssl };
}

function detectOrderBlock(candles, atr) {
  const n = candles.length - 1;
  const price = candles[n].close;
  let bullOB = null, bearOB = null;
  for (let i = n - 3; i >= Math.max(0, n - 30); i--) {
    const body = Math.abs(candles[i].close - candles[i].open);
    if (body < atr * 0.3) continue;
    const impulse = (candles[i + 1] && candles[i + 2])
      ? Math.abs(candles[i + 2].close - candles[i + 1].open) : 0;
    if (!bullOB && candles[i].close < candles[i].open && impulse > atr * 1.5 && candles[i].high < price)
      bullOB = { top: candles[i].open, bottom: candles[i].close };
    if (!bearOB && candles[i].close > candles[i].open && impulse > atr * 1.5 && candles[i].low > price)
      bearOB = { top: candles[i].close, bottom: candles[i].open };
    if (bullOB && bearOB) break;
  }
  return { bullOB, bearOB };
}

// --- Fetch OHLCV (120 days daily = enough for SMA50 + MACD signal warmup) ---
async function fetchCandles(symbol) {
  const period1 = new Date();
  period1.setDate(period1.getDate() - 120);
  const data = await yf.chart(symbol, {
    period1: period1.toISOString().slice(0, 10),
    interval: '1d',
  }, { validateResult: false });
  return (data?.quotes || [])
    .filter(r => r.open && r.close)
    .map(r => ({
      date:   new Date(r.date).toISOString().slice(0, 10),
      open:   r.open,
      high:   r.high,
      low:    r.low,
      close:  r.close,
      volume: r.volume ?? 0,
    }));
}

// GET /api/signals/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const candles = await fetchCandles(req.params.symbol);
    if (candles.length < 35) return res.status(422).json({ error: 'Not enough data' });

    const closes  = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    const n       = candles.length - 1;

    const ema9   = calcEMA(closes, 9);
    const ema20  = calcEMA(closes, 20);
    const sma50  = calcSMA(closes, 50);
    const rsi    = calcRSI(closes, 14);
    const macdObj = calcMACD(closes);
    const atr    = calcATR(candles, 14);

    const price     = closes[n];
    const curEma9   = ema9[n];
    const curEma20  = ema20[n];
    const curSma50  = sma50[n];
    const curRsi    = rsi[n];
    const curMacd   = macdObj.macd[n];
    const curSig    = macdObj.signal[n];
    const prevMacd  = macdObj.macd[n - 1];
    const prevSig   = macdObj.signal[n - 1];
    const curAtr    = atr[n];

    // Volume vs 20-day average
    const avgVol   = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
    const volRatio = avgVol > 0 ? volumes[n] / avgVol : 1;
    const isBullish = candles[n].close > candles[n].open;

    // ── Scoring ──────────────────────────────────────────────────────────────
    let score = 0;
    const bullReasons = [];
    const bearReasons = [];

    // 1. EMA 9 vs EMA 20 (short-term trend)
    if (curEma9 != null && curEma20 != null) {
      if (curEma9 > curEma20) {
        score += 1;
        bullReasons.push(`EMA 9 (${curEma9.toFixed(2)}) > EMA 20 (${curEma20.toFixed(2)}) — short-term momentum bullish`);
      } else {
        score -= 1;
        bearReasons.push(`EMA 9 (${curEma9.toFixed(2)}) < EMA 20 (${curEma20.toFixed(2)}) — short-term momentum bearish`);
      }
    }

    // 2. EMA 20 vs SMA 50 (medium-term trend)
    if (curEma20 != null && curSma50 != null) {
      if (curEma20 > curSma50) {
        score += 1;
        bullReasons.push(`EMA 20 (${curEma20.toFixed(2)}) > SMA 50 (${curSma50.toFixed(2)}) — medium-term trend is up`);
      } else {
        score -= 1;
        bearReasons.push(`EMA 20 (${curEma20.toFixed(2)}) < SMA 50 (${curSma50.toFixed(2)}) — medium-term trend is down`);
      }
    }

    // 3. Price vs EMA 20 (price relative to trend)
    if (curEma20 != null) {
      if (price > curEma20) {
        score += 1;
        bullReasons.push(`Price (${price.toFixed(2)}) trading above 20 EMA — holding above trend`);
      } else {
        score -= 1;
        bearReasons.push(`Price (${price.toFixed(2)}) below 20 EMA — under trend line`);
      }
    }

    // 4. RSI
    if (curRsi != null) {
      if (curRsi > 75) {
        score -= 2;
        bearReasons.push(`RSI ${curRsi.toFixed(1)} — severely overbought, high reversal risk`);
      } else if (curRsi > 65) {
        score -= 1;
        bearReasons.push(`RSI ${curRsi.toFixed(1)} — overbought, momentum fading`);
      } else if (curRsi >= 50 && curRsi <= 65) {
        score += 2;
        bullReasons.push(`RSI ${curRsi.toFixed(1)} — strong momentum zone, room to run`);
      } else if (curRsi >= 40 && curRsi < 50) {
        score += 1;
        bullReasons.push(`RSI ${curRsi.toFixed(1)} — neutral, watch for bounce above 50`);
      } else if (curRsi < 30) {
        score -= 1;
        bearReasons.push(`RSI ${curRsi.toFixed(1)} — oversold (potential reversal, but trend is down)`);
      } else {
        bearReasons.push(`RSI ${curRsi.toFixed(1)} — weak momentum`);
      }
    }

    // 5. MACD crossover
    if (curMacd != null && curSig != null) {
      const crossed = prevMacd != null && prevSig != null &&
        Math.sign(curMacd - curSig) !== Math.sign(prevMacd - prevSig);
      if (curMacd > curSig) {
        score += crossed ? 2 : 1;
        bullReasons.push(crossed
          ? 'MACD just crossed above signal line — fresh bullish crossover'
          : 'MACD above signal line — bullish momentum');
      } else {
        score -= crossed ? 2 : 1;
        bearReasons.push(crossed
          ? 'MACD just crossed below signal line — fresh bearish crossover'
          : 'MACD below signal line — bearish momentum');
      }
    }

    // 6. Volume confirmation
    if (volRatio > 1.5) {
      if (isBullish) {
        score += 1;
        bullReasons.push(`Volume ${volRatio.toFixed(1)}× above 20-day avg on green candle — buying pressure`);
      } else {
        score -= 1;
        bearReasons.push(`Volume ${volRatio.toFixed(1)}× above 20-day avg on red candle — selling pressure`);
      }
    }

    // ── Signal label ─────────────────────────────────────────────────────────
    let signal, confidence;
    if      (score >= 5) { signal = 'STRONG BUY';  confidence = 'High';   }
    else if (score >= 3) { signal = 'BUY';          confidence = 'Medium'; }
    else if (score >= 1) { signal = 'WEAK BUY';     confidence = 'Low';    }
    else if (score === 0){ signal = 'NEUTRAL';       confidence = 'Low';    }
    else if (score >= -2){ signal = 'WEAK SELL';     confidence = 'Low';    }
    else if (score >= -4){ signal = 'SELL';          confidence = 'Medium'; }
    else                 { signal = 'STRONG SELL';  confidence = 'High';   }

    const isBuy = signal.includes('BUY');
    const isSell = signal.includes('SELL');

    // ── SL & Targets ─────────────────────────────────────────────────────────
    // Swing high/low from last 20 candles
    const recent = candles.slice(-20);
    const swingLow  = Math.min(...recent.map(c => c.low));
    const swingHigh = Math.max(...recent.map(c => c.high));

    let sl, targets = [];
    if (isBuy || signal === 'NEUTRAL') {
      // SL = max(recent swing low, price - 1.5×ATR) — whichever is tighter
      const atrSL = price - (curAtr || price * 0.03) * 1.5;
      sl = Math.max(swingLow, atrSL);
      const risk = price - sl;
      if (risk > 0) {
        targets = [
          { label: 'T1 (1:1.5 R/R)', price: +(price + risk * 1.5).toFixed(2), pct: +((risk * 1.5 / price) * 100).toFixed(1) },
          { label: 'T2 (1:2.5 R/R)', price: +(price + risk * 2.5).toFixed(2), pct: +((risk * 2.5 / price) * 100).toFixed(1) },
          { label: 'T3 (1:4 R/R)',   price: +(price + risk * 4.0).toFixed(2), pct: +((risk * 4.0 / price) * 100).toFixed(1) },
        ];
      }
    } else {
      const atrSL = price + (curAtr || price * 0.03) * 1.5;
      sl = Math.min(swingHigh, atrSL);
      const risk = sl - price;
      if (risk > 0) {
        targets = [
          { label: 'T1 (1:1.5 R/R)', price: +(price - risk * 1.5).toFixed(2), pct: +((risk * 1.5 / price) * 100).toFixed(1) },
          { label: 'T2 (1:2.5 R/R)', price: +(price - risk * 2.5).toFixed(2), pct: +((risk * 2.5 / price) * 100).toFixed(1) },
          { label: 'T3 (1:4 R/R)',   price: +(price - risk * 4.0).toFixed(2), pct: +((risk * 4.0 / price) * 100).toFixed(1) },
        ];
      }
    }

    // ── Lux Algo: SFP, Liquidity Levels, Order Blocks ─────────────────────────
    const sfp  = detectSFP(candles);
    const liq  = detectLiquidity(candles);
    const obs  = detectOrderBlock(candles, curAtr || price * 0.01);

    // SFP score adjustments
    if (sfp.bearSFP) {
      score -= 1;
      bearReasons.push(`Bearish SFP — candle wicked above prior high (${sfp.swingHigh.toFixed(2)}) then closed inside. Potential stop hunt reversal.`);
    }
    if (sfp.bullSFP) {
      score += 1;
      bullReasons.push(`Bullish SFP — candle wicked below prior low (${sfp.swingLow.toFixed(2)}) then closed above. Stop hunt complete, reversal likely.`);
    }

    // Liquidity level warnings
    if (liq.bsl && Math.abs(price - liq.bsl) / price < 0.01)
      bearReasons.push(`Price near Buy-Side Liquidity (equal highs at ${liq.bsl.toFixed(2)}) — potential liquidity grab before reversal.`);
    if (liq.ssl && Math.abs(price - liq.ssl) / price < 0.01)
      bullReasons.push(`Price near Sell-Side Liquidity (equal lows at ${liq.ssl.toFixed(2)}) — stops may have been swept, bounce possible.`);

    // Order block context
    if (obs.bullOB) bullReasons.push(`Bullish Order Block below price: ${obs.bullOB.bottom.toFixed(2)}–${obs.bullOB.top.toFixed(2)} — strong support zone.`);
    if (obs.bearOB) bearReasons.push(`Bearish Order Block above price: ${obs.bearOB.bottom.toFixed(2)}–${obs.bearOB.top.toFixed(2)} — resistance zone, caution.`);

    const slPct = sl != null ? +(((price - sl) / price) * 100).toFixed(1) : null;

    res.json({
      symbol:     req.params.symbol,
      price:      +price.toFixed(2),
      signal,
      confidence,
      score,
      maxScore:   8,
      isBuy,
      isSell,
      reasons:    isBuy || signal === 'NEUTRAL' ? bullReasons : bearReasons,
      risks:      isBuy || signal === 'NEUTRAL' ? bearReasons : bullReasons,
      sl:         sl != null ? +sl.toFixed(2) : null,
      slPct:      slPct != null ? Math.abs(slPct) : null,
      targets,
      indicators: {
        ema9:       curEma9  != null ? +curEma9.toFixed(2)  : null,
        ema20:      curEma20 != null ? +curEma20.toFixed(2) : null,
        sma50:      curSma50 != null ? +curSma50.toFixed(2) : null,
        rsi:        curRsi   != null ? +curRsi.toFixed(1)   : null,
        macd:       curMacd  != null ? +curMacd.toFixed(4)  : null,
        macdSignal: curSig   != null ? +curSig.toFixed(4)   : null,
        atr:        curAtr   != null ? +curAtr.toFixed(2)   : null,
        volume:     Math.round(volumes[n]),
        avgVolume:  Math.round(avgVol),
        volRatio:   +volRatio.toFixed(2),
      },
      lux: {
        sfp:    sfp.bearSFP ? 'bearish' : sfp.bullSFP ? 'bullish' : null,
        bsl:    liq.bsl ? +liq.bsl.toFixed(2) : null,
        ssl:    liq.ssl ? +liq.ssl.toFixed(2) : null,
        bullOB: obs.bullOB ? { top: +obs.bullOB.top.toFixed(2), bottom: +obs.bullOB.bottom.toFixed(2) } : null,
        bearOB: obs.bearOB ? { top: +obs.bearOB.top.toFixed(2), bottom: +obs.bearOB.bottom.toFixed(2) } : null,
      },
    });
  } catch (err) {
    console.error('[signals]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
