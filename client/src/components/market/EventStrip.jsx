const IMPACT_COLOR = { high: '#ff4444', medium: '#f59e0b', low: '#52525b' };
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
      <div style={{ padding: '24px', textAlign: 'center', color: '#52525b', fontSize: 13, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24 }}>
        Add <code style={{ color: '#00d4ff', fontFamily: 'JetBrains Mono, monospace' }}>FINNHUB_API_KEY</code> to enable economic events.
      </div>
    );
  }
  if (!events.length) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#52525b', fontSize: 13, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24 }}>No events in the next 14 days.</div>;
  }
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, overflow: 'hidden', background: '#111111' }}>
      {events.slice(0, 20).map((e, i) => {
        const imp = impactKey(e.impact);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < 19 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <span style={{ color: IMPACT_COLOR[imp], fontSize: 12, flexShrink: 0 }}>{IMPACT_DOT[imp]}</span>
            <span style={{ fontSize: 11, color: '#52525b', flexShrink: 0, fontFamily: "'JetBrains Mono', monospace", width: 76 }}>
              {e.time ? e.time.slice(0, 10) : e.date}
            </span>
            <span style={{ fontSize: 11, color: '#52525b', flexShrink: 0, width: 32, fontWeight: 700 }}>{e.country}</span>
            <span style={{ fontSize: 13, color: '#ffffff', flex: 1 }}>{e.event}</span>
            {e.estimate != null && (
              <span style={{ fontSize: 11, color: '#71717a', fontFamily: 'JetBrains Mono, monospace' }}>Est {e.estimate}</span>
            )}
            {e.prev != null && (
              <span style={{ fontSize: 11, color: '#52525b', fontFamily: 'JetBrains Mono, monospace' }}>Prev {e.prev}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}