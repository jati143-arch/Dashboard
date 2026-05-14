import { useCurrency } from '../../context/CurrencyContext.jsx';
import { CUR_SYMBOL } from '../../utils/currency.js';

export default function HeroCard({ trade, date }) {
  if (!trade) return (
    <div className="card border-l-4 border-[rgba(255,255,255,0.08)] mb-6 opacity-50">
      <div className="text-[10px] tracking-[3px] uppercase text-[var(--color-text-dim)] mb-2 font-mono">BEST TRADE · {date}</div>
      <div className="text-[var(--color-text-secondary)]">No best trade flagged yet. Star a trade in the log.</div>
    </div>
  );

  const pnlColor = trade.pnl_dollar > 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]';

  return (
    <div className="card mb-6" style={{
      borderLeft: `3px solid ${trade.pnl_dollar > 0 ? 'var(--color-green)' : 'var(--color-red)'}`,
      background: trade.pnl_dollar > 0 ? 'rgba(34,255,136,0.03)' : 'rgba(255,68,68,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div className="text-[10px] tracking-[3px] uppercase text-[var(--color-text-dim)] mb-3 font-mono">★ BEST TRADE · {date}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="font-mono text-2xl font-bold tracking-tight">{trade.symbol}</span>
            <span className={`badge badge-${trade.direction}`}>{trade.direction}</span>
            <span className={`badge badge-${trade.instrument_type}`}>{trade.instrument_type}</span>
            {trade.pattern_tag && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>{trade.pattern_tag}</span>}
          </div>
          <div className="mt-3 font-mono text-sm text-[var(--color-text-secondary)]">
            Entry ${trade.entry_price} → Exit ${trade.exit_price} · {trade.size} {trade.instrument_type === 'crypto' ? 'units' : 'shares'}
          </div>
          {trade.notes && (
            <div className="mt-3 text-sm text-[var(--color-text-primary)] leading-relaxed max-w-xl" style={{ fontStyle: 'italic' }}>
              "{trade.notes}"
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className={`text-4xl font-light font-mono tracking-tighter ${pnlColor}`}>
            {trade.pnl_dollar > 0 ? '+' : ''}${Math.abs(trade.pnl_dollar).toFixed(2)}
          </div>
          <div className={`text-lg font-light mt-1 ${pnlColor}`} style={{ opacity: 0.8 }}>
            {trade.pnl_percent > 0 ? '+' : ''}{trade.pnl_percent.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}