import { NavLink } from 'react-router-dom';
import {
  BarChart3, LayoutDashboard, Activity, Star, PieChart, Database,
  Clock, Calculator, BookOpen, Sparkles, Settings2,
} from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/market', label: 'Market', icon: Activity },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
  { to: '/investments', label: 'Investments', icon: Database },
  { to: '/trades', label: 'Trade Log', icon: BarChart3 },
  { to: '/performance', label: 'Performance', icon: PieChart },
  { to: '/calendar', label: 'Calendar', icon: Clock },
  { to: '/backtest', label: 'Backtest', icon: Calculator },
  { to: '/screener', label: 'Screener', icon: BookOpen },
  { to: '/ai', label: 'AI', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings2 },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div onClick={onClose} className="sidebar-backdrop" />}

      <aside
        className={`sidebar ${open ? 'sidebar-open' : ''}`}
        style={{
          width: open ? 220 : 60,
          background: 'rgba(3,3,8,0.7)',
          backdropFilter: 'blur(24px)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          transition: 'width 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          overflow: 'hidden',
          zIndex: 100,
        }}
      >
        <div style={{
          padding: open ? '20px 16px 16px' : '20px 0 16px',
          borderBottom: '1px solid var(--color-border)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textAlign: open ? 'left' : 'center',
        }}>
          {open ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-secondary)] shadow-[0_0_24px_rgba(34,255,136,0.3)]">
                <BarChart3 className="w-4 h-4 text-black" />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>DASHBOARD</div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-secondary)]">
                <BarChart3 className="w-4 h-4 text-black" />
              </div>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={!open ? label : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: open ? 10 : 0,
                padding: open ? '10px 14px' : '10px 0',
                justifyContent: open ? 'flex-start' : 'center',
                borderRadius: 12,
                marginBottom: 4,
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                background: isActive ? 'rgba(34,255,136,0.08)' : 'transparent',
                border: isActive ? '1px solid rgba(34,255,136,0.15)' : '1px solid transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                textDecoration: 'none',
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              })}
            >
              {open ? (
                <>
                  <Icon className="w-5 h-5" style={{ flexShrink: 0 }} />
                  {label}
                </>
              ) : (
                <Icon className="w-4 h-4" style={{ flexShrink: 0 }} />
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}