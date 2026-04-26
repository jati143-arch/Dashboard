import { NavLink } from 'react-router-dom';

const links = [
  { to: '/',            icon: '▦', label: 'Dashboard' },
  { to: '/investments',  icon: '◎', label: 'Investments' },
  { to: '/trades',      icon: '≡', label: 'Trade Log'  },
  { to: '/performance', icon: '◈', label: 'Performance' },
  { to: '/patterns',    icon: '◇', label: 'Patterns'   },
  { to: '/ai',          icon: '✦', label: 'AI Insights' },
];

export default function Sidebar() {
  return (
    <aside style={{
      width: 200,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'var(--text-mono)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--accent)',
          letterSpacing: '0.06em',
        }}>TRADE DESK</div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>personal journal</div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 'var(--radius)',
              marginBottom: 2,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-card)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: 13,
              textDecoration: 'none',
              transition: 'background 0.1s, color 0.1s',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            })}
          >
            <span style={{ fontFamily: 'var(--text-mono)', fontSize: 14 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        fontSize: 10,
        color: 'var(--text-dim)',
      }}>
        v1.0 · local server
      </div>
    </aside>
  );
}
