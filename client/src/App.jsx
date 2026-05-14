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
import PatternLibrary from './pages/PatternLibrary.jsx';
import AiInsights from './pages/AiInsights.jsx';
import Investments from './pages/Investments.jsx';
import Backtest from './pages/Backtest.jsx';
import MarketHub from './pages/MarketHub.jsx';
import Watchlist from './pages/Watchlist.jsx';
import EconomicCalendar from './pages/EconomicCalendar.jsx';
import Screener from './pages/Screener.jsx';
import Settings from './pages/Settings.jsx';
import { Activity, BarChart3, PieChart, Star, LayoutDashboard, TrendingUp } from 'lucide-react';

function TopNav({ onToggle }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const tabs = [
    { to: '/', label: 'Overview', icon: TrendingUp },
    { to: '/trades', label: 'Trade Log', icon: BarChart3 },
    { to: '/performance', label: 'Analytics', icon: PieChart },
    { to: '/watchlist', label: 'Watchlist', icon: Star },
    { to: '/market', label: 'Market', icon: Activity },
  ];

  return (
    <header style={{
      height: 64,
      background: 'rgba(10,10,10,0.95)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      justifyContent: 'space-between',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onToggle} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: 16, cursor: 'pointer', padding: '4px' }}>☰</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px -3px var(--color-accent)' }}>
            <LayoutDashboard className="w-4 h-4 text-black" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>NEXUS</span>
          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.15)', color: 'var(--color-accent-secondary)', fontFamily: 'var(--font-mono)' }}>LIVE</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 24, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9999, padding: '3px' }}>
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 9999,
              fontSize: 13, fontWeight: 500, color: isActive ? '#000' : 'var(--color-text-secondary)',
              background: isActive ? '#fff' : 'transparent', textDecoration: 'none', transition: 'all 0.2s',
              boxShadow: isActive ? '0 4px 16px rgba(255,255,255,0.12)' : 'none',
            })}>
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-green)', display: 'inline-block', animation: 'pulse-dot 2.5s ease-in-out infinite' }} />
          <span style={{ color: 'var(--color-green)', letterSpacing: '0.08em' }}>MARKET OPEN</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{dateStr} · {timeStr}</span>

        {user && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(o => !o)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 9999, padding: '4px 12px 4px 4px', cursor: 'pointer', color: 'var(--color-text-primary)',
            }}>
              {user.photo ? <img src={user.photo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#000' }}>
                  {(user.name || user.email || '?')[0].toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 12, fontWeight: 500 }}>{user.name || user.email}</span>
            </button>

            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 8, minWidth: 200, zIndex: 100, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                  <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{user.email}</div>
                  </div>
                  <button onClick={() => { setMenuOpen(false); logout(); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--color-red)', fontSize: 13, cursor: 'pointer', borderRadius: 8 }}>Sign out</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { chartState, closeChart } = useChart();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopNav onToggle={() => setSidebarOpen(o => !o)} />
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg-base)' }}>
          <div style={{ maxWidth: 1480, margin: '0 auto', padding: '24px 40px' }}>
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
              <Route path="/patterns"    element={<PatternLibrary />} />
              <Route path="/ai"          element={<AiInsights />} />
              <Route path="/settings"    element={<Settings />} />
              <Route path="*"            element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
        <StatusBar />
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
  return <AuthProvider><AuthGate /></AuthProvider>;
}