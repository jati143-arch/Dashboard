function cellColor(pct) {
  if (pct == null) return '#111111';
  if (pct >  3) return '#14532d';
  if (pct >  1) return '#166534';
  if (pct >  0) return '#15803d';
  if (pct === 0) return '#111111';
  if (pct > -1) return '#991b1b';
  if (pct > -3) return '#b91c1c';
  return '#7f1d1d';
}

export default function SectorHeatmap({ sectors = [] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
      {sectors.map(s => (
        <div
          key={s.symbol}
          style={{
            background: cellColor(s.changePct),
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            padding: '14px 10px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#ffffff', marginBottom: 6 }}>{s.name}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: s.changePct >= 0 ? '#86efac' : '#fca5a5' }}>
            {s.changePct == null ? '—' : `${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%`}
          </div>
        </div>
      ))}
    </div>
  );
}