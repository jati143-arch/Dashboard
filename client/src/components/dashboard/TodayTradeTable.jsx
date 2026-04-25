import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tradesApi } from '../../api/client.js';
import PnlBadge from '../shared/PnlBadge.jsx';

export default function TodayTradeTable({ trades, date, onEdit }) {
  const qc = useQueryClient();

  const { mutate: toggleBest } = useMutation({
    mutationFn: (id) => tradesApi.toggleBest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trades', date] }),
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id) => tradesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trades', date] }),
  });

  if (!trades.length) {
    return (
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Today's Trades</div>
        <div className="empty-state">No trades logged today yet.</div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Today's Trades
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>★</th>
              <th>Symbol</th>
              <th>Dir</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>Size</th>
              <th>P&L</th>
              <th>Pattern</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {trades.map(t => (
              <tr key={t.id}>
                <td>
                  <button
                    onClick={() => toggleBest(t.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      fontSize: 16, color: t.is_best_trade ? 'var(--yellow)' : 'var(--text-dim)',
                    }}
                    title={t.is_best_trade ? 'Unmark best trade' : 'Mark as best trade'}
                  >★</button>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700 }}>{t.symbol}</span>
                  <span className={`badge badge-${t.instrument_type}`} style={{ marginLeft: 6, fontSize: 9 }}>{t.instrument_type}</span>
                </td>
                <td><span className={`badge badge-${t.direction}`}>{t.direction}</span></td>
                <td className="mono">${t.entry_price}</td>
                <td className="mono">${t.exit_price}</td>
                <td className="mono">{t.size}</td>
                <td><PnlBadge value={t.pnl_dollar} showPercent percent={t.pnl_percent} /></td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{t.pattern_tag || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => onEdit(t)}>Edit</button>
                    <button className="btn-danger" style={{ padding: '3px 8px', fontSize: 11, background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)' }}
                      onClick={() => { if (window.confirm('Delete this trade?')) remove(t.id); }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
