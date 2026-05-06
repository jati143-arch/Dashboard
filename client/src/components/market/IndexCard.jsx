export default function IndexCard({ name, price, changePct, change, currency }) {
  const up = changePct >= 0;
  const color = changePct == null ? 'var(--text-secondary)' : up ? 'var(--green)' : 'var(--red)';
  const fmt = (v, d = 2) => v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="card" style={{ padding: '12px 16px', minWidth: 130 }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{name}</div>
      <div style={{ fontFamily: 'var(--text-mono)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
        {price == null ? '—' : fmt(price, currency === 'INR' ? 0 : 2)}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, fontFamily: 'var(--text-mono)', color }}>
        {changePct == null ? '—' : `${up ? '+' : ''}${fmt(changePct, 2)}%`}
        {change != null && (
          <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>
            ({up ? '+' : ''}{fmt(change, 2)})
          </span>
        )}
      </div>
    </div>
  );
}
