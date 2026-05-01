import { useCurrency } from '../../context/CurrencyContext.jsx';
import { CUR_SYMBOL, convert } from '../../utils/currency.js';

export default function PnlBadge({ value, showPercent, percent, native, cs }) {
  const { currency, rates } = useCurrency();
  const sym = cs || CUR_SYMBOL[currency] || '$';

  if (value == null) return <span className="pnl-zero mono">—</span>;

  const displayValue = (native && native !== currency && !cs)
    ? convert(value, native, currency, rates)
    : value;

  const cls = displayValue > 0 ? 'pnl-pos' : displayValue < 0 ? 'pnl-neg' : 'pnl-zero';
  const sign = displayValue > 0 ? '+' : '';

  return (
    <span className={`${cls} mono`}>
      {sign}{sym}{Math.abs(displayValue).toFixed(2)}
      {showPercent && percent != null && (
        <span style={{ fontSize: '0.85em', marginLeft: 5, opacity: 0.8 }}>
          ({sign}{Math.abs(percent).toFixed(1)}%)
        </span>
      )}
    </span>
  );
}
