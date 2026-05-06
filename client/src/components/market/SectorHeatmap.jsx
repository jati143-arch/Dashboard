function cellColor(pct) {
  if (pct == null) return 'var(--bg-card)';
  if (pct >  3) return '#14532d';
  if (pct >  1) return '#166534';
  if (pct >  0) return '#15803d';
  if (pct === 0) return 'var(--bg-card)';
  if (pct > -1) return '#991b1b';
  if (pct > -3) return '#b91c1c';
  return '#7f1d1d';
}

export default function SectorHeatmap({ sectors = [] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6 }}>
      {sectors.map(s => (
        <div
          key={s.symbol}
          style={{
            background: cellColor(s.changePct),
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '10px 8px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
          <div style={{ fontFamily: 'var(--text-mono)', fontSize: 13, fontWeight: 700, marginTop: 4, color: s.changePct >= 0 ? '#86efac' : '#fca5a5' }}>
            {s.changePct == null ? '—' : `${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%`}
          </div>
        </div>
      ))}
    </div>
  );
}
