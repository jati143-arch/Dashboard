import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { signalsApi } from '../../api/client.js';

// Convert app symbol format → TradingView symbol format
function toTvSymbol(symbol) {
  if (!symbol) return 'AAPL';
  if (symbol.endsWith('.NS')) return `NSE:${symbol.slice(0, -3)}`;
  if (symbol.endsWith('.BO')) return `BSE:${symbol.slice(0, -3)}`;
  if (symbol.includes('-')) {
    const base = symbol.split('-')[0].toUpperCase();
    return `BINANCE:${base}USDT`;
  }
  return symbol;
}

function tzFor(symbol) {
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return 'Asia/Kolkata';
  return 'Etc/UTC';
}

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

function SignalPanel({ symbol }) {
  const [open, setOpen] = useState(true);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['signals', symbol],
    queryFn: () => signalsApi.get(symbol),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const s = SIG_STYLE[data?.signal] || SIG_STYLE['NEUTRAL'];

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
      {/* Collapsible header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{open ? '▼' : '▲'}</span>
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

            {/* Reasons */}
            <div style={{ marginTop: 10 }}>
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
          </div>

          {/* RIGHT: SL / Targets + indicator strip */}
          <div>
            {/* Entry / SL */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
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

            {/* Targets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
              {data.targets.map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 5, padding: '5px 10px' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.label}</span>
                  <span style={{ fontFamily: 'var(--text-mono)', fontSize: 12, fontWeight: 600, color: '#00ff88' }}>
                    {t.price} <span style={{ fontSize: 10, opacity: 0.8 }}>(+{t.pct}%)</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Indicator strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {[
                { label: 'EMA 9',  val: data.indicators.ema9  },
                { label: 'EMA 20', val: data.indicators.ema20 },
                { label: 'SMA 50', val: data.indicators.sma50 },
                { label: 'RSI 14', val: data.indicators.rsi, suffix: '', color: data.indicators.rsi > 70 ? '#ff3355' : data.indicators.rsi < 30 ? '#ffd700' : '#00ff88' },
                { label: 'ATR 14', val: data.indicators.atr  },
                { label: 'Vol ×',  val: data.indicators.volRatio, decimals: 1 },
              ].map(({ label, val, suffix = '', color, decimals = 2 }) => (
                <div key={label} style={{ background: 'var(--bg-base)', borderRadius: 5, padding: '5px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--text-mono)', fontSize: 11, fontWeight: 600, color: color || 'var(--text-primary)', marginTop: 2 }}>
                    {val != null ? Number(val).toFixed(decimals) : '—'}{suffix}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

let widgetCounter = 0;

export default function ChartModal({ symbol, entryPrice, onClose }) {
  const tvSymbol = toTvSymbol(symbol);
  const containerId = useRef(`tv_chart_${++widgetCounter}`).current;
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function createWidget() {
      if (typeof window.TradingView === 'undefined') return;
      el.innerHTML = `<div id="${containerId}" style="height:100%"></div>`;
      new window.TradingView.widget({
        autosize:            true,
        symbol:              tvSymbol,
        interval:            'D',
        timezone:            tzFor(symbol),
        theme:               'dark',
        style:               '1',
        locale:              'en',
        enable_publishing:   false,
        withdateranges:      true,
        hide_side_toolbar:   false,
        allow_symbol_change: false,
        save_image:          false,
        container_id:        containerId,
        studies: [
          'RSI@tv-basicstudies',
          'MAExp@tv-basicstudies',
          'MACD@tv-basicstudies',
        ],
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
        script.id = 'tv-script';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = createWidget;
        document.head.appendChild(script);
      } else {
        existing.addEventListener('load', createWidget);
        if (window.TradingView) createWidget();
      }
    }

    return () => { if (el) el.innerHTML = ''; };
  }, [tvSymbol, containerId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>{symbol}</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{tvSymbol}</span>
          {entryPrice != null && (
            <span style={{ fontSize: 11, background: 'rgba(0,255,136,0.12)', color: 'var(--green)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 4, padding: '2px 8px', fontFamily: 'var(--text-mono)' }}>
              Entry @ {entryPrice}
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 6, padding: '4px 10px', fontSize: 13 }}>✕</button>
      </div>

      {/* TradingView chart */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />

      {/* Signal analysis panel */}
      <SignalPanel symbol={symbol} />
    </div>
  );
}
