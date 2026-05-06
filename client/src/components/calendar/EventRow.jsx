const IMPACT_COLOR = { high: 'var(--red)', medium: '#f59e0b', low: 'var(--text-dim)' };

function impactKey(v = '') {
  const s = String(v).toLowerCase();
  if (s.includes('high') || s === '3') return 'high';
  if (s.includes('med')  || s === '2') return 'medium';
  return 'low';
}

export default function EventRow({ event: e }) {
  const imp = impactKey(e.impact);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '8px 70px 36px 1fr 80px 80px 80px', gap: 12, alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: IMPACT_COLOR[imp], display: 'inline-block' }} />
      <span style={{ fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{(e.time || e.date || '').slice(0, 10)}</span>
      <span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11 }}>{e.country}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: imp === 'high' ? 600 : 400 }}>{e.event}</span>
      <span style={{ fontFamily: 'var(--text-mono)', color: 'var(--text-dim)', textAlign: 'right' }}>{e.prev ?? '—'}</span>
      <span style={{ fontFamily: 'var(--text-mono)', color: 'var(--text-secondary)', textAlign: 'right' }}>{e.estimate ?? '—'}</span>
      <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>{e.actual ?? '—'}</span>
    </div>
  );
}
