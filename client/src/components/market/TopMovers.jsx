function Row({ item }) {
  const up = item.changePct >= 0;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', fontFamily: 'JetBrains Mono, monospace' }}>{item.name}</span>
      <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: up ? '#22ff88' : '#ff4444' }}>
        {up ? '+' : ''}{item.changePct?.toFixed(2)}%
      </span>
    </div>
  );
}

export default function TopMovers({ gainers = [], losers = [] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={{ padding: '16px 20px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, background: '#111111' }}>
        <div style={{ fontSize: 11, color: '#22ff88', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, fontWeight: 700 }}>Top Gainers</div>
        {gainers.map(g => <Row key={g.symbol} item={g} />)}
      </div>
      <div style={{ padding: '16px 20px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, background: '#111111' }}>
        <div style={{ fontSize: 11, color: '#ff4444', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, fontWeight: 700 }}>Top Losers</div>
        {losers.map(l => <Row key={l.symbol} item={l} />)}
      </div>
    </div>
  );
}