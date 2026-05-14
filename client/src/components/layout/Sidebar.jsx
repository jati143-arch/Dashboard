import { NavLink } from 'react-router-dom';
import { BarChart3, LayoutDashboard } from 'lucide-react';

const links = [
  { to: '/',            label: 'Dashboard' },
  { to: '/market',      label: 'Market' },
  { to: '/watchlist',   label: 'Watchlist' },
  { to: '/investments', label: 'Investments' },
  { to: '/trades',      label: 'Trade Log' },
  { to: '/performance', label: 'Performance' },
  { to: '/calendar',    label: 'Calendar' },
  { to: '/backtest',    label: 'Backtest' },
  { to: '/screener',    label: 'Screener' },
  { to: '/patterns',    label: 'Patterns' },
  { to: '/ai',          label: 'AI' },
  { to: '/settings',    label: 'Settings' },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div onClick={onClose} className="sidebar-backdrop" />}

      <aside
        className={`sidebar ${open ? 'sidebar-open' : ''}`}
        style={{
          width: open ? 220 : 56,
          background: '#0a0a0a',
          borderRight: '1px solid rgba(255,255,255,0.06)',
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
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textAlign: open ? 'left' : 'center',
        }}>
          {open ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="flex items-center justify-center w-8 h-8 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-secondary)] shadow-[0_0_22px_-2px] shadow-[var(--color-accent)]">
                <BarChart3 className="w-4 h-4 text-black" />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>DASHBOARD</div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="flex items-center justify-center w-8 h-8 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-secondary)]">
                <BarChart3 className="w-4 h-4 text-black" />
              </div>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={!open ? label : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: open ? 10 : 0,
                padding: open ? '8px 12px' : '8px 0',
                justifyContent: open ? 'flex-start' : 'center',
                borderRadius: '9999px',
                marginBottom: 2,
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              })}
            >
              {open ? label : <LayoutDashboard className="w-4 h-4" style={{ flexShrink: 0 }} />}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}