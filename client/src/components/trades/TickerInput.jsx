import { useState, useEffect, useRef } from 'react';
import { searchApi } from '../../api/client.js';
import { toTvSymbol } from '../../utils/tvSymbol.js';

const TYPE_STYLE = {
  stock:  { bg: 'rgba(0,212,255,0.12)',   color: '#00d4ff' },
  crypto: { bg: 'rgba(255,214,10,0.12)',  color: '#ffd60a' },
  etf:    { bg: 'rgba(100,180,255,0.12)', color: '#64b4ff' },
  fund:   { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
};

const inputStyle = {
  width: '100%', background: '#111111', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 9999, padding: '8px 14px', color: '#ffffff', fontSize: 13, boxSizing: 'border-box',
};

export default function TickerInput({ value, onChange, onSelect }) {
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const timer      = useRef(null);
  const wrapRef    = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

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
        const safe = Array.isArray(data) ? data : [];
        setResults(safe);
        setOpen(safe.length > 0);
      } catch {
        if (mountedRef.current) setResults([]);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }, 350);
  }

  function handleSelect(item) {
    const tvSym = toTvSymbol(item.symbol);
    const type  = item.type === 'crypto' ? 'crypto'
                : item.type === 'fund'   ? 'mutual_fund'
                : item.type || 'stock';
    onChange(tvSym);
    onSelect(tvSym, type);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={handleChange}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
        placeholder="Search symbol… (e.g. RELIANCE, AAPL)"
        required
        autoComplete="off"
        style={inputStyle}
      />
      {loading && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
          <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#111111', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, marginTop: 6,
          boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
          maxHeight: 320, overflowY: 'auto',
        }}>
          {results.map((r) => {
            const ts = TYPE_STYLE[r.type] || TYPE_STYLE.stock;
            const displaySym = toTvSymbol(r.symbol);
            return (
              <div
                key={r.symbol}
                onClick={() => handleSelect(r)}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ minWidth: 120 }}>
                  <div style={{ fontFamily: 'JetBrains Mono', monospace, fontWeight: 700, fontSize: 14, color: '#00d4ff' }}>
                    {displaySym}
                  </div>
                  <div style={{ fontSize: 10, color: '#52525b', marginTop: 2 }}>
                    {r.exchange}
                  </div>
                </div>
                <span style={{ fontSize: 13, color: '#71717a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name}
                </span>
                <span style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 9999,
                  background: ts.bg, color: ts.color,
                  fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  {r.type || 'stock'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}