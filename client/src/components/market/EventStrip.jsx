const IMPACT_COLOR = { high: 'var(--red)', medium: '#f59e0b', low: 'var(--text-dim)' };
const IMPACT_DOT   = { high: '●', medium: '●', low: '○' };

function impactKey(v = '') {
  const s = String(v).toLowerCase();
  if (s.includes('high') || s === '3') return 'high';
  if (s.includes('med')  || s === '2') return 'medium';
  return 'low';
}

export default function EventStrip({ events = [], missing }) {
  if (missing) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
        Add <code style={{ color: 'var(--accent)' }}>FINNHUB_API_KEY</code> to enable economic events.
      </div>
    );
  }
  if (!events.length) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>No events in the next 14 days.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {events.slice(0, 20).map((e, i) => {
        const imp = impactKey(e.impact);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: IMPACT_COLOR[imp], fontSize: 11, flexShrink: 0 }}>{IMPACT_DOT[imp]}</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0, fontFamily: 'var(--text-mono)', width: 70 }}>
              {e.time ? e.time.slice(0, 10) : e.date}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0, width: 28, fontWeight: 700 }}>{e.country}</span>
            <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>{e.event}</span>
            {e.estimate != null && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--text-mono)' }}>Est {e.estimate}</span>
            )}
            {e.prev != null && (
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--text-mono)' }}>Prev {e.prev}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
