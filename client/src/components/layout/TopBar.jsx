import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

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
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

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
      position: 'relative',
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
        <span style={{ fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
          {today}
        </span>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--green)', boxShadow: '0 0 6px var(--green)', display: 'inline-block',
        }} title="Server connected" />

        {user && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 20, padding: '3px 10px 3px 4px',
                cursor: 'pointer', color: 'var(--text-primary)',
              }}
            >
              {user.photo
                ? <img src={user.photo} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#000' }}>
                    {(user.name || user.email || '?')[0].toUpperCase()}
                  </div>
              }
              <span style={{ fontSize: 12, fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name || user.email}
              </span>
            </button>

            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 8, minWidth: 200, zIndex: 100,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  <div style={{ padding: '6px 10px 10px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{user.email}</div>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '7px 10px',
                      background: 'transparent', border: 'none',
                      color: 'var(--red, #ff3355)', fontSize: 13, cursor: 'pointer',
                      borderRadius: 6,
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,51,85,0.1)'}
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
