import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pricesApi } from '../../api/client.js';

function getNSEStatus() {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  const day  = ist.getUTCDay();
  const hour = ist.getUTCHours();
  const min  = ist.getUTCMinutes();
  const mins = hour * 60 + min;
  if (day === 0 || day === 6) return { open: false, label: 'NSE CLOSED (Weekend)' };
  if (mins >= 9 * 60 + 15 && mins < 15 * 60 + 30) return { open: true,  label: 'NSE OPEN' };
  if (mins >= 15 * 60 + 30 && mins < 16 * 60)      return { open: false, label: 'NSE POST-MARKET' };
  if (mins >= 9 * 60 && mins < 9 * 60 + 15)        return { open: false, label: 'NSE PRE-OPEN' };
  return { open: false, label: 'NSE CLOSED' };
}

const TICKER_SYMBOLS = ['NIFTY 50', 'SENSEX', 'BANK NIFTY', 'S&P 500', 'NASDAQ', 'DOW', 'GOLD', 'CRUDE', 'USD/INR'];

function TickerTape({ prices }) {
  const items = TICKER_SYMBOLS.map(sym => {
    const p = prices[sym];
    return p ? { sym, price: p.price, change: p.change, changePercent: p.changePercent } : null;
  }).filter(Boolean);

  const row = items.map((item, i) => (
    <span key={i} className="ticker-item">
      <span className="ticker-symbol">{item.sym}</span>
      <span className="ticker-price">{typeof item.price === 'number' ? item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</span>
      <span className={`ticker-change ${(item.change ?? 0) >= 0 ? 'pos' : 'neg'}`}>
        {(item.change ?? 0) >= 0 ? '+' : ''}{(item.changePercent ?? 0).toFixed(2)}%
      </span>
    </span>
  ));

  return (
    <div className="ticker-tape">
      {[...row, ...row]}
    </div>
  );
}

export default function StatusBar() {
  const [time, setTime]     = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }));
  const [status, setStatus] = useState(getNSEStatus);

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
      setStatus(getNSEStatus());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const { data: prices = {} } = useQuery({
    queryKey: ['ticker-prices', TICKER_SYMBOLS.join(',')],
    queryFn: () => pricesApi.get(TICKER_SYMBOLS),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  return (
    <div className="status-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', borderRight: '1px solid var(--color-border)', flexShrink: 0 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: status.open ? 'var(--color-green)' : 'var(--color-text-dim)',
          display: 'inline-block',
          animation: status.open ? 'pulse-dot 2.5s ease-in-out infinite' : 'none',
        }} />
        <span style={{ color: status.open ? 'var(--color-green)' : 'var(--color-text-secondary)', letterSpacing: '0.06em', fontSize: 10, fontWeight: 600 }}>{status.label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, padding: '0 12px', borderRight: '1px solid var(--color-border)', color: 'var(--color-text-dim)', flexShrink: 0 }}>
        <span>{time}</span>
        <span>IST</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <TickerTape prices={prices} />
      </div>
    </div>
  );
}