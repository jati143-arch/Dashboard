import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createChart, CrosshairMode, LineStyle,
  CandlestickSeries, LineSeries, HistogramSeries,
  createSeriesMarkers,
} from 'lightweight-charts';
import { chartApi, nseApi } from '../../api/client.js';

// --- Indicator math ---
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

function calcATR(candles, period = 14) {
  const tr = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const prev = i > 0 ? candles[i - 1].close : c.close;
    const h = c.high - c.low;
    const hc = Math.abs(c.high - prev);
    const lc = Math.abs(c.low - prev);
    tr.push(Math.max(h, hc, lc));
  }
  const atr = Array(tr.length).fill(null);
  let sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
  atr[period - 1] = sum / period;
  for (let i = period; i < tr.length; i++) {
    sum = sum - tr[i - period] + tr[i];
    atr[i] = sum / period;
  }
  return atr;
}

function calcCDV(candles) {
  return candles.map(c => {
    if (c.high === c.low) return 0;
    const delta = c.volume * (2 * (c.close - c.low) / (c.high - c.low) - 1);
    return delta;
  });
}

function findSwingPoints(candles, lookback = 5) {
  const highs = [], lows = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const window = candles.slice(i - lookback, i + lookback + 1);
    const maxH = Math.max(...window.map(c => c.high));
    const minL = Math.min(...window.map(c => c.low));
    if (candles[i].high === maxH) highs.push({ time: candles[i].time, price: maxH, index: i });
    if (candles[i].low === minL) lows.push({ time: candles[i].time, price: minL, index: i });
  }
  return { highs, lows };
}

function detectOrderBlocks(candles, atr, maxCount = 5) {
  if (!atr[atr.length - 1]) return [];
  const obs = [];
  const currentAtr = atr[atr.length - 1];

  for (let i = 1; i < candles.length - 4; i++) {
    const body = Math.abs(candles[i].close - candles[i].open);
    if (body < 0.3 * currentAtr) continue;

    const isBearish = candles[i].close < candles[i].open;
    const impulseStart = isBearish ? candles[i].close : candles[i].open;
    const impulseEnd = isBearish
      ? Math.min(...candles.slice(i + 1, i + 4).map(c => c.low))
      : Math.max(...candles.slice(i + 1, i + 4).map(c => c.high));
    const impulse = Math.abs(impulseEnd - impulseStart);

    if (impulse < 1.5 * currentAtr) continue;

    let mitigated = false;
    for (let j = i + 4; j < candles.length; j++) {
      if (isBearish && candles[j].close < candles[i].close) {
        mitigated = true;
        break;
      }
      if (!isBearish && candles[j].close > candles[i].open) {
        mitigated = true;
        break;
      }
    }
    if (mitigated) continue;

    const score = impulse / currentAtr;
    const type = isBearish ? 'bearish' : 'bullish';
    const top = isBearish ? candles[i].open : candles[i].close;
    const bottom = isBearish ? candles[i].close : candles[i].open;
    obs.push({ type, time: candles[i].time, top, bottom, score, startIdx: i });
  }

  return obs.sort((a, b) => b.score - a.score).slice(0, maxCount);
}

function detectFVG(candles, atr, maxCount = 5) {
  if (!atr[atr.length - 1]) return [];
  const fvgs = [];
  const currentAtr = atr[atr.length - 1];

  for (let i = 1; i < candles.length - 1; i++) {
    const bullFVG = candles[i - 1].high < candles[i + 1].low;
    const bearFVG = candles[i - 1].low > candles[i + 1].high;

    if (!bullFVG && !bearFVG) continue;

    const gapSize = bullFVG ? candles[i + 1].low - candles[i - 1].high : candles[i - 1].low - candles[i + 1].high;
    if (Math.abs(gapSize) < 0.2 * currentAtr) continue;

    let filled = false;
    const midpoint = bullFVG ? (candles[i - 1].high + candles[i + 1].low) / 2 : (candles[i - 1].low + candles[i + 1].high) / 2;
    for (let j = i + 2; j < candles.length; j++) {
      if (bullFVG && candles[j].low <= midpoint) {
        filled = true;
        break;
      }
      if (bearFVG && candles[j].high >= midpoint) {
        filled = true;
        break;
      }
    }
    if (filled) continue;

    const type = bullFVG ? 'bull' : 'bear';
    const top = bullFVG ? candles[i + 1].low : candles[i - 1].low;
    const bottom = bullFVG ? candles[i - 1].high : candles[i + 1].high;
    fvgs.push({ type, time: candles[i + 1].time, top, bottom, startIdx: i + 1 });
  }

  return fvgs.slice(-maxCount);
}

function detectBreakerBlocks(candles, atr, maxCount = 4) {
  if (!atr[atr.length - 1]) return [];
  const breakers = [];
  const currentAtr = atr[atr.length - 1];

  for (let i = 1; i < candles.length - 4; i++) {
    const body = Math.abs(candles[i].close - candles[i].open);
    if (body < 0.3 * currentAtr) continue;

    const isBearish = candles[i].close < candles[i].open;
    const impulseStart = isBearish ? candles[i].close : candles[i].open;
    const impulseEnd = isBearish
      ? Math.min(...candles.slice(i + 1, i + 4).map(c => c.low))
      : Math.max(...candles.slice(i + 1, i + 4).map(c => c.high));
    const impulse = Math.abs(impulseEnd - impulseStart);

    if (impulse < 1.5 * currentAtr) continue;

    let mitigatedIdx = -1;
    for (let j = i + 4; j < candles.length; j++) {
      if (isBearish && candles[j].close < candles[i].close) {
        mitigatedIdx = j;
        break;
      }
      if (!isBearish && candles[j].close > candles[i].open) {
        mitigatedIdx = j;
        break;
      }
    }
    if (mitigatedIdx === -1) continue;

    const type = isBearish ? 'bullish' : 'bearish';
    const top = isBearish ? candles[i].close : candles[i].open;
    const bottom = isBearish ? candles[i].open : candles[i].close;
    breakers.push({ type, time: candles[mitigatedIdx].time, top, bottom, startIdx: mitigatedIdx });
  }

  return breakers.slice(-maxCount);
}

function detectSFP(candles, swingHighs, swingLows, atr) {
  if (!atr[atr.length - 1]) return [];
  const sfps = [];

  for (let i = 5; i < candles.length; i++) {
    const c = candles[i];
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;

    for (const sh of swingHighs.slice(-5)) {
      if (c.high > sh.price && c.close < sh.price && upperWick > lowerWick && sh.index < i - 1) {
        sfps.push({ time: c.time, type: 'bearish', price: c.high });
        break;
      }
    }

    for (const sl of swingLows.slice(-5)) {
      if (c.low < sl.price && c.close > sl.price && lowerWick > upperWick && sl.index < i - 1) {
        sfps.push({ time: c.time, type: 'bullish', price: c.low });
        break;
      }
    }
  }

  return sfps.slice(-10);
}

function detectLiquidityLevels(swingHighs, swingLows, tolerance = 0.002) {
  const levels = [];

  for (let i = 0; i < swingHighs.length; i++) {
    for (let j = i + 1; j < swingHighs.length; j++) {
      const diff = Math.abs(swingHighs[i].price - swingHighs[j].price);
      if (diff / swingHighs[i].price < tolerance) {
        const price = (swingHighs[i].price + swingHighs[j].price) / 2;
        if (!levels.find(l => Math.abs(l.price - price) < 0.001)) {
          levels.push({ price, type: 'bsl', time: swingHighs[Math.max(i, j)].time });
        }
      }
    }
  }

  for (let i = 0; i < swingLows.length; i++) {
    for (let j = i + 1; j < swingLows.length; j++) {
      const diff = Math.abs(swingLows[i].price - swingLows[j].price);
      if (diff / swingLows[i].price < tolerance) {
        const price = (swingLows[i].price + swingLows[j].price) / 2;
        if (!levels.find(l => Math.abs(l.price - price) < 0.001)) {
          levels.push({ price, type: 'ssl', time: swingLows[Math.max(i, j)].time });
        }
      }
    }
  }

  return levels;
}

function detectDynamicOB(obs, currentPrice) {
  const bullish = obs.filter(ob => ob.type === 'bullish' && ob.bottom < currentPrice).sort((a, b) => b.bottom - a.bottom).slice(0, 1);
  const bearish = obs.filter(ob => ob.type === 'bearish' && ob.bottom > currentPrice).sort((a, b) => a.bottom - b.bottom).slice(0, 1);
  return [...bullish, ...bearish];
}

function addZone(chart, startTime, endTime, top, bottom, color, lw = 1) {
  const topLine = chart.addSeries(LineSeries, {
    color, lineWidth: lw, lineStyle: LineStyle.Solid,
    priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
  });
  topLine.setData([{ time: startTime, value: top }, { time: endTime, value: top }]);

  const bottomLine = chart.addSeries(LineSeries, {
    color, lineWidth: lw, lineStyle: LineStyle.Dashed,
    priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
  });
  bottomLine.setData([{ time: startTime, value: bottom }, { time: endTime, value: bottom }]);
}

function addLine(chart, startTime, endTime, price, color) {
  const line = chart.addSeries(LineSeries, {
    color, lineWidth: 1, lineStyle: LineStyle.Dashed,
    priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
  });
  line.setData([{ time: startTime, value: price }, { time: endTime, value: price }]);
}

const TIMEFRAMES = {
  '1m':  { label: '1 Min',   note: 'max 7 days'  },
  '2m':  { label: '2 Min',   note: 'max 7 days'  },
  '5m':  { label: '5 Min',   note: 'max 60 days' },
  '15m': { label: '15 Min',  note: 'max 60 days' },
  '30m': { label: '30 Min',  note: 'max 60 days' },
  '1h':  { label: '1 Hour',  note: 'max 2 years' },
  '2h':  { label: '2 Hour',  note: 'max 2 years' },
  '4h':  { label: '4 Hour',  note: 'max 2 years' },
  '6h':  { label: '6 Hour',  note: 'max 2 years' },
  '8h':  { label: '8 Hour',  note: 'max 2 years' },
  '12h': { label: '12 Hour', note: 'max 2 years' },
  '3mo': { label: '3 Months',  note: 'full history' },
  '6mo': { label: '6 Months',  note: 'full history' },
  '1y':  { label: '1 Year',    note: 'full history' },
  '2y':  { label: '2 Years',   note: 'full history' },
  '5y':  { label: '5 Years',   note: 'full history' },
};

const MTF_OPTIONS = {
  '1m':  ['5m','15m','1h','4h'],
  '2m':  ['5m','15m','1h','4h'],
  '5m':  ['15m','1h','4h'],
  '15m': ['1h','4h'],
  '30m': ['1h','4h'],
  '1h':  ['4h'],
  '2h':  ['4h','8h','12h'],
  '4h':  ['8h','12h'],
  '6h':  ['12h'],
  '8h':  ['12h'],
  '12h': [],
  '3mo': ['1y','2y'],
  '6mo': ['1y','2y'],
  '1y':  ['2y'],
  '2y':  ['5y'],
  '5y':  [],
};

const INTRADAY_BTNS = ['1m', '2m', '5m', '15m'];

const DARK_OPTS = {
  layout:    { background: { color: '#141414' }, textColor: '#888888' },
  grid:      { vertLines: { color: '#1e1e1e' }, horzLines: { color: '#1e1e1e' } },
  crosshair: { mode: CrosshairMode.Normal },
};

const INDICATOR_DEFS = [
  { key: 'ema9',  label: '9 EMA',  color: '#00aaff' },
  { key: 'ema20', label: '20 EMA', color: '#ffa500' },
  { key: 'sma50', label: '50 SMA', color: '#aa44ff' },
  { key: 'rsi',   label: 'RSI(14)', color: '#ffd700' },
  { key: 'cdv',   label: 'CDV',    color: '#00ff88' },
];

export default function ChartModal({ symbol, entryPrice, onClose }) {
  const [range, setRange]           = useState('1y');
  const [showSmc, setShowSmc]       = useState(true);
  const [smcTf, setSmcTf]           = useState('');
  const [showDeals, setShowDeals]   = useState(false);
  const [indicators, setIndicators] = useState({ ema9: true, ema20: true, sma50: true, rsi: true, cdv: false });
  const [smcLayers, setSmcLayers]   = useState({ ob: true, fvg: true, breaker: false, dob: true, sfp: true, liq: true });

  const mainRef    = useRef(null);
  const rsiRef     = useRef(null);
  const cdvRef     = useRef(null);
  const mainChart  = useRef(null);
  const rsiChart   = useRef(null);
  const cdvChart   = useRef(null);
  const seriesRefs = useRef({});

  const nseSym = symbol.replace(/\.(NS|BO)$/, '');
  const tf = TIMEFRAMES[range] || TIMEFRAMES['1y'];
  const isMoreRange = !INTRADAY_BTNS.includes(range);
  const mtfOpts = MTF_OPTIONS[range] || [];

  const { data: candles = [], isLoading } = useQuery({
    queryKey: ['chart', symbol, range],
    queryFn:  () => chartApi.ohlcv(symbol, range),
    staleTime: 5 * 60_000,
  });

  const { data: mtfCandles = [] } = useQuery({
    queryKey: ['chart', symbol, smcTf],
    queryFn:  () => chartApi.ohlcv(symbol, smcTf),
    enabled:  showSmc && !!smcTf,
    staleTime: 5 * 60_000,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['nse-deals', nseSym],
    queryFn:  () => nseApi.deals(nseSym),
    enabled:  showDeals,
    staleTime: 60 * 60_000,
  });

  useEffect(() => { setSmcTf(''); }, [range]);

  useEffect(() => {
    if (!candles.length || !mainRef.current || !rsiRef.current) return;

    if (mainChart.current) { mainChart.current.remove(); mainChart.current = null; }
    if (rsiChart.current)  { rsiChart.current.remove();  rsiChart.current  = null; }
    if (cdvChart.current)  { cdvChart.current.remove();  cdvChart.current  = null; }
    seriesRefs.current = {};

    const closes = candles.map(c => c.close);
    const times  = candles.map(c => c.time);
    const lastTime = times[times.length - 1];
    const lastPrice = closes[closes.length - 1];

    const main = createChart(mainRef.current, {
      ...DARK_OPTS,
      width:  mainRef.current.clientWidth,
      height: mainRef.current.clientHeight,
      timeScale: { borderColor: '#2a2a2a', timeVisible: true },
      rightPriceScale: { borderColor: '#2a2a2a' },
    });
    mainChart.current = main;

    const cs = main.addSeries(CandlestickSeries, {
      upColor:       '#00ff88', downColor:       '#ff3355',
      borderUpColor: '#00ff88', borderDownColor: '#ff3355',
      wickUpColor:   '#00ff88', wickDownColor:   '#ff3355',
    });
    cs.setData(candles);

    const vol = main.addSeries(HistogramSeries, {
      color: '#2a2a2a', priceFormat: { type: 'volume' }, priceScaleId: 'vol',
    });
    main.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    vol.setData(candles.map(c => ({
      time: c.time, value: c.volume,
      color: c.close >= c.open ? '#00ff8844' : '#ff335544',
    })));

    const indDefs = [
      { key: 'ema9',  values: calcEMA(closes, 9),  color: '#00aaff', title: '9 EMA' },
      { key: 'ema20', values: calcEMA(closes, 20), color: '#ffa500', title: '20 EMA' },
      { key: 'sma50', values: calcSMA(closes, 50), color: '#aa44ff', title: '50 SMA' },
    ];
    indDefs.forEach(({ key, values, color, title }) => {
      const s = main.addSeries(LineSeries, {
        color, lineWidth: 1, priceLineVisible: false, lastValueVisible: true, title,
        visible: indicators[key],
      });
      s.setData(values.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean));
      seriesRefs.current[key] = s;
    });

    if (entryPrice != null) {
      cs.createPriceLine({
        price: entryPrice, color: '#00ff88', lineWidth: 1,
        lineStyle: LineStyle.Dashed, axisLabelVisible: true,
        title: `Entry @ ${entryPrice}`,
      });
    }

    if (showSmc) {
      const atr = calcATR(candles);

      if (smcLayers.ob) {
        detectOrderBlocks(candles, atr).forEach(ob => {
          const color = ob.type === 'bullish' ? '#00ff88' : '#ff3355';
          addZone(main, ob.time, lastTime, ob.top, ob.bottom, color, 1);
        });
      }

      if (smcLayers.fvg) {
        detectFVG(candles, atr).forEach(fvg => {
          const color = fvg.type === 'bull' ? '#ffd700' : '#ff6666';
          addZone(main, fvg.time, lastTime, fvg.top, fvg.bottom, color, 1);
        });
      }

      if (smcLayers.breaker) {
        detectBreakerBlocks(candles, atr).forEach(br => {
          const color = br.type === 'bullish' ? '#cc44ff' : '#ff44cc';
          addZone(main, br.time, lastTime, br.top, br.bottom, color, 1);
        });
      }

      if (smcLayers.sfp) {
        const { highs: swingHighs, lows: swingLows } = findSwingPoints(candles);
        const sfps = detectSFP(candles, swingHighs, swingLows, atr);
        const markers = sfps.map(sfp => ({
          time: sfp.time,
          position: sfp.type === 'bearish' ? 'aboveBar' : 'belowBar',
          shape: sfp.type === 'bearish' ? 'arrowDown' : 'arrowUp',
          color: sfp.type === 'bearish' ? '#ff3355' : '#00ff88',
          text: 'SFP',
        }));
        if (markers.length) createSeriesMarkers(cs, markers);
      }

      if (smcLayers.liq) {
        const { highs: swingHighs, lows: swingLows } = findSwingPoints(candles);
        const levels = detectLiquidityLevels(swingHighs, swingLows);
        levels.forEach(lv => {
          const color = lv.type === 'bsl' ? '#00ffcc' : '#ff9900';
          addLine(main, lv.time, lastTime, lv.price, color);
        });
      }

      if (smcLayers.dob) {
        const obs = detectOrderBlocks(candles, calcATR(candles));
        const dobs = detectDynamicOB(obs, lastPrice);
        dobs.forEach(dob => {
          const color = dob.type === 'bullish' ? '#00ff88' : '#ff3355';
          addZone(main, dob.time, lastTime, dob.top, dob.bottom, color, 2);
        });
      }

      if (smcTf && mtfCandles.length) {
        const mtfAtr = calcATR(mtfCandles);
        const mtfLastTime = mtfCandles[mtfCandles.length - 1].time;

        detectOrderBlocks(mtfCandles, mtfAtr).forEach(ob => {
          const color = ob.type === 'bullish' ? '#00ff88' : '#ff3355';
          addZone(main, ob.time, lastTime, ob.top, ob.bottom, color, 2);
        });

        detectFVG(mtfCandles, mtfAtr).forEach(fvg => {
          const color = fvg.type === 'bull' ? '#ffd700' : '#ff6666';
          addZone(main, fvg.time, lastTime, fvg.top, fvg.bottom, color, 2);
        });
      }
    }

    const rsi = createChart(rsiRef.current, {
      ...DARK_OPTS,
      width:  rsiRef.current.clientWidth,
      height: rsiRef.current.clientHeight,
      timeScale: { borderColor: '#2a2a2a', visible: false },
      rightPriceScale: { borderColor: '#2a2a2a', scaleMargins: { top: 0.1, bottom: 0.1 } },
    });
    rsiChart.current = rsi;

    const rsiValues = calcRSI(closes, 14);
    const rsiLine = rsi.addSeries(LineSeries, {
      color: '#ffd700', lineWidth: 1, priceLineVisible: false, lastValueVisible: true,
      visible: indicators.rsi,
    });
    rsiLine.setData(rsiValues.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean));
    rsiLine.createPriceLine({ price: 70, color: '#ff3355', lineWidth: 1, lineStyle: LineStyle.Dotted, title: '70', axisLabelVisible: true });
    rsiLine.createPriceLine({ price: 30, color: '#00ff88', lineWidth: 1, lineStyle: LineStyle.Dotted, title: '30', axisLabelVisible: true });
    rsiLine.createPriceLine({ price: 50, color: '#444444', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false });
    seriesRefs.current['rsi'] = rsiLine;

    if (indicators.cdv && cdvRef.current) {
      const cdv = createChart(cdvRef.current, {
        ...DARK_OPTS,
        width:  cdvRef.current.clientWidth,
        height: cdvRef.current.clientHeight,
        timeScale: { borderColor: '#2a2a2a', visible: false },
        rightPriceScale: { borderColor: '#2a2a2a', scaleMargins: { top: 0.1, bottom: 0.1 } },
      });
      cdvChart.current = cdv;

      const deltaVals = calcCDV(candles);
      let cumCDV = 0;
      const cumVals = deltaVals.map(d => { cumCDV += d; return cumCDV; });

      const hist = cdv.addSeries(HistogramSeries, {
        color: '#2a2a2a', priceFormat: { type: 'volume' }, priceScaleId: '',
      });
      hist.setData(candles.map((c, i) => ({
        time: c.time,
        value: Math.abs(deltaVals[i]),
        color: deltaVals[i] >= 0 ? '#00ff8844' : '#ff335544',
      })));

      const cdvLine = cdv.addSeries(LineSeries, {
        color: '#00ff88', lineWidth: 2, priceLineVisible: false, lastValueVisible: true,
        visible: true,
      });
      cdvLine.setData(cumVals.map((v, i) => ({ time: times[i], value: v })));
      cdvLine.createPriceLine({ price: 0, color: '#444444', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false });

      cdv.timeScale().subscribeVisibleLogicalRangeChange(r => {
        if (r) main.timeScale().setVisibleLogicalRange(r);
      });
    }

    main.timeScale().subscribeVisibleLogicalRangeChange(r => {
      if (r) {
        rsi.timeScale().setVisibleLogicalRange(r);
        if (cdvChart.current) cdvChart.current.timeScale().setVisibleLogicalRange(r);
      }
    });
    main.timeScale().fitContent();

    return () => {
      if (mainChart.current) { mainChart.current.remove(); mainChart.current = null; }
      if (rsiChart.current)  { rsiChart.current.remove();  rsiChart.current  = null; }
      if (cdvChart.current)  { cdvChart.current.remove();  cdvChart.current  = null; }
    };
  }, [candles, entryPrice, showSmc, smcLayers, smcTf, mtfCandles, indicators.cdv]);

  function toggleIndicator(key) {
    setIndicators(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (seriesRefs.current[key]) {
        seriesRefs.current[key].applyOptions({ visible: next[key] });
      }
      if (key === 'rsi' && rsiRef.current) {
        rsiRef.current.parentElement.style.display = next.rsi ? '' : 'none';
      }
      if (key === 'cdv' && cdvRef.current) {
        cdvRef.current.parentElement.style.display = next.cdv ? '' : 'none';
      }
      return next;
    });
  }

  function toggleSmcLayer(key) {
    setSmcLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }

  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (mainChart.current && mainRef.current) mainChart.current.applyOptions({ width: mainRef.current.clientWidth, height: mainRef.current.clientHeight });
      if (rsiChart.current  && rsiRef.current)  rsiChart.current.applyOptions({ width: rsiRef.current.clientWidth,  height: rsiRef.current.clientHeight });
      if (cdvChart.current  && cdvRef.current)  cdvChart.current.applyOptions({ width: cdvRef.current.clientWidth,  height: cdvRef.current.clientHeight });
    });
    if (mainRef.current) obs.observe(mainRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const nativeCs = symbol.endsWith('.NS') || symbol.endsWith('.BO') ? '₹' : '$';

  const btnStyle = (active, color) => ({
    padding: '3px 9px', fontSize: 11, borderRadius: 4, cursor: 'pointer', fontWeight: 600,
    border: active ? 'none' : '1px solid var(--border)',
    background: active ? (color || 'var(--accent)') : 'transparent',
    color: active ? (color ? '#fff' : '#000') : 'var(--text-dim)',
  });

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8,
        width: 'min(98vw, 1200px)', height: 'min(92vh, 900px)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{symbol}</span>
          {entryPrice != null && (
            <span style={{ fontSize: 11, color: 'var(--green)', border: '1px solid var(--green)', borderRadius: 4, padding: '1px 6px' }}>
              Entry {nativeCs}{entryPrice}
            </span>
          )}

          <div style={{ display: 'flex', gap: 3, marginLeft: 6 }}>
            {INTRADAY_BTNS.map(r => (
              <button key={r} onClick={() => setRange(r)} style={btnStyle(range === r)}>
                {TIMEFRAMES[r].label}
              </button>
            ))}
          </div>

          <select
            value={!INTRADAY_BTNS.includes(range) ? range : ''}
            onChange={e => { if (e.target.value) setRange(e.target.value); }}
            style={{
              background: !INTRADAY_BTNS.includes(range) ? 'var(--accent)' : 'var(--bg-card)',
              color: !INTRADAY_BTNS.includes(range) ? '#000' : 'var(--text-dim)',
              border: '1px solid var(--border)', borderRadius: 4,
              fontSize: 11, fontWeight: 600, padding: '3px 6px', cursor: 'pointer',
            }}
          >
            <option value="" disabled>{!INTRADAY_BTNS.includes(range) ? tf.label : 'More ▾'}</option>
            <optgroup label="─ Intraday ─">
              <option value="30m">30 Min</option>
              <option value="1h">1 Hour</option>
            </optgroup>
            <optgroup label="─ Multi-Hour ─">
              <option value="2h">2 Hour</option>
              <option value="4h">4 Hour</option>
              <option value="6h">6 Hour</option>
              <option value="8h">8 Hour</option>
              <option value="12h">12 Hour</option>
            </optgroup>
            <optgroup label="─ Daily & Above ─">
              <option value="3mo">3 Months</option>
              <option value="6mo">6 Months</option>
              <option value="1y">1 Year</option>
              <option value="2y">2 Years</option>
              <option value="5y">5 Years</option>
            </optgroup>
          </select>

          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <button onClick={() => setShowSmc(v => !v)} style={btnStyle(showSmc, '#aa44ff')}>SMC</button>
            {showSmc && mtfOpts.length > 0 && (
              <select value={smcTf} onChange={e => setSmcTf(e.target.value)} style={{
                background: smcTf ? 'var(--accent)' : 'var(--bg-card)',
                color: smcTf ? '#000' : 'var(--text-dim)',
                border: '1px solid var(--border)', borderRadius: 4,
                fontSize: 11, fontWeight: 600, padding: '3px 6px', cursor: 'pointer',
              }}>
                <option value="">+ MTF</option>
                {mtfOpts.map(tf => <option key={tf} value={tf}>{TIMEFRAMES[tf].label} OBs</option>)}
              </select>
            )}
            <button onClick={() => setShowDeals(v => !v)} style={btnStyle(showDeals)}>Deals</button>
            <button onClick={onClose} style={{
              background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)',
              borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 13,
            }}>✕</button>
          </div>
        </div>

        {/* Legend Row 1 */}
        <div style={{ display: 'flex', gap: 6, padding: '5px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          {INDICATOR_DEFS.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => toggleIndicator(key)}
              title={indicators[key] ? `Hide ${label}` : `Show ${label}`}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                fontSize: 10, fontFamily: 'var(--text-mono)', borderRadius: 3,
                color: indicators[key] ? color : '#444',
                textDecoration: indicators[key] ? 'none' : 'line-through',
                opacity: indicators[key] ? 1 : 0.5,
              }}
            >
              ▬ {label}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--text-mono)' }}>
            {tf.label} · {tf.note}
          </span>
        </div>

        {/* Legend Row 2 — SMC layers */}
        {showSmc && (
          <div style={{ display: 'flex', gap: 6, padding: '5px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center', fontSize: 10 }}>
            {['ob', 'fvg', 'breaker', 'dob', 'sfp', 'liq'].map(key => {
              const labels = { ob: 'OB', fvg: 'FVG', breaker: 'Breaker', dob: 'DOB', sfp: 'SFP', liq: 'Liq' };
              return (
                <button
                  key={key}
                  onClick={() => toggleSmcLayer(key)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                    fontFamily: 'var(--text-mono)', borderRadius: 3,
                    color: smcLayers[key] ? 'var(--accent)' : '#444',
                    opacity: smcLayers[key] ? 1 : 0.5,
                  }}
                >
                  ● {labels[key]}
                </button>
              );
            })}
            {smcTf && (
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--text-mono)' }}>
                + {TIMEFRAMES[smcTf].label} MTF
              </span>
            )}
          </div>
        )}

        {/* Main chart */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {isLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', zIndex: 2, background: '#141414' }}>
              Loading {tf.label} chart…
            </div>
          )}
          <div ref={mainRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* RSI pane */}
        <div style={{ flexShrink: 0, height: 100, borderTop: '1px solid var(--border)', position: 'relative' }}>
          <span style={{ position: 'absolute', top: 4, left: 8, fontSize: 10, color: '#ffd700', fontFamily: 'var(--text-mono)', zIndex: 1, pointerEvents: 'none' }}>RSI (14)</span>
          <div ref={rsiRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* CDV pane */}
        {indicators.cdv && (
          <div style={{ flexShrink: 0, height: 80, borderTop: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
            <span style={{ position: 'absolute', top: 4, left: 8, fontSize: 10, color: '#00ff88', fontFamily: 'var(--text-mono)', zIndex: 1, pointerEvents: 'none' }}>CDV</span>
            <div ref={cdvRef} style={{ width: '100%', height: '100%' }} />
          </div>
        )}

        {/* Deals panel */}
        {showDeals && (
          <div style={{ flexShrink: 0, maxHeight: 140, overflowY: 'auto', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            {deals.length === 0 ? (
              <div style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: 12 }}>No bulk/block deals found for {nseSym}.</div>
            ) : (
              <table style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Date','Client','Buy/Sell','Qty','Price','Type'].map(h => (
                      <th key={h} style={{ padding: '5px 10px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deals.map((d, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '4px 10px', fontFamily: 'var(--text-mono)', color: 'var(--text-secondary)' }}>{d.date}</td>
                      <td style={{ padding: '4px 10px', color: 'var(--text-primary)' }}>{d.client}</td>
                      <td style={{ padding: '4px 10px', color: d.buySell?.toLowerCase().includes('buy') ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{d.buySell}</td>
                      <td style={{ padding: '4px 10px', fontFamily: 'var(--text-mono)' }}>{Number(d.qty).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '4px 10px', fontFamily: 'var(--text-mono)' }}>₹{d.price}</td>
                      <td style={{ padding: '4px 10px' }}>
                        <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 3, background: d.type === 'bulk' ? '#00aaff33' : '#ffd70033', color: d.type === 'bulk' ? '#00aaff' : '#ffd700' }}>{d.type}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
