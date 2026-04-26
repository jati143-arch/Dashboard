import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
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
    const isBearish = candles[i].close < candles[i].open;
    const isBullish = candles[i].close > candles[i].open;
    const fwd = candles.slice(i + 1, i + 4);
    const upMove   = fwd.every(c => c.close > candles[i].high);
    const downMove = fwd.every(c => c.close < candles[i].low);
    if (isBearish && upMove)   obs.push({ type: 'bullish', time: candles[i].time, top: candles[i].open,  bottom: candles[i].close });
    if (isBullish && downMove) obs.push({ type: 'bearish', time: candles[i].time, top: candles[i].close, bottom: candles[i].open  });
  }
  return obs.slice(-count);
}

function detectFVG(candles, count = 6) {
  const fvgs = [];
  for (let i = 1; i < candles.length - 1; i++) {
    const bullFVG = candles[i - 1].high < candles[i + 1].low;
    const bearFVG = candles[i - 1].low  > candles[i + 1].high;
    if (bullFVG) fvgs.push({ type: 'bull', time: candles[i].time, top: candles[i + 1].low,  bottom: candles[i - 1].high });
    if (bearFVG) fvgs.push({ type: 'bear', time: candles[i].time, top: candles[i - 1].low,  bottom: candles[i + 1].high });
  }
  return fvgs.slice(-count);
}

// --- Chart options ---
const DARK = {
  layout:    { background: { color: '#141414' }, textColor: '#888888' },
  grid:      { vertLines: { color: '#1e1e1e' }, horzLines: { color: '#1e1e1e' } },
  crosshair: { mode: CrosshairMode.Normal },
};

const RANGES = ['1mo', '3mo', '6mo', '1y', '2y'];

export default function ChartModal({ symbol, entryPrice, onClose }) {
  const [range, setRange]       = useState('6mo');
  const [showSmc, setShowSmc]   = useState(true);
  const [showDeals, setShowDeals] = useState(false);

  const mainRef = useRef(null);
  const rsiRef  = useRef(null);
  const charts  = useRef({ main: null, rsi: null });

  const nseSym = symbol.replace(/\.(NS|BO)$/, '');

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

  // Build and sync both charts whenever candles or SMC toggle changes
  useEffect(() => {
    if (!candles.length || !mainRef.current || !rsiRef.current) return;

    // Destroy previous instances
    if (charts.current.main) { charts.current.main.remove(); charts.current.main = null; }
    if (charts.current.rsi)  { charts.current.rsi.remove();  charts.current.rsi  = null; }

    const closes = candles.map(c => c.close);
    const times  = candles.map(c => c.time);

    // ── Main chart ──────────────────────────────────────────
    const main = createChart(mainRef.current, {
      ...DARK,
      width:  mainRef.current.clientWidth,
      height: mainRef.current.clientHeight,
      timeScale: { borderColor: '#2a2a2a', timeVisible: true },
      rightPriceScale: { borderColor: '#2a2a2a' },
    });
    charts.current.main = main;

    // Candlesticks
    const cs = main.addCandlestickSeries({
      upColor:        '#00ff88', downColor:        '#ff3355',
      borderUpColor:  '#00ff88', borderDownColor:  '#ff3355',
      wickUpColor:    '#00ff88', wickDownColor:    '#ff3355',
    });
    cs.setData(candles);

    // Volume histogram (as area series on a separate price scale)
    const vol = main.addHistogramSeries({
      color: '#2a2a2a', priceFormat: { type: 'volume' },
      priceScaleId: 'vol', scaleMargins: { top: 0.8, bottom: 0 },
    });
    vol.setData(candles.map(c => ({
      time: c.time, value: c.volume,
      color: c.close >= c.open ? '#00ff8844' : '#ff335544',
    })));

    // 9 EMA (blue), 20 EMA (orange), 50 SMA (purple)
    const indicators = [
      { values: calcEMA(closes, 9),  color: '#00aaff', title: '9 EMA' },
      { values: calcEMA(closes, 20), color: '#ffa500', title: '20 EMA' },
      { values: calcSMA(closes, 50), color: '#aa44ff', title: '50 SMA' },
    ];
    indicators.forEach(({ values, color, title }) => {
      const s = main.addLineSeries({ color, lineWidth: 1, priceLineVisible: false, lastValueVisible: true, title });
      s.setData(values.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean));
    });

    // Entry price line
    if (entryPrice != null) {
      cs.createPriceLine({
        price: entryPrice, color: '#00ff88', lineWidth: 1,
        lineStyle: LineStyle.Dashed, axisLabelVisible: true,
        title: `Entry @ ${entryPrice}`,
      });
    }

    // SMC overlays
    if (showSmc) {
      detectOrderBlocks(candles).forEach(ob => {
        const color = ob.type === 'bullish' ? '#00ff8833' : '#ff335533';
        const border = ob.type === 'bullish' ? '#00ff88' : '#ff3355';
        // Draw as two price lines (top + bottom of the zone)
        cs.createPriceLine({ price: ob.top,    color: border, lineWidth: 1, lineStyle: LineStyle.Solid, title: ob.type === 'bullish' ? 'OB↑' : 'OB↓', axisLabelVisible: false });
        cs.createPriceLine({ price: ob.bottom, color: border, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false });
      });

      detectFVG(candles).forEach(fvg => {
        const color = fvg.type === 'bull' ? '#ffd70066' : '#ff335566';
        cs.createPriceLine({ price: fvg.top,    color, lineWidth: 1, lineStyle: LineStyle.Dotted, title: fvg.type === 'bull' ? 'FVG↑' : 'FVG↓', axisLabelVisible: false });
        cs.createPriceLine({ price: fvg.bottom, color, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false });
      });
    }

    // ── RSI chart ────────────────────────────────────────────
    const rsiChart = createChart(rsiRef.current, {
      ...DARK,
      width:  rsiRef.current.clientWidth,
      height: rsiRef.current.clientHeight,
      timeScale: { borderColor: '#2a2a2a', visible: false },
      rightPriceScale: { borderColor: '#2a2a2a', scaleMargins: { top: 0.1, bottom: 0.1 } },
    });
    charts.current.rsi = rsiChart;

    const rsiValues = calcRSI(closes, 14);
    const rsiSeries = rsiChart.addLineSeries({ color: '#ffd700', lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
    rsiSeries.setData(rsiValues.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean));
    rsiSeries.createPriceLine({ price: 70, color: '#ff3355', lineWidth: 1, lineStyle: LineStyle.Dotted, title: '70', axisLabelVisible: true });
    rsiSeries.createPriceLine({ price: 30, color: '#00ff88', lineWidth: 1, lineStyle: LineStyle.Dotted, title: '30', axisLabelVisible: true });
    rsiSeries.createPriceLine({ price: 50, color: '#444444', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false });

    // Sync scrolling
    main.timeScale().subscribeVisibleLogicalRangeChange(r => {
      if (r) rsiChart.timeScale().setVisibleLogicalRange(r);
    });

    // Fit content
    main.timeScale().fitContent();

    return () => {
      if (charts.current.main) { charts.current.main.remove(); charts.current.main = null; }
      if (charts.current.rsi)  { charts.current.rsi.remove();  charts.current.rsi  = null; }
    };
  }, [candles, entryPrice, showSmc]);

  // Resize handler
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (charts.current.main && mainRef.current) charts.current.main.resize(mainRef.current.clientWidth, mainRef.current.clientHeight);
      if (charts.current.rsi  && rsiRef.current)  charts.current.rsi.resize(rsiRef.current.clientWidth,   rsiRef.current.clientHeight);
    });
    if (mainRef.current) obs.observe(mainRef.current);
    return () => obs.disconnect();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const nativeCs = symbol.endsWith('.NS') || symbol.endsWith('.BO') ? '₹' : '$';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8,
        width: 'min(98vw, 1200px)', height: 'min(92vh, 780px)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{symbol}</span>
          {entryPrice != null && (
            <span style={{ fontSize: 11, color: 'var(--green)', border: '1px solid var(--green)', borderRadius: 4, padding: '1px 6px' }}>
              Entry {nativeCs}{entryPrice}
            </span>
          )}
          {/* Range buttons */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)} style={{
                padding: '3px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer', fontWeight: 600,
                border: range === r ? 'none' : '1px solid var(--border)',
                background: range === r ? 'var(--accent)' : 'transparent',
                color: range === r ? '#000' : 'var(--text-dim)',
              }}>{r.toUpperCase()}</button>
            ))}
          </div>
          {/* Toggle buttons */}
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
        <div style={{ display: 'flex', gap: 14, padding: '4px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[['9 EMA', '#00aaff'], ['20 EMA', '#ffa500'], ['50 SMA', '#aa44ff'], ['RSI(14)', '#ffd700']].map(([l, c]) => (
            <span key={l} style={{ fontSize: 10, color: c, fontFamily: 'var(--text-mono)' }}>▬ {l}</span>
          ))}
          {showSmc && <>
            <span style={{ fontSize: 10, color: '#00ff88', fontFamily: 'var(--text-mono)' }}>▬ OB (Bull)</span>
            <span style={{ fontSize: 10, color: '#ff3355', fontFamily: 'var(--text-mono)' }}>▬ OB (Bear)</span>
            <span style={{ fontSize: 10, color: '#ffd700', fontFamily: 'var(--text-mono)' }}>▬ FVG</span>
          </>}
        </div>

        {/* Main chart */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {isLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', zIndex: 2 }}>
              Loading chart data…
            </div>
          )}
          <div ref={mainRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* RSI pane */}
        <div style={{ flexShrink: 0, height: 110, borderTop: '1px solid var(--border)', position: 'relative' }}>
          <span style={{ position: 'absolute', top: 4, left: 8, fontSize: 10, color: '#ffd700', fontFamily: 'var(--text-mono)', zIndex: 1, pointerEvents: 'none' }}>RSI (14)</span>
          <div ref={rsiRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Bulk/Block deals panel */}
        {showDeals && (
          <div style={{ flexShrink: 0, maxHeight: 150, overflowY: 'auto', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            {deals.length === 0 ? (
              <div style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: 12 }}>
                No bulk/block deals found for {nseSym} in today's NSE data.
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Date', 'Client', 'Buy/Sell', 'Qty', 'Price', 'Type'].map(h => (
                      <th key={h} style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deals.map((d, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '5px 12px', fontFamily: 'var(--text-mono)', color: 'var(--text-secondary)' }}>{d.date}</td>
                      <td style={{ padding: '5px 12px', color: 'var(--text-primary)' }}>{d.client}</td>
                      <td style={{ padding: '5px 12px' }}>
                        <span style={{ color: d.buySell?.toLowerCase().includes('buy') ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{d.buySell}</span>
                      </td>
                      <td style={{ padding: '5px 12px', fontFamily: 'var(--text-mono)' }}>{Number(d.qty).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '5px 12px', fontFamily: 'var(--text-mono)' }}>₹{d.price}</td>
                      <td style={{ padding: '5px 12px' }}>
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: d.type === 'bulk' ? '#00aaff33' : '#ffd70033', color: d.type === 'bulk' ? '#00aaff' : '#ffd700' }}>{d.type}</span>
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
