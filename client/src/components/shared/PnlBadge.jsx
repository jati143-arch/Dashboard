import { useCurrency } from '../../context/CurrencyContext.jsx';
import { CUR_SYMBOL, convert } from '../../utils/currency.js';

export default function PnlBadge({ value, showPercent, percent, native, cs }) {
  const { currency, rates } = useCurrency();
  const sym = cs || CUR_SYMBOL[currency] || '$';

  if (value == null) return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      color: '#71717a',
      background: 'rgba(255,255,255,0.06)',
      borderRadius: 9999,
      padding: '2px 10px',
      fontSize: 13,
    }}>—</span>
  );

  const displayValue = (native && native !== currency && !cs)
    ? convert(value, native, currency, rates)
    : value;

  const isPositive = displayValue > 0;
  const isNegative = displayValue < 0;
  const sign = isPositive ? '+' : '';

  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      color: isPositive ? '#22ff88' : isNegative ? '#ff4444' : '#71717a',
      background: isPositive ? 'rgba(34,255,136,0.1)' : isNegative ? 'rgba(255,68,68,0.1)' : 'rgba(255,255,255,0.06)',
      borderRadius: 9999,
      padding: '2px 10px',
      fontSize: 13,
      fontWeight: 600,
    }}>
      {sign}{sym}{Math.abs(displayValue).toFixed(2)}
      {showPercent && percent != null && (
        <span style={{ fontSize: '0.85em', marginLeft: 5, opacity: 0.8 }}>
          ({sign}{Math.abs(percent).toFixed(1)}%)
        </span>
      )}
    </span>
  );
}