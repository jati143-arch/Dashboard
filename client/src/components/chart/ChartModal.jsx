import { useEffect, useRef } from 'react';

// Convert app symbol format → TradingView symbol format
function toTvSymbol(symbol) {
  if (!symbol) return 'AAPL';
  if (symbol.endsWith('.NS')) return `NSE:${symbol.slice(0, -3)}`;
  if (symbol.endsWith('.BO')) return `BSE:${symbol.slice(0, -3)}`;
  // Crypto: BTC-USD → BINANCE:BTCUSDT
  if (symbol.includes('-')) {
    const base = symbol.split('-')[0].toUpperCase();
    return `BINANCE:${base}USDT`;
  }
  return symbol;
}

// Determine default timezone based on symbol
function tzFor(symbol) {
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return 'Asia/Kolkata';
  return 'Etc/UTC';
}

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
      // Clear any previous widget
      el.innerHTML = `<div id="${containerId}" style="height:100%"></div>`;
      new window.TradingView.widget({
        autosize:           true,
        symbol:             tvSymbol,
        interval:           'D',
        timezone:           tzFor(symbol),
        theme:              'dark',
        style:              '1',        // candlesticks
        locale:             'en',
        enable_publishing:  false,
        withdateranges:     true,
        hide_side_toolbar:  false,
        allow_symbol_change: false,
        save_image:         false,
        container_id:       containerId,
        studies: [
          'RSI@tv-basicstudies',
          'MAExp@tv-basicstudies',
          'MACD@tv-basicstudies',
        ],
        overrides: {
          'paneProperties.background':          '#141414',
          'paneProperties.backgroundType':      'solid',
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
        // Script tag exists but may not have fired onload yet
        existing.addEventListener('load', createWidget);
        // If already loaded, TradingView is available
        if (window.TradingView) createWidget();
      }
    }

    return () => {
      if (el) el.innerHTML = '';
    };
  }, [tvSymbol, containerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', flexDirection: 'column',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>
            {symbol}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            {tvSymbol}
          </span>
          {entryPrice != null && (
            <span style={{
              fontSize: 11, background: 'rgba(0,255,136,0.12)', color: 'var(--green)',
              border: '1px solid rgba(0,255,136,0.3)', borderRadius: 4,
              padding: '2px 8px', fontFamily: 'var(--text-mono)',
            }}>
              Entry @ {entryPrice}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', cursor: 'pointer',
            borderRadius: 6, padding: '4px 10px', fontSize: 13,
          }}
        >✕</button>
      </div>

      {/* TradingView Widget */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}
