import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { ChartProvider, useChart } from './context/ChartContext.jsx';
import { CurrencyProvider } from './context/CurrencyContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ChartModal from './components/chart/ChartModal.jsx';
import SignIn from './components/SignIn.jsx';
import MigrationBanner from './components/MigrationBanner.jsx';
import StatusBar from './components/layout/StatusBar.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import DailyDashboard from './pages/DailyDashboard.jsx';
import TradeLog from './pages/TradeLog.jsx';
import Performance from './pages/Performance.jsx';

import AiInsights from './pages/AiInsights.jsx';
import Investments from './pages/Investments.jsx';
import Backtest from './pages/Backtest.jsx';
import MarketHub from './pages/MarketHub.jsx';
import Watchlist from './pages/Watchlist.jsx';
import EconomicCalendar from './pages/EconomicCalendar.jsx';
import Screener from './pages/Screener.jsx';
import Settings from './pages/Settings.jsx';
import Research from './pages/Research.jsx';
import { Activity, BarChart3, PieChart, Star, LayoutDashboard, TrendingUp, Sun, Moon, Bell } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import AlertsPanel from './components/alerts/AlertsPanel.jsx';
import Modal from './components/shared/Modal.jsx';
import { useQuery } from '@tanstack/react-query';
import { alertsApi } from './api/client.js';

const BOTTOM_NAV_TABS = [
  { to: '/', label: 'Overview', icon: TrendingUp },
  { to: '/trades', label: 'Trades', icon: BarChart3 },
  { to: '/performance', label: 'Analytics', icon: PieChart },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
  { to: '/market', label: 'Market', icon: Activity },
];

function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav">
      {BOTTOM_NAV_TABS.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function TopNav({ onToggle }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.list,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const activeAlertsCount = alerts.filter(a => a.active).length;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <>
    <header className="top-nav-header" style={{
      height: 64,
      background: 'var(--surface-topnav)',
      backdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      justifyContent: 'space-between',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        <button onClick={onToggle} style={{
          background: 'transparent', border: 'none', color: 'var(--color-text-secondary)',
          fontSize: 20, cursor: 'pointer', padding: '4px', lineHeight: 1, flexShrink: 0,
        }}>
          <span style={{ display: 'inline-block', fontSize: 22 }}>&#9776;</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(34,255,136,0.3)',
          }}>
            <LayoutDashboard className="w-4 h-4 text-black" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em' }}>DASHBOARD</span>
          <span style={{
            fontSize: 9, fontFamily: 'var(--font-mono)', padding: '3px 8px',
            borderRadius: 9999, border: '1px solid rgba(255,255,255,0.2)',
            color: 'var(--color-accent-secondary)',
          }}>LIVE</span>
        </div>

        {/* Desktop-only tab pills */}
        <div className="desktop-nav-tabs" style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--color-border)',
          borderRadius: 9999, padding: '4px',
        }}>
          {BOTTOM_NAV_TABS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 9999,
              fontSize: 13, fontWeight: 500,
              color: isActive ? '#000' : 'var(--color-text-secondary)',
              background: isActive ? '#fff' : 'transparent',
              textDecoration: 'none', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: isActive ? '0 4px 16px rgba(255,255,255,0.15)' : 'none',
            })}>
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="top-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        {/* Desktop-only: market status + date */}
        <div className="desktop-meta" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-green)', display: 'inline-block', animation: 'pulse-dot 2.5s ease-in-out infinite' }} />
            <span style={{ color: 'var(--color-green)', letterSpacing: '0.08em' }}>MARKET OPEN</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{dateStr} · {timeStr}</span>
        </div>

        {/* Alerts bell — always visible */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setAlertsOpen(true)}
            title="Price Alerts"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border-bright)',
              borderRadius: 9999,
              padding: '6px 10px',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s',
            }}
          >
            <Bell className="w-4 h-4" />
          </button>
          {activeAlertsCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: 'var(--color-accent)',
              color: '#000', fontSize: 9, fontWeight: 700,
              borderRadius: 9999, minWidth: 16, height: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px',
            }}>{activeAlertsCount}</span>
          )}
        </div>

        {/* Theme toggle — always visible (this is what was missing on mobile) */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border-bright)',
            borderRadius: 9999,
            padding: '6px 10px',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s',
          }}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {user && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(o => !o)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'transparent', border: '1px solid var(--color-border-bright)',
              borderRadius: 9999, padding: '4px 4px', cursor: 'pointer',
              color: 'var(--color-text-primary)',
            }}>
              {user.photo ? <img src={user.photo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#000',
                }}>
                  {(user.name || user.email || '?')[0].toUpperCase()}
                </div>
              )}
              {/* Hide name on mobile — avatar only */}
              <span className="desktop-meta" style={{ fontSize: 12, fontWeight: 500 }}>{user.name || user.email}</span>
            </button>

            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  background: 'var(--surface-dropdown)', backdropFilter: 'blur(16px)',
                  border: '1px solid var(--color-border-bright)',
                  borderRadius: 16, padding: 8, minWidth: 200, zIndex: 100,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  animation: 'scalePop 0.18s ease',
                }}>
                  <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid var(--color-border)', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{user.email}</div>
                  </div>
                  <button onClick={() => { setMenuOpen(false); logout(); }} style={{
                    width: '100%', textAlign: 'left', padding: '8px 12px',
                    background: 'transparent', border: 'none', color: 'var(--color-red)',
                    fontSize: 13, cursor: 'pointer', borderRadius: 8,
                  }}>Sign out</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
    {alertsOpen && (
      <Modal title="Price Alerts" onClose={() => setAlertsOpen(false)} width={560}>
        <AlertsPanel onClose={() => setAlertsOpen(false)} />
      </Modal>
    )}
  </>
  );
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const { chartState, closeChart } = useChart();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopNav onToggle={() => setSidebarOpen(o => !o)} />
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg-base)' }}>
          <div className="main-content-inner" style={{ maxWidth: 1480, margin: '0 auto', padding: '32px 36px 48px' }}>
            <Routes>
              <Route path="/"            element={<DailyDashboard />} />
              <Route path="/market"      element={<MarketHub />} />
              <Route path="/watchlist"   element={<Watchlist />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/trades"      element={<TradeLog />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/calendar"    element={<EconomicCalendar />} />
              <Route path="/backtest"    element={<Backtest />} />
              <Route path="/screener"    element={<Screener />} />
              <Route path="/ai"          element={<AiInsights />} />
              <Route path="/research"    element={<Research />} />
              <Route path="/settings"    element={<Settings />} />
              <Route path="*"            element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
        <StatusBar />
        <MobileBottomNav />
      </div>
      {chartState && <ChartModal symbol={chartState.symbol} entryPrice={chartState.entryPrice} onClose={closeChart} />}
      <MigrationBanner />
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-base)', color: 'var(--color-text-secondary)' }}>Loading…</div>;
  if (!user) return <SignIn error={new URLSearchParams(window.location.search).get('error')} />;
  return (
    <BrowserRouter>
      <ChartProvider><CurrencyProvider><AppShell /></CurrencyProvider></ChartProvider>
    </BrowserRouter>
  );
}

export default function App() {
  return <ThemeProvider><AuthProvider><AuthGate /></AuthProvider></ThemeProvider>;
}