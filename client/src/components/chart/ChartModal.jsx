import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createChart, CrosshairMode, LineStyle,
  CandlestickSeries, LineSeries, HistogramSeries,
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

// --- SMC detection ---
function detectOrderBlocks(candles, count = 5) {
  const obs = [];
  for (let i = 1; i < candles.length - 4; i++) {
    const fwd = candles.slice(i + 1, i + 4);
    if (candles[i].close < candles[i].open && fwd.every(c => c.close > candles[i].high))
      obs.push({ type: 'bullish', time: candles[i].time, top: candles[i].open, bottom: candles[i].close });
    if (candles[i].close > candles[i].open && fwd.every(c => c.close < candles[i].low))
      obs.push({ type: 'bearish', time: candles[i].time, top: candles[i].close, bottom: candles[i].open });
  }
  return obs.slice(-count);
}

function detectFVG(candles, count = 6) {
  const fvgs = [];
  for (let i = 1; i < candles.length - 1; i++) {
    if (candles[i - 1].high < candles[i + 1].low)
      fvgs.push({ type: 'bull', time: candles[i].time, top: candles[i + 1].low, bottom: candles[i - 1].high });
    if (candles[i - 1].low > candles[i + 1].high)
      fvgs.push({ type: 'bear', time: candles[i].time, top: candles[i - 1].low, bottom: candles[i + 1].high });
  }
  return fvgs.slice(-count);
}

// Intraday quick-access buttons
const INTRADAY_BTNS = [
  { value: '1m',  label: '1 Min' },
  { value: '2m',  label: '2 Min' },
  { value: '5m',  label: '5 Min' },
  { value: '15m', label: '15 Min' },
];

// All timeframes for the "More" dropdown
const MORE_RANGES = [
  { value: '30m', label: '30 Min' },
  { value: '1h',  label: '1 Hour' },
  { value: '3mo', label: '3 Months' },
  { value: '6mo', label: '6 Months' },
  { value: '1y',  label: '1 Year' },
  { value: '2y',  label: '2 Years' },
  { value: '5y',  label: '5 Years' },
];

const ALL_RANGES = [...INTRADAY_BTNS, ...MORE_RANGES];

const DARK_OPTS = {
  layout:    { background: { color: '#141414' }, textColor: '#888888' },
  grid:      { vertLines: { color: '#1e1e1e' }, horzLines: { color: '#1e1e1e' } },
  crosshair: { mode: CrosshairMode.Normal },
};

export default function ChartModal({ symbol, entryPrice, onClose }) {
  const [range, setRange]         = useState('1y');
  const [showSmc, setShowSmc]     = useState(true);
  const [showDeals, setShowDeals] = useState(false);

  const mainRef   = useRef(null);
  const rsiRef    = useRef(null);
  const mainChart = useRef(null);
  const rsiChart  = useRef(null);

  const nseSym = symbol.replace(/\.(NS|BO)$/, '');
  const currentLabel = ALL_RANGES.find(r => r.value === range)?.label || range;
  const isMoreRange  = MORE_RANGES.some(r => r.value === range);

  const { data: candles = [], isLoading } = useQuery({
    queryKey: ['chart', symbol, range],
    queryFn:  () => chartApi.ohlcv(symbol, range),
    staleTime: 5 * 60_000,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['nse-deals', nseSym],
    queryFn:  () => nseApi.deals(nseSym),
    enabled:  showDeals,
    staleTime: 60 * 60_000,
  });

  useEffect(() => {
    if (!candles.length || !mainRef.current || !rsiRef.current) return;

    if (mainChart.current) { mainChart.current.remove(); mainChart.current = null; }
    if (rsiChart.current)  { rsiChart.current.remove();  rsiChart.current  = null; }

    const closes = candles.map(c => c.close);
    const times  = candles.map(c => c.time);

    // ── Main chart ──────────────────────────────────────────
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

    [
      { values: calcEMA(closes, 9),  color: '#00aaff', title: '9 EMA' },
      { values: calcEMA(closes, 20), color: '#ffa500', title: '20 EMA' },
      { values: calcSMA(closes, 50), color: '#aa44ff', title: '50 SMA' },
    ].forEach(({ values, color, title }) => {
      const s = main.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: true, title });
      s.setData(values.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean));
    });

    if (entryPrice != null) {
      cs.createPriceLine({
        price: entryPrice, color: '#00ff88', lineWidth: 1,
        lineStyle: LineStyle.Dashed, axisLabelVisible: true,
        title: `Entry @ ${entryPrice}`,
      });
    }

    if (showSmc) {
      detectOrderBlocks(candles).forEach(ob => {
        const color = ob.type === 'bullish' ? '#00ff88' : '#ff3355';
        cs.createPriceLine({ price: ob.top,    color, lineWidth: 1, lineStyle: LineStyle.Solid,  title: ob.type === 'bullish' ? 'OB↑' : 'OB↓', axisLabelVisible: false });
        cs.createPriceLine({ price: ob.bottom, color, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false });
      });
      detectFVG(candles).forEach(fvg => {
        const color = fvg.type === 'bull' ? '#ffd700' : '#ff6666';
        cs.createPriceLine({ price: fvg.top,    color, lineWidth: 1, lineStyle: LineStyle.Dotted, title: fvg.type === 'bull' ? 'FVG↑' : 'FVG↓', axisLabelVisible: false });
        cs.createPriceLine({ price: fvg.bottom, color, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false });
      });
    }

    // ── RSI chart ────────────────────────────────────────────
    const rsi = createChart(rsiRef.current, {
      ...DARK_OPTS,
      width:  rsiRef.current.clientWidth,
      height: rsiRef.current.clientHeight,
      timeScale: { borderColor: '#2a2a2a', visible: false },
      rightPriceScale: { borderColor: '#2a2a2a', scaleMargins: { top: 0.1, bottom: 0.1 } },
    });
    rsiChart.current = rsi;

    const rsiValues = calcRSI(closes, 14);
    const rsiLine = rsi.addSeries(LineSeries, { color: '#ffd700', lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
    rsiLine.setData(rsiValues.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean));
    rsiLine.createPriceLine({ price: 70, color: '#ff3355', lineWidth: 1, lineStyle: LineStyle.Dotted, title: '70', axisLabelVisible: true });
    rsiLine.createPriceLine({ price: 30, color: '#00ff88', lineWidth: 1, lineStyle: LineStyle.Dotted, title: '30', axisLabelVisible: true });
    rsiLine.createPriceLine({ price: 50, color: '#444444', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false });

    main.timeScale().subscribeVisibleLogicalRangeChange(r => {
      if (r) rsi.timeScale().setVisibleLogicalRange(r);
    });
    main.timeScale().fitContent();

    return () => {
      if (mainChart.current) { mainChart.current.remove(); mainChart.current = null; }
      if (rsiChart.current)  { rsiChart.current.remove();  rsiChart.current  = null; }
    };
  }, [candles, entryPrice, showSmc]);

  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (mainChart.current && mainRef.current) mainChart.current.applyOptions({ width: mainRef.current.clientWidth, height: mainRef.current.clientHeight });
      if (rsiChart.current  && rsiRef.current)  rsiChart.current.applyOptions({ width: rsiRef.current.clientWidth,  height: rsiRef.current.clientHeight });
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

  const btnStyle = (active) => ({
    padding: '3px 9px', fontSize: 11, borderRadius: 4, cursor: 'pointer', fontWeight: 600,
    border: active ? 'none' : '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#000' : 'var(--text-dim)',
  });

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8,
        width: 'min(98vw, 1200px)', height: 'min(92vh, 800px)',
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

          {/* Intraday quick buttons */}
          <div style={{ display: 'flex', gap: 3, marginLeft: 6 }}>
            {INTRADAY_BTNS.map(r => (
              <button key={r.value} onClick={() => setRange(r.value)} style={btnStyle(range === r.value)}>
                {r.label}
              </button>
            ))}
          </div>

          {/* More dropdown (30min, 1H, and all daily+) */}
          <select
            value={isMoreRange ? range : ''}
            onChange={e => { if (e.target.value) setRange(e.target.value); }}
            style={{
              background: isMoreRange ? 'var(--accent)' : 'var(--bg-card)',
              color: isMoreRange ? '#000' : 'var(--text-dim)',
              border: '1px solid var(--border)', borderRadius: 4,
              fontSize: 11, fontWeight: 600, padding: '3px 6px', cursor: 'pointer',
            }}
          >
            <option value="" disabled>{isMoreRange ? currentLabel : 'More ▾'}</option>
            <optgroup label="─ Intraday ─">
              <option value="30m">30 Min</option>
              <option value="1h">1 Hour</option>
            </optgroup>
            <optgroup label="─ Daily & Above ─">
              <option value="3mo">3 Months</option>
              <option value="6mo">6 Months</option>
              <option value="1y">1 Year</option>
              <option value="2y">2 Years</option>
              <option value="5y">5 Years</option>
            </optgroup>
          </select>

          {/* Right controls */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <button onClick={() => setShowSmc(v => !v)} style={{
              padding: '3px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer', fontWeight: 600,
              border: showSmc ? 'none' : '1px solid var(--border)',
              background: showSmc ? '#aa44ff' : 'transparent',
              color: showSmc ? '#fff' : 'var(--text-dim)',
            }}>SMC</button>
            <button onClick={() => setShowDeals(v => !v)} style={{
              padding: '3px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer', fontWeight: 600,
              border: showDeals ? 'none' : '1px solid var(--border)',
              background: showDeals ? 'var(--accent)' : 'transparent',
              color: showDeals ? '#000' : 'var(--text-dim)',
            }}>Deals</button>
            <button onClick={onClose} style={{
              background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)',
              borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 13,
            }}>✕</button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, padding: '4px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
          {[['9 EMA', '#00aaff'], ['20 EMA', '#ffa500'], ['50 SMA', '#aa44ff'], ['RSI(14)', '#ffd700']].map(([l, c]) => (
            <span key={l} style={{ fontSize: 10, color: c, fontFamily: 'var(--text-mono)' }}>▬ {l}</span>
          ))}
          {showSmc && <>
            <span style={{ fontSize: 10, color: '#00ff88', fontFamily: 'var(--text-mono)' }}>▬ OB↑</span>
            <span style={{ fontSize: 10, color: '#ff3355', fontFamily: 'var(--text-mono)' }}>▬ OB↓</span>
            <span style={{ fontSize: 10, color: '#ffd700', fontFamily: 'var(--text-mono)' }}>▬ FVG</span>
          </>}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--text-mono)' }}>
            {currentLabel}
          </span>
        </div>

        {/* Main chart */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {isLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', zIndex: 2, background: '#141414' }}>
              Loading {currentLabel} chart…
            </div>
          )}
          <div ref={mainRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* RSI pane */}
        <div style={{ flexShrink: 0, height: 100, borderTop: '1px solid var(--border)', position: 'relative' }}>
          <span style={{ position: 'absolute', top: 4, left: 8, fontSize: 10, color: '#ffd700', fontFamily: 'var(--text-mono)', zIndex: 1, pointerEvents: 'none' }}>RSI (14)</span>
          <div ref={rsiRef} style={{ width: '100%', height: '100%' }} />
        </div>

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
