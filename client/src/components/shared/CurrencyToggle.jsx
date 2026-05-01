import { useCurrency } from '../../context/CurrencyContext.jsx';

const OPTIONS = [
  { code: 'USD', label: '$ USD' },
  { code: 'INR', label: '₹ INR' },
  { code: 'EUR', label: '€ EUR' },
];

export default function CurrencyToggle({ style }) {
  const { currency, setCurrency } = useCurrency();
  return (
    <div style={{ display: 'flex', gap: 4, ...style }}>
      {OPTIONS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setCurrency(code)}
          style={{
            background: currency === code ? 'var(--accent)' : 'transparent',
            color: currency === code ? '#000' : 'var(--text-secondary)',
            border: currency === code ? 'none' : '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: currency === code ? 700 : 400,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >{label}</button>
      ))}
    </div>
  );
}
