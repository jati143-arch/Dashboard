import { NavLink } from 'react-router-dom';

const links = [
  { to: '/',            icon: '▦', label: 'Dashboard' },
  { to: '/investments', icon: '◎', label: 'Investments' },
  { to: '/trades',      icon: '≡', label: 'Trade Log'  },
  { to: '/performance', icon: '◈', label: 'Performance' },
  { to: '/patterns',    icon: '◇', label: 'Patterns'   },
  { to: '/ai',          icon: '✦', label: 'AI Insights' },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          onClick={onClose}
          className="sidebar-backdrop"
        />
      )}

      <aside
        className={`sidebar ${open ? 'sidebar-open' : 'sidebar-closed'}`}
        style={{
          width: open ? 200 : 52,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          transition: 'width 0.2s ease',
          overflow: 'hidden',
          zIndex: 100,
        }}
      >
        <div style={{
          padding: open ? '20px 16px 16px' : '20px 0 16px',
          borderBottom: '1px solid var(--border)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textAlign: open ? 'left' : 'center',
        }}>
          {open ? (
            <>
              <div style={{ fontFamily: 'var(--text-mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em' }}>TRADE DESK</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>personal journal</div>
            </>
          ) : (
            <div style={{ fontFamily: 'var(--text-mono)', fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>T</div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '12px 4px' }}>
          {links.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={!open ? label : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: open ? 10 : 0,
                padding: open ? '9px 12px' : '9px 0',
                justifyContent: open ? 'flex-start' : 'center',
                borderRadius: 'var(--radius)',
                marginBottom: 2,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-card)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                textDecoration: 'none',
                transition: 'background 0.1s, color 0.1s',
                borderLeft: open && isActive ? '2px solid var(--accent)' : '2px solid transparent',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              })}
            >
              <span style={{ fontFamily: 'var(--text-mono)', fontSize: 14, flexShrink: 0 }}>{icon}</span>
              {open && label}
            </NavLink>
          ))}
        </nav>

        {open && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
            v1.0 · local server
          </div>
        )}
      </aside>
    </>
  );
}
