import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tradesApi } from '../../api/client.js';
import PnlBadge from '../shared/PnlBadge.jsx';
import { useChart } from '../../context/ChartContext.jsx';

const COLS = [
  { key: 'date', label: 'Date' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'instrument_type', label: 'Type' },
  { key: 'direction', label: 'Dir' },
  { key: 'entry_price', label: 'Entry' },
  { key: 'exit_price', label: 'Exit' },
  { key: 'size', label: 'Size' },
  { key: 'pnl_dollar', label: 'P&L $' },
  { key: 'pnl_percent', label: 'P&L %' },
  { key: 'pattern_tag', label: 'Pattern' },
];

export default function TradeTable({ trades, onEdit }) {
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const qc = useQueryClient();
  const { openChart } = useChart();

  const { mutate: remove } = useMutation({
    mutationFn: (id) => tradesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trades'] }),
  });

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

  if (!trades.length) return <div className="empty-state">No trades found. Adjust filters or add your first trade.</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            {COLS.map(c => (
              <th key={c.key} onClick={() => toggleSort(c.key)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                {c.label} {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(t => (
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
              <td className="mono">${t.entry_price}</td>
              <td className="mono">${t.exit_price}</td>
              <td className="mono">{t.size}</td>
              <td><PnlBadge value={t.pnl_dollar} /></td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
