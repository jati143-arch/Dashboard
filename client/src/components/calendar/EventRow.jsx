const IMPACT_COLOR = { high: '#ff4444', medium: '#f59e0b', low: '#52525b' };

function impactKey(v = '') {
  const s = String(v).toLowerCase();
  if (s.includes('high') || s === '3') return 'high';
  if (s.includes('med')  || s === '2') return 'medium';
  return 'low';
}

export default function EventRow({ event: e }) {
  const imp = impactKey(e.impact);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '10px 80px 40px 1fr 90px 90px 90px', gap: 14, alignItems: 'center', padding: '12px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: IMPACT_COLOR[imp], display: 'inline-block' }} />
      <span style={{ fontFamily: 'JetBrains Mono', monospace, fontSize: 11, color: '#52525b' }}>{(e.time || e.date || '').slice(0, 10)}</span>
      <span style={{ fontWeight: 700, color: '#71717a', fontSize: 11 }}>{e.country}</span>
      <span style={{ color: '#ffffff', fontWeight: imp === 'high' ? 600 : 400 }}>{e.event}</span>
      <span style={{ fontFamily: 'JetBrains Mono', monospace, color: '#52525b', textAlign: 'right' }}>{e.prev ?? '—'}</span>
      <span style={{ fontFamily: 'JetBrains Mono', monospace, color: '#71717a', textAlign: 'right' }}>{e.estimate ?? '—'}</span>
      <span style={{ fontFamily: 'JetBrains Mono', monospace, fontWeight: 700, color: '#ffffff', textAlign: 'right' }}>{e.actual ?? '—'}</span>
    </div>
  );
}