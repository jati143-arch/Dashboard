function Row({ item }) {
  const up = item.changePct >= 0;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--text-mono)' }}>{item.name}</span>
      <span style={{ fontSize: 12, fontFamily: 'var(--text-mono)', fontWeight: 700, color: up ? 'var(--green)' : 'var(--red)' }}>
        {up ? '+' : ''}{item.changePct?.toFixed(2)}%
      </span>
    </div>
  );
}

export default function TopMovers({ gainers = [], losers = [] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, fontWeight: 600 }}>Top Gainers</div>
        {gainers.map(g => <Row key={g.symbol} item={g} />)}
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, fontWeight: 600 }}>Top Losers</div>
        {losers.map(l => <Row key={l.symbol} item={l} />)}
      </div>
    </div>
  );
}
