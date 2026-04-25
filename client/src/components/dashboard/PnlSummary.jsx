export default function PnlSummary({ trades }) {
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl_dollar, 0);
  const wins = trades.filter(t => t.pnl_dollar > 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0;
  const pnlColor = totalPnl > 0 ? 'var(--green)' : totalPnl < 0 ? 'var(--red)' : 'var(--text-secondary)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Today's P&L</div>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: pnlColor }}>
          {totalPnl > 0 ? '+' : ''}{totalPnl === 0 ? '—' : `$${Math.abs(totalPnl).toFixed(2)}`}
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Trades</div>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--text-primary)' }}>{trades.length}</div>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Win Rate</div>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: winRate >= 50 ? 'var(--green)' : 'var(--red)' }}>
          {trades.length ? `${winRate}%` : '—'}
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Wins / Losses</div>
        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--text-primary)', marginTop: 4 }}>
          <span style={{ color: 'var(--green)' }}>{wins}</span>
          <span style={{ color: 'var(--text-dim)', margin: '0 6px' }}>/</span>
          <span style={{ color: 'var(--red)' }}>{trades.length - wins}</span>
        </div>
      </div>
    </div>
  );
}
