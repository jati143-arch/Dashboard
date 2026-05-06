function cellBg(pnl, trades) {
  if (trades === 0) return 'var(--bg-card)';
  if (pnl >  500) return '#14532d';
  if (pnl >  100) return '#166534';
  if (pnl >    0) return '#15803d';
  if (pnl <  -500) return '#7f1d1d';
  if (pnl <  -100) return '#991b1b';
  if (pnl <    0) return '#b91c1c';
  return 'var(--bg-card)';
}

function fmtPnl(v) {
  const abs = Math.abs(v);
  const sign = v >= 0 ? '+' : '−';
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export default function SectorExposure({ data = [] }) {
  if (!data.length) {
    return (
      <div className="empty-state" style={{ padding: '40px 0' }}>
        No trades found. Add some trades to see sector exposure.
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Sector breakdown of all your trades — colored by closed P&L. Green = profit, Red = loss.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
        {data.map(s => (
          <div key={s.sector} style={{
            background: cellBg(s.pnl, s.trades),
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
              {s.sector}
            </div>

            {s.trades > 0 && (
              <div style={{ fontFamily: 'var(--text-mono)', fontSize: 13, fontWeight: 700, color: s.pnl >= 0 ? '#86efac' : '#fca5a5', marginBottom: 4 }}>
                {fmtPnl(s.pnl)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {s.trades > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                  {s.trades} closed
                </span>
              )}
              {s.win_rate != null && (
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                  {s.win_rate}% WR
                </span>
              )}
              {s.open > 0 && (
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 10, background: 'rgba(0,170,255,0.15)', color: '#60a5fa', border: '1px solid rgba(0,170,255,0.3)' }}>
                  {s.open} open
                </span>
              )}
            </div>

            <div style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {s.symbols.slice(0, 3).map(sym => {
                const t = sym.includes(':') ? sym.split(':')[1] : sym.includes('.') ? sym.split('.')[0] : sym;
                return t;
              }).join(', ')}{s.symbols.length > 3 ? ` +${s.symbols.length - 3}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
