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
      {OPTIONS.map(({ code, label }) => {
        const isActive = currency === code;
        return (
          <button
            key={code}
            onClick={() => setCurrency(code)}
            style={{
              background: isActive ? '#ffffff' : 'rgba(255,255,255,0.06)',
              color: isActive ? '#000000' : '#71717a',
              border: 'none',
              borderRadius: 9999,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: isActive ? 700 : 400,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >{label}</button>
        );
      })}
    </div>
  );
}