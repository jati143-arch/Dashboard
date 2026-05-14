import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tradesApi } from '../../api/client.js';
import PnlBadge from '../shared/PnlBadge.jsx';
import { useChart } from '../../context/ChartContext.jsx';
import { useCurrency } from '../../context/CurrencyContext.jsx';
import { nativeOf, CUR_SYMBOL } from '../../utils/currency.js';

const COLS = [
  { key: 'date', label: 'Date' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'instrument_type', label: 'Type' },
  { key: 'direction', label: 'Dir' },
  { key: 'entry_price', label: 'Entry' },
  { key: 'exit_price', label: 'Exit' },
  { key: 'size', label: 'Size' },
  { key: 'pnl_dollar', label: 'P&L' },
  { key: 'pnl_percent', label: 'P&L %' },
  { key: 'pattern_tag', label: 'Pattern' },
];

export default function TradeTable({ trades, onEdit }) {
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [filterText, setFilterText] = useState('');
  const [ddOpen, setDdOpen] = useState(false);
  const filterRef = useRef(null);
  const qc = useQueryClient();
  const { openChart } = useChart();
  const { currency } = useCurrency();
  const displaySym = CUR_SYMBOL[currency] || '$';

  const { mutate: remove } = useMutation({
    mutationFn: (id) => tradesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trades'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['daily'] });
    },
  });

  useEffect(() => {
    function handler(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setDdOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const sorted = [...trades].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const allSymbols = [...new Set(trades.map(t => t.symbol))].sort();
  const suggestedSymbols = filterText
    ? allSymbols.filter(s => s.toUpperCase().includes(filterText.toUpperCase()))
    : allSymbols;

  const displayed = filterText
    ? sorted.filter(t => t.symbol.toUpperCase().includes(filterText.toUpperCase()))
    : sorted;

  if (!trades.length) return <div style={{ textAlign: 'center', color: '#52525b', padding: 40, fontSize: 14 }}>No trades found. Adjust filters or add your first trade.</div>;

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, overflow: 'hidden' }}>
      <div ref={filterRef} style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative', background: '#111111' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, color: '#52525b', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Filter:</span>
          <input
            value={filterText}
            onChange={e => { setFilterText(e.target.value.toUpperCase()); setDdOpen(true); }}
            onFocus={() => setDdOpen(true)}
            onKeyDown={e => { if (e.key === 'Escape') { setFilterText(''); setDdOpen(false); } }}
            placeholder="Type symbol…"
            autoComplete="off"
            style={{ width: 180, fontSize: 13, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, padding: '6px 14px', color: '#ffffff', outline: 'none' }}
          />
          {filterText && (
            <button
              onClick={() => { setFilterText(''); setDdOpen(false); }}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#52525b', padding: '4px 10px', borderRadius: 9999, cursor: 'pointer', fontSize: 11 }}
            >Clear</button>
          )}
          {filterText && (
            <span style={{ fontSize: 11, color: '#52525b' }}>
              {displayed.length} of {trades.length}
            </span>
          )}
        </div>

        {ddOpen && suggestedSymbols.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 16, zIndex: 100, minWidth: 200,
            background: '#111111', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            maxHeight: 220, overflowY: 'auto', marginTop: 6,
          }}>
            {suggestedSymbols.map(sym => (
              <div
                key={sym}
                onMouseDown={() => { setFilterText(sym); setDdOpen(false); }}
                style={{
                  padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                  fontFamily: 'JetBrains Mono', monospace, fontWeight: 600, color: '#00d4ff',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {sym}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0d0d0d' }}>
              {COLS.map(c => (
                <th key={c.key} onClick={() => toggleSort(c.key)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {c.label}{c.key === 'pnl_dollar' ? ` ${displaySym}` : ''} {sortKey === c.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
              <th style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}></th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(t => {
              const native = nativeOf(t.symbol, t.instrument_type);
              const nativeSym = native === 'INR' ? '₹' : '$';
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono', monospace, fontSize: 12, color: '#71717a' }}>{t.date}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {t.is_best_trade ? <span style={{ color: '#ffd60a', marginRight: 4 }}>★</span> : null}
                    <span
                      style={{ fontFamily: 'JetBrains Mono', monospace, fontWeight: 700, color: '#00d4ff', cursor: 'pointer' }}
                      onClick={() => openChart(t.symbol, t.status === 'open' ? t.entry_price : null)}
                      title="View chart"
                    >{t.symbol}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: 'rgba(255,255,255,0.06)', color: '#71717a' }}>{t.instrument_type}</span></td>
                  <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600, background: t.direction === 'long' ? 'rgba(34,255,136,0.12)' : 'rgba(255,68,68,0.12)', color: t.direction === 'long' ? '#22ff88' : '#ff4444', textTransform: 'uppercase' }}>{t.direction}</span></td>
                  <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono', monospace }}>{nativeSym}{t.entry_price}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono', monospace }}>{t.exit_price != null ? `${nativeSym}${t.exit_price}` : '—'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono', monospace }}>{t.size}</td>
                  <td style={{ padding: '10px 14px' }}><PnlBadge value={t.pnl_dollar} native={native} /></td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', monospace, fontSize: 13, color: t.pnl_percent > 0 ? '#22ff88' : t.pnl_percent < 0 ? '#ff4444' : '#71717a' }}>
                      {t.pnl_percent > 0 ? '+' : ''}{t.pnl_percent?.toFixed(1)}%
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#71717a', fontSize: 11 }}>{t.pattern_tag || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => onEdit(t)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#71717a', padding: '4px 10px', borderRadius: 9999, cursor: 'pointer', fontSize: 11 }}>Edit</button>
                      <button style={{ background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', padding: '4px 10px', borderRadius: 9999, cursor: 'pointer', fontSize: 11 }}
                        onClick={() => { if (window.confirm('Delete this trade?')) remove(t.id); }}>✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayed.length === 0 && filterText && (
          <div style={{ textAlign: 'center', color: '#52525b', padding: 40, fontSize: 13 }}>No trades match "{filterText}"</div>
        )}
      </div>
    </div>
  );
}