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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trades'] }),
  });

  // Close dropdown on outside click
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

  // Unique symbols from all loaded trades for dropdown suggestions
  const allSymbols = [...new Set(trades.map(t => t.symbol))].sort();
  const suggestedSymbols = filterText
    ? allSymbols.filter(s => s.toUpperCase().includes(filterText.toUpperCase()))
    : allSymbols;

  // Apply symbol filter to sorted rows
  const displayed = filterText
    ? sorted.filter(t => t.symbol.toUpperCase().includes(filterText.toUpperCase()))
    : sorted;

  if (!trades.length) return <div className="empty-state">No trades found. Adjust filters or add your first trade.</div>;

  return (
    <div>
      {/* Symbol quick-filter with dropdown */}
      <div ref={filterRef} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>Filter:</span>
          <input
            value={filterText}
            onChange={e => { setFilterText(e.target.value.toUpperCase()); setDdOpen(true); }}
            onFocus={() => setDdOpen(true)}
            onKeyDown={e => { if (e.key === 'Escape') { setFilterText(''); setDdOpen(false); } }}
            placeholder="Type symbol…"
            autoComplete="off"
            style={{ width: 160, fontSize: 12 }}
          />
          {filterText && (
            <button
              onClick={() => { setFilterText(''); setDdOpen(false); }}
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
            >Clear</button>
          )}
          {filterText && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {displayed.length} of {trades.length}
            </span>
          )}
        </div>

        {/* Dropdown suggestions */}
        {ddOpen && suggestedSymbols.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 12, zIndex: 100, minWidth: 200,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            maxHeight: 220, overflowY: 'auto', marginTop: 2,
          }}>
            {suggestedSymbols.map(sym => (
              <div
                key={sym}
                onMouseDown={() => { setFilterText(sym); setDdOpen(false); }}
                style={{
                  padding: '7px 12px', cursor: 'pointer', fontSize: 13,
                  fontFamily: 'var(--text-mono)', fontWeight: 600, color: 'var(--accent)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {sym}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              {COLS.map(c => (
                <th key={c.key} onClick={() => toggleSort(c.key)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  {c.label}{c.key === 'pnl_dollar' ? ` ${displaySym}` : ''} {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(t => {
              const native = nativeOf(t.symbol, t.instrument_type);
              const nativeSym = native === 'INR' ? '₹' : '$';
              return (
                <tr key={t.id}>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.date}</td>
                  <td>
                    {t.is_best_trade ? <span style={{ color: 'var(--yellow)', marginRight: 4 }}>★</span> : null}
                    <span
                      style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, color: 'var(--accent)', cursor: 'pointer' }}
                      onClick={() => openChart(t.symbol, t.status === 'open' ? t.entry_price : null)}
                      title="View chart"
                    >{t.symbol}</span>
                  </td>
                  <td><span className={`badge badge-${t.instrument_type}`}>{t.instrument_type}</span></td>
                  <td><span className={`badge badge-${t.direction}`}>{t.direction}</span></td>
                  <td className="mono">{nativeSym}{t.entry_price}</td>
                  <td className="mono">{t.exit_price != null ? `${nativeSym}${t.exit_price}` : '—'}</td>
                  <td className="mono">{t.size}</td>
                  <td><PnlBadge value={t.pnl_dollar} native={native} /></td>
                  <td>
                    <span className={t.pnl_percent > 0 ? 'pnl-pos' : t.pnl_percent < 0 ? 'pnl-neg' : 'pnl-zero'} style={{ fontFamily: 'var(--text-mono)', fontSize: 13 }}>
                      {t.pnl_percent > 0 ? '+' : ''}{t.pnl_percent?.toFixed(1)}%
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{t.pattern_tag || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => onEdit(t)}>Edit</button>
                      <button style={{ background: 'none', border: '1px solid var(--red)', color: 'var(--red)', padding: '3px 8px', fontSize: 11, borderRadius: 'var(--radius)', cursor: 'pointer' }}
                        onClick={() => { if (window.confirm('Delete this trade?')) remove(t.id); }}>✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayed.length === 0 && filterText && (
          <div className="empty-state">No trades match "{filterText}"</div>
        )}
      </div>
    </div>
  );
}
