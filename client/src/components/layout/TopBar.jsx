import { useState } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Activity, BarChart3, PieChart, Star } from 'lucide-react';

const tabs = [
  { to: '/',            label: 'Overview',    icon: Activity },
  { to: '/trades',       label: 'Trade Log',   icon: BarChart3 },
  { to: '/performance',  label: 'Analytics',   icon: PieChart },
  { to: '/watchlist',    label: 'Watchlist',   icon: Star },
];

export default function TopBar({ onToggle }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header style={{
      height: 60,
      background: 'rgba(10,10,10,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <button
          onClick={onToggle}
          style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: 16, cursor: 'pointer', padding: '4px' }}
        >
          ☰
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? '#000' : 'var(--color-text-secondary)',
                background: isActive ? '#fff' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 4px 12px rgba(255,255,255,0.1)' : 'none',
              })}
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          <span className="status-bar-dot" />
          <span style={{ color: 'var(--color-green)', letterSpacing: '0.08em' }}>MARKET OPEN</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {dateStr} · {timeStr}
        </span>

        {user && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 9999, padding: '4px 12px 4px 4px',
                cursor: 'pointer', color: 'var(--color-text-primary)',
              }}
            >
              {user.photo
                ? <img src={user.photo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#000' }}>
                    {(user.name || user.email || '?')[0].toUpperCase()}
                  </div>
              }
              <span style={{ fontSize: 12, fontWeight: 500 }}>{user.name || user.email}</span>
            </button>

            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  background: '#111', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, padding: 8, minWidth: 200, zIndex: 100,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                }}>
                  <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{user.email}</div>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--color-red)', fontSize: 13, cursor: 'pointer', borderRadius: 8 }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,68,68,0.1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}