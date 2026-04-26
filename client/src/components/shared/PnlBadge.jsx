export default function PnlBadge({ value, showPercent, percent, cs = '$' }) {
  if (value == null) return <span className="pnl-zero mono">—</span>;
  const cls = value > 0 ? 'pnl-pos' : value < 0 ? 'pnl-neg' : 'pnl-zero';
  const sign = value > 0 ? '+' : '';
  return (
    <span className={cls}>
      {sign}{cs}{Math.abs(value).toFixed(2)}
      {showPercent && percent != null && (
        <span style={{ fontSize: '0.85em', marginLeft: 5, opacity: 0.8 }}>
          ({sign}{Math.abs(percent).toFixed(1)}%)
        </span>
      )}
    </span>
  );
}
