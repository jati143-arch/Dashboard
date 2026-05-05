import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tradesApi } from '../../api/client.js';
import PnlBadge from '../shared/PnlBadge.jsx';

export default function HeroCard({ trade, date }) {
  const qc = useQueryClient();
  const { mutate: toggleBest } = useMutation({
    mutationFn: () => tradesApi.toggleBest(trade.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trades'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['daily'] });
    },
  });

  if (!trade) {
    return (
      <div className="card" style={{
        borderLeft: '3px solid var(--text-dim)',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity: 0.5,
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            Best Trade · {date}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>No best trade flagged yet. Star a trade in the log below.</div>
        </div>
      </div>
    );
  }

  const pnlColor = trade.pnl_dollar > 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div className="card" style={{
      borderLeft: `3px solid ${pnlColor}`,
      marginBottom: 24,
      background: trade.pnl_dollar > 0 ? 'rgba(0,230,118,0.03)' : 'rgba(255,23,68,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            ★ Best Trade · {date}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--text-primary)' }}>
              {trade.symbol}
            </span>
            <span className={`badge badge-${trade.direction}`}>{trade.direction}</span>
            <span className={`badge badge-${trade.instrument_type}`}>{trade.instrument_type}</span>
            {trade.pattern_tag && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{trade.pattern_tag}</span>
            )}
          </div>
          <div style={{ marginTop: 8, fontFamily: 'var(--text-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
            Entry ${trade.entry_price} → Exit ${trade.exit_price} · {trade.size} {trade.instrument_type === 'crypto' ? 'units' : 'shares'}
          </div>
          {trade.notes && (
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, maxWidth: 600 }}>
              "{trade.notes}"
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: pnlColor }}>
            {trade.pnl_dollar > 0 ? '+' : ''}${Math.abs(trade.pnl_dollar).toFixed(2)}
          </div>
          <div style={{ fontSize: 13, color: pnlColor, opacity: 0.8 }}>
            {trade.pnl_percent > 0 ? '+' : ''}{trade.pnl_percent.toFixed(1)}%
          </div>
          <button
            className="btn-ghost"
            onClick={() => toggleBest()}
            style={{ marginTop: 8, fontSize: 11 }}
          >
            Unstar
          </button>
        </div>
      </div>
    </div>
  );
}
