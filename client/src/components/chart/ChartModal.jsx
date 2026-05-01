import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { signalsApi, chartApi } from '../../api/client.js';
import { speakSignal } from '../../utils/speakSignal.js';
import { toTvSymbol } from '../../utils/tvSymbol.js';


// Signal colour palette
const SIG_STYLE = {
  'STRONG BUY':  { bg: 'rgba(0,255,136,0.15)', color: '#00ff88', border: 'rgba(0,255,136,0.4)' },
  'BUY':         { bg: 'rgba(0,220,100,0.12)',  color: '#00dc64', border: 'rgba(0,220,100,0.35)' },
  'WEAK BUY':    { bg: 'rgba(80,200,120,0.1)',  color: '#50c878', border: 'rgba(80,200,120,0.3)' },
  'NEUTRAL':     { bg: 'rgba(120,120,120,0.1)', color: '#aaa',    border: 'rgba(150,150,150,0.3)' },
  'WEAK SELL':   { bg: 'rgba(255,120,80,0.1)',  color: '#ff7850', border: 'rgba(255,120,80,0.3)' },
  'SELL':        { bg: 'rgba(255,80,60,0.12)',  color: '#ff503c', border: 'rgba(255,80,60,0.35)' },
  'STRONG SELL': { bg: 'rgba(255,51,85,0.15)',  color: '#ff3355', border: 'rgba(255,51,85,0.4)' },
};

function ScoreBar({ score, max = 8 }) {
  const pct = Math.round(((score + max) / (max * 2)) * 100);
  const color = score > 2 ? '#00ff88' : score < -2 ? '#ff3355' : '#ffd700';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
        {score > 0 ? '+' : ''}{score} / {max}
      </span>
    </div>
  );
}

function SectionToggle({ label, open, onToggle }) {
  return (
    <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 0', userSelect: 'none' }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{open ? '▼' : '▶'}</span>
    </div>
  );
}

function SignalPanel({ symbol }) {
  const [open, setOpen] = useState(true);
  const [showReasons, setShowReasons] = useState(true);
  const [showSLTargets, setShowSLTargets] = useState(true);
  const [showIndicators, setShowIndicators] = useState(true);
  const [showSmartMoney, setShowSmartMoney] = useState(true);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['signals', symbol],
    queryFn: () => signalsApi.get(symbol),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const s = SIG_STYLE[data?.signal] || SIG_STYLE['NEUTRAL'];
  const hasLux = data?.lux && (data.lux.sfp || data.lux.bsl || data.lux.ssl || data.lux.bullOB || data.lux.bearOB);

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
      {/* Collapsible header */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div
          onClick={() => setOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ◈ Signal Analysis
          </span>
          {data && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
              {data.signal}
            </span>
          )}
          {isLoading && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Analysing…</span>}
          {isError && <span style={{ fontSize: 11, color: 'var(--red)' }}>Failed to load</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {data && (
            <button
              onClick={e => { e.stopPropagation(); speakSignal(data, symbol); }}
              title="Read signal aloud"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-dim)', padding: '2px 4px', lineHeight: 1 }}
            >🔊</button>
          )}
          <span onClick={() => setOpen(o => !o)} style={{ fontSize: 12, color: 'var(--text-dim)' }}>{open ? '▼' : '▲'}</span>
        </div>
      </div>

      {open && data && (
        <div style={{ padding: '0 16px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* LEFT: signal + reasons */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--text-mono)', fontSize: 20, fontWeight: 700, color: s.color }}>{data.signal}</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Confidence: {data.confidence}</span>
            </div>
            <ScoreBar score={data.score} max={data.maxScore} />

            {/* Reasons — toggleable */}
            <div style={{ marginTop: 8 }}>
              <SectionToggle label="Reasons" open={showReasons} onToggle={() => setShowReasons(o => !o)} />
              {showReasons && (
                <div style={{ marginTop: 4 }}>
                  {data.reasons.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      <span style={{ color: data.isBuy ? '#00ff88' : '#ff3355', flexShrink: 0 }}>{data.isBuy ? '✓' : '✗'}</span>
                      <span>{r}</span>
                    </div>
                  ))}
                  {data.risks.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Risks / Counter</div>
                      {data.risks.slice(0, 2).map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          <span style={{ color: '#ffd700', flexShrink: 0 }}>⚠</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Smart Money — toggleable, only shown when lux data present */}
            {hasLux && (
              <div style={{ marginTop: 10 }}>
                <SectionToggle label="◈ Smart Money" open={showSmartMoney} onToggle={() => setShowSmartMoney(o => !o)} />
                {showSmartMoney && (
                  <div style={{ marginTop: 4, padding: '6px 8px', background: 'var(--bg-base)', borderRadius: 5, fontSize: 11 }}>
                    {data.lux.sfp && (
                      <div style={{ color: data.lux.sfp === 'bullish' ? '#00ff88' : '#ff3355', marginBottom: 3 }}>
                        SFP: {data.lux.sfp} — stop hunt detected
                      </div>
                    )}
                    {data.lux.bsl && (
                      <div style={{ color: '#ff7850', marginBottom: 3 }}>BSL (equal highs): {data.lux.bsl}</div>
                    )}
                    {data.lux.ssl && (
                      <div style={{ color: '#00ccff', marginBottom: 3 }}>SSL (equal lows): {data.lux.ssl}</div>
                    )}
                    {data.lux.bullOB && (
                      <div style={{ color: '#00ff88', marginBottom: 3 }}>Bull OB: {data.lux.bullOB.bottom}–{data.lux.bullOB.top}</div>
                    )}
                    {data.lux.bearOB && (
                      <div style={{ color: '#ff3355' }}>Bear OB: {data.lux.bearOB.bottom}–{data.lux.bearOB.top}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: SL / Targets + indicator strip */}
          <div>
            {/* SL / Targets — toggleable */}
            <SectionToggle label="SL & Targets" open={showSLTargets} onToggle={() => setShowSLTargets(o => !o)} />
            {showSLTargets && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8, marginTop: 4 }}>
                  <div style={{ background: 'var(--bg-base)', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Current Price</div>
                    <div style={{ fontFamily: 'var(--text-mono)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{data.price}</div>
                  </div>
                  <div style={{ background: 'rgba(255,51,85,0.08)', border: '1px solid rgba(255,51,85,0.2)', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Stop Loss</div>
                    <div style={{ fontFamily: 'var(--text-mono)', fontSize: 14, fontWeight: 700, color: '#ff3355' }}>
                      {data.sl} <span style={{ fontSize: 10, opacity: 0.8 }}>({data.slPct}%)</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                  {data.targets.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 5, padding: '5px 10px' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.label}</span>
                      <span style={{ fontFamily: 'var(--text-mono)', fontSize: 12, fontWeight: 600, color: '#00ff88' }}>
                        {t.price} <span style={{ fontSize: 10, opacity: 0.8 }}>(+{t.pct}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Indicator strip — toggleable */}
            <SectionToggle label="Indicators" open={showIndicators} onToggle={() => setShowIndicators(o => !o)} />
            {showIndicators && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 4 }}>
                {[
                  { label: 'EMA 9',  val: data.indicators.ema9  },
                  { label: 'EMA 20', val: data.indicators.ema20 },
                  { label: 'SMA 50', val: data.indicators.sma50 },
                  { label: 'RSI 14', val: data.indicators.rsi, color: data.indicators.rsi > 70 ? '#ff3355' : data.indicators.rsi < 30 ? '#ffd700' : '#00ff88' },
                  { label: 'ATR 14', val: data.indicators.atr  },
                  { label: 'Vol ×',  val: data.indicators.volRatio, decimals: 1 },
                ].map(({ label, val, color, decimals = 2 }) => (
                  <div key={label} style={{ background: 'var(--bg-base)', borderRadius: 5, padding: '5px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--text-mono)', fontSize: 11, fontWeight: 600, color: color || 'var(--text-primary)', marginTop: 2 }}>
                      {val != null ? Number(val).toFixed(decimals) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ── Timeframe options ─────────────────────────────────────────────────────────

const RANGES = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y'  },
  { label: '2Y', value: '2y'  },
];

// ── Main modal ────────────────────────────────────────────────────────────────

export default function ChartModal({ symbol, entryPrice, onClose }) {
  const tvSymbol = toTvSymbol(symbol);
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [range, setRange] = useState('6mo');

  const { data: candles, isLoading, isError } = useQuery({
    queryKey: ['chart', symbol, range],
    queryFn: () => chartApi.ohlcv(symbol, range),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  // Build / rebuild chart whenever candle data changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    if (!candles?.length) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { color: '#141414' }, textColor: '#888' },
      grid: { vertLines: { color: '#1e1e1e' }, horzLines: { color: '#1e1e1e' } },
      rightPriceScale: { borderColor: '#2a2a2a' },
      timeScale: { borderColor: '#2a2a2a', timeVisible: false },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#00ff88', downColor: '#ff3355',
      borderVisible: false,
      wickUpColor: '#00ff88', wickDownColor: '#ff3355',
    });

    series.setData(candles);

    if (entryPrice != null) {
      series.createPriceLine({
        price: entryPrice,
        color: '#ffd700',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Entry',
      });
    }

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, entryPrice]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>{symbol}</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{tvSymbol}</span>
          <a
            href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 10, color: 'var(--text-dim)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap' }}
            title="Open in TradingView"
          >↗ TV</a>
          {entryPrice != null && (
            <span style={{ fontSize: 11, background: 'rgba(0,255,136,0.12)', color: 'var(--green)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 4, padding: '2px 8px', fontFamily: 'var(--text-mono)', whiteSpace: 'nowrap' }}>
              Entry @ {entryPrice}
            </span>
          )}
        </div>
        {/* Timeframe selector */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              style={{
                background: range === r.value ? 'var(--accent)' : 'none',
                color: range === r.value ? '#000' : 'var(--text-dim)',
                border: `1px solid ${range === r.value ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--text-mono)',
              }}
            >{r.label}</button>
          ))}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 6, padding: '4px 10px', fontSize: 13, flexShrink: 0 }}>✕</button>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {isLoading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 14, zIndex: 1 }}>
            Loading chart…
          </div>
        )}
        {isError && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, zIndex: 1 }}>
            <span style={{ color: 'var(--red)', fontSize: 14 }}>Failed to load chart data</span>
            <a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)' }}>Open on TradingView instead ↗</a>
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Signal analysis panel */}
      <SignalPanel symbol={symbol} />
    </div>
  );
}
