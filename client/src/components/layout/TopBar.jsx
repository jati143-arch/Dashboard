import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  '/':            'Daily Dashboard',
  '/investments': 'Investments',
  '/trades':      'Trade Log',
  '/performance': 'Performance',
  '/patterns':    'Pattern Library',
  '/ai':          'AI Insights',
};

export default function TopBar({ onToggle }) {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'Trading Dashboard';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <header style={{
      height: 52,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px 0 8px',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={onToggle}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
            fontSize: 18, cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
            borderRadius: 'var(--radius)',
          }}
          title="Toggle sidebar"
        >
          ☰
        </button>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          fontFamily: 'var(--text-mono)',
          fontSize: 11,
          color: 'var(--text-secondary)',
        }}>{today}</span>
        <span style={{
          width: 7, height: 7,
          borderRadius: '50%',
          background: 'var(--green)',
          boxShadow: '0 0 6px var(--green)',
          display: 'inline-block',
        }} title="Server connected" />
      </div>
    </header>
  );
}
