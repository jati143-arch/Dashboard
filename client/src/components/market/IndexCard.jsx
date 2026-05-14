export default function IndexCard({ name, price, changePct, change, currency }) {
  const up = changePct >= 0;
  const color = changePct == null ? '#71717a' : up ? '#22ff88' : '#ff4444';
  const fmt = (v, d = 2) => v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: '16px 20px', minWidth: 140, background: '#111111' }}>
      <div style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, fontWeight: 600 }}>{name}</div>
      <div style={{ fontFamily: 'JetBrains Mono', monospace, fontSize: 22, fontWeight: 700, color: '#ffffff' }}>
        {price == null ? '—' : fmt(price, currency === 'INR' ? 0 : 2)}
      </div>
      <div style={{ marginTop: 8, fontSize: 13, fontFamily: 'JetBrains Mono', monospace, color }}>
        {changePct == null ? '—' : `${up ? '+' : ''}${fmt(changePct, 2)}%`}
        {change != null && (
          <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8 }}>
            ({up ? '+' : ''}{fmt(change, 2)})
          </span>
        )}
      </div>
    </div>
  );
}