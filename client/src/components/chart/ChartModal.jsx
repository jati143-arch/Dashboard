import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { signalsApi, searchApi, chartApi } from '../../api/client.js';
import { speakSignal } from '../../utils/speakSignal.js';
import { toTvSymbol, tvTimezone } from '../../utils/tvSymbol.js';


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
                {/* Entry suggestion row */}
                {data.entryType && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8, marginTop: 4 }}>
                    <div style={{ background: 'var(--bg-base)', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Entry Type</div>
                      <div style={{
                        fontSize: 10, fontWeight: 700,
                        color: data.entryType.includes('Breakout') || data.entryType.includes('Breakdown') ? '#00ff88'
                             : data.entryType.includes('Market') ? '#aaa'
                             : '#ffd700',
                      }}>{data.entryType}</div>
                    </div>
                    <div style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Suggested Entry</div>
                      <div style={{ fontFamily: 'var(--text-mono)', fontSize: 13, fontWeight: 700, color: '#ffd700' }}>{data.suggestedEntry}</div>
                    </div>
                    <div style={{ background: 'var(--bg-base)', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Position Size</div>
                      <div style={{
                        fontSize: 10, fontWeight: 700,
                        color: data.positionSize === 'Full' ? '#00ff88'
                             : data.positionSize?.includes('75') ? '#00ccff'
                             : '#ffd700',
                      }}>{data.positionSize}</div>
                    </div>
                  </div>
                )}
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

// ── Lightweight Charts fallback (Yahoo Finance OHLCV data) ────────────────────

const INTRADAY_RANGES  = ['1m', '2m', '5m', '15m', '30m', '1h', '2h', '4h', '12h'];
const MULTIDAY_RANGES  = ['1d', '2d', '3d', '4d', '5d', '6d'];
const SWING_RANGES     = ['1w', '2w', '1mo', '2mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'max'];
// Ranges that use date-only timestamps — hide the time part on the X-axis
const DATE_ONLY_RANGES = new Set(['1w','2w','1mo','2mo','3mo','6mo','1y','2y','5y','10y','max']);

function LightweightChart({ symbol, entryPrice }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const [range, setRange] = useState('1y');

  const { data: candles = [], isLoading, isError } = useQuery({
    queryKey: ['ohlcv', symbol, range],
    queryFn: () => chartApi.ohlcv(symbol, range),
    staleTime: 5 * 60_000,
  });

  // Reuse the same query key as SignalPanel — React Query deduplicates the fetch
  const { data: sig } = useQuery({
    queryKey: ['signals', symbol],
    queryFn: () => signalsApi.get(symbol),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !candles.length) return;

    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const chart = createChart(el, {
      layout: { background: { color: '#141414' }, textColor: '#c0c0c0' },
      grid: { vertLines: { color: '#1e1e1e' }, horzLines: { color: '#1e1e1e' } },
      timeScale: { borderColor: '#2a2a2a', timeVisible: !DATE_ONLY_RANGES.has(range) },
      rightPriceScale: { borderColor: '#2a2a2a' },
      crosshair: { mode: 1 },
      width: el.clientWidth,
      height: el.clientHeight || 400,
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor:         '#00ff88',
      downColor:       '#ff3355',
      borderUpColor:   '#00ff88',
      borderDownColor: '#ff3355',
      wickUpColor:     '#00ff88',
      wickDownColor:   '#ff3355',
    });
    series.setData(candles);

    // ── Price lines ───────────────────────────────────────────────────────────
    if (sig) {
      // Stop loss — red dashed
      if (sig.sl) series.createPriceLine({
        price: sig.sl, color: '#ff3355', lineWidth: 1, lineStyle: 2,
        title: `SL  −${sig.slPct}%`,
      });
      // Take profit targets — green dashed
      (sig.targets || []).forEach(t => series.createPriceLine({
        price: t.price, color: '#00ff88', lineWidth: 1, lineStyle: 2,
        title: t.label,
      }));
      // Suggested signal entry — yellow solid
      if (sig.suggestedEntry) series.createPriceLine({
        price: sig.suggestedEntry, color: '#ffd700', lineWidth: 2, lineStyle: 0,
        title: `▶ ${sig.entryType}`,
      });
    }
    // Actual trade entry — cyan solid
    if (entryPrice != null) series.createPriceLine({
      price: entryPrice, color: '#00ccff', lineWidth: 2, lineStyle: 0,
      title: 'Your Entry',
    });

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (chartRef.current) chartRef.current.resize(width, height);
    });
    ro.observe(el);

    return () => { ro.disconnect(); if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; } };
  }, [candles, sig, entryPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  function RangeBtn({ r }) {
    const active = range === r;
    return (
      <button
        onClick={() => setRange(r)}
        style={{
          background: active ? 'var(--accent-dim)' : 'none',
          border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
          color: active ? 'var(--accent)' : 'var(--text-secondary)',
          padding: '2px 7px', borderRadius: 4, cursor: 'pointer', fontSize: 11,
        }}
      >{r}</button>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Timeframe selector — three rows */}
      <div style={{ padding: '5px 12px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--text-dim)', width: 52, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Intraday</span>
          {INTRADAY_RANGES.map(r => <RangeBtn key={r} r={r} />)}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--text-dim)', width: 52, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Days</span>
          {MULTIDAY_RANGES.map(r => <RangeBtn key={r} r={r} />)}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, color: 'var(--text-dim)', width: 52, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Swing</span>
          {SWING_RANGES.map(r => <RangeBtn key={r} r={r} />)}
          <span style={{ fontSize: 9, color: 'var(--text-dim)', marginLeft: 6 }}>Yahoo Finance</span>
        </div>
      </div>
      {isLoading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
          Loading chart data…
        </div>
      )}
      {isError && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', fontSize: 13 }}>
          Failed to load chart data
        </div>
      )}
      {!isLoading && !isError && candles.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
          No chart data available
        </div>
      )}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, display: (!isLoading && !isError && candles.length > 0) ? 'block' : 'none' }} />
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

let widgetSeq = 0;

export default function ChartModal({ symbol, entryPrice, onClose }) {
  const tvSymbol    = toTvSymbol(symbol);
  const containerId = useRef(`tv_chart_${++widgetSeq}`).current;
  const containerRef = useRef(null);
  const [chartMode, setChartMode] = useState('checking'); // 'checking' | 'tv' | 'lightweight'

  // Check TradingView availability for this symbol
  useEffect(() => {
    const ticker = tvSymbol.includes(':') ? tvSymbol.split(':')[1] : tvSymbol;
    searchApi.tv(ticker)
      .then(results => {
        const found = results.some(r => r.tvSymbol?.toUpperCase() === tvSymbol.toUpperCase());
        setChartMode(found ? 'tv' : 'lightweight');
      })
      .catch(() => setChartMode('lightweight'));
  }, [tvSymbol]);

  // TradingView widget — only created when mode is 'tv'
  useEffect(() => {
    if (chartMode !== 'tv') return;
    const el = containerRef.current;
    if (!el) return;

    function createWidget() {
      if (!window.TradingView) return;
      el.innerHTML = `<div id="${containerId}" style="height:100%"></div>`;
      new window.TradingView.widget({
        autosize:            true,
        symbol:              tvSymbol,
        interval:            'D',
        timezone:            tvTimezone(symbol),
        theme:               'dark',
        style:               '1',
        locale:              'en',
        enable_publishing:   false,
        withdateranges:      true,
        hide_side_toolbar:   false,
        allow_symbol_change: true,
        save_image:          false,
        container_id:        containerId,
        studies: ['RSI@tv-basicstudies', 'MAExp@tv-basicstudies', 'MACD@tv-basicstudies'],
        overrides: {
          'paneProperties.background':               '#141414',
          'paneProperties.backgroundType':           'solid',
          'paneProperties.vertGridProperties.color': '#1e1e1e',
          'paneProperties.horzGridProperties.color': '#1e1e1e',
        },
      });
    }

    if (window.TradingView) {
      createWidget();
    } else {
      const existing = document.getElementById('tv-script');
      if (!existing) {
        const script = document.createElement('script');
        script.id    = 'tv-script';
        script.src   = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = createWidget;
        document.head.appendChild(script);
      } else {
        existing.addEventListener('load', createWidget, { once: true });
        if (window.TradingView) createWidget();
      }
    }

    return () => { if (el) el.innerHTML = ''; };
  }, [chartMode, tvSymbol, containerId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const modeBadge = {
    checking:    { bg: 'var(--bg-base)',              color: 'var(--text-dim)',    label: 'Checking…'    },
    tv:          { bg: 'rgba(0,255,136,0.12)',         color: 'var(--green)',       label: 'TradingView'  },
    lightweight: { bg: 'rgba(255,215,0,0.12)',         color: 'var(--yellow)',      label: 'Yahoo Charts' },
  }[chartMode];

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>{symbol}</span>
          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: modeBadge.bg, color: modeBadge.color }}>
            {modeBadge.label}
          </span>
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
        <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 6, padding: '4px 10px', fontSize: 13, flexShrink: 0 }}>✕</button>
      </div>

      {/* Chart area */}
      {chartMode === 'checking' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
          Checking chart availability…
        </div>
      )}
      {chartMode === 'tv' && (
        <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
      )}
      {chartMode === 'lightweight' && (
        <LightweightChart symbol={symbol} entryPrice={entryPrice} />
      )}

      {/* Signal analysis panel */}
      <SignalPanel symbol={symbol} />
    </div>
  );
}
