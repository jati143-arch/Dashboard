import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tradesApi } from '../../api/client.js';

export default function OpenPositionsSelect({ value, onSelect }) {
  const [search, setSearch] = useState(value || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data: openTrades = [] } = useQuery({
    queryKey: ['trades', { status: 'open' }],
    queryFn: () => tradesApi.list({ status: 'open' }),
  });

  // Deduplicate by symbol, keep first occurrence
  const unique = [];
  const seen = new Set();
  for (const t of openTrades) {
    if (!seen.has(t.symbol)) {
      seen.add(t.symbol);
      unique.push(t);
    }
  }

  const filtered = unique.filter(t =>
    t.symbol.toUpperCase().includes(search.toUpperCase())
  );

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(trade) {
    setSearch(trade.symbol);
    setOpen(false);
    onSelect(trade.symbol, trade.instrument_type, trade.remaining_size ?? trade.size);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Select open position..."
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          maxHeight: 240, overflowY: 'auto', marginTop: 2,
        }}>
          {filtered.map(t => {
            const remaining = t.remaining_size ?? t.size;
            return (
              <div
                key={t.id}
                onMouseDown={() => handleSelect(t)}
                style={{
                  padding: '9px 14px', cursor: 'pointer', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{t.symbol}</span>
                  <span className={`badge badge-${t.instrument_type}`} style={{ fontSize: 9 }}>{t.instrument_type}</span>
                  <span className={`badge badge-${t.direction}`} style={{ fontSize: 9 }}>{t.direction}</span>
                </div>
                <span style={{ fontFamily: 'var(--text-mono)', fontSize: 12, color: 'var(--yellow)' }}>
                  {remaining} shares
                </span>
              </div>
            );
          })}
        </div>
      )}
      {open && filtered.length === 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '12px 14px',
          fontSize: 12, color: 'var(--text-dim)', marginTop: 2,
        }}>
          {openTrades.length === 0 ? 'No open positions' : 'No match'}
        </div>
      )}
    </div>
  );
}
