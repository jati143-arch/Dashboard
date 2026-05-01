import { useState, useEffect, useRef } from 'react';
import { searchApi } from '../../api/client.js';
import { toTvSymbol } from '../../utils/tvSymbol.js';

export default function TickerInput({ value, onChange, onSelect }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);
  const wrapRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleChange(e) {
    const v = e.target.value.toUpperCase();
    onChange(v);
    clearTimeout(timer.current);
    if (v.length < 1) { setResults([]); setOpen(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const data = await searchApi.search(v);
        if (!mountedRef.current) return;
        const safeData = Array.isArray(data) ? data : [];
        setResults(safeData);
        setOpen(safeData.length > 0);
      } catch {
        if (mountedRef.current) setResults([]);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }, 350);
  }

  function handleSelect(item) {
    onSelect(item.symbol, item.type);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={handleChange}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
        placeholder="AAPL, RELIANCE.NS, BTC-USD..."
        required
        autoComplete="off"
      />
      {loading && (
        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
          <div className="spinner" style={{ width: 12, height: 12 }} />
        </div>
      )}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', marginTop: 3,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          maxHeight: 280, overflowY: 'auto',
        }}>
          {results.map((r) => {
            const tvSym = toTvSymbol(r.symbol);
            return (
              <div
                key={r.symbol}
                onClick={() => handleSelect(r)}
                style={{
                  padding: '9px 12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  borderBottom: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ minWidth: 90 }}>
                  <div style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>
                    {r.symbol}
                  </div>
                  {tvSym && tvSym !== r.symbol && (
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 1 }}>TV: {tvSym}</div>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name}
                </span>
                <span style={{
                  fontSize: 9, padding: '2px 5px', borderRadius: 3,
                  background: r.type === 'crypto' ? 'var(--yellow-dim)' : 'var(--accent-dim)',
                  color: r.type === 'crypto' ? 'var(--yellow)' : 'var(--accent)',
                  fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>
                  {r.exchange || r.type}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
