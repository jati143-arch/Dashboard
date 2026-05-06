import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar.jsx';
import TopBar from './components/layout/TopBar.jsx';
import MarketTicker from './components/layout/MarketTicker.jsx';
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
import Settings from './pages/Settings.jsx';
import { ChartProvider, useChart } from './context/ChartContext.jsx';
import { CurrencyProvider } from './context/CurrencyContext.jsx';
import ChartModal from './components/chart/ChartModal.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import SignIn from './components/SignIn.jsx';
import MigrationBanner from './components/MigrationBanner.jsx';

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const { chartState, closeChart } = useChart();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar onToggle={() => setSidebarOpen(o => !o)} />
        <MarketTicker />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--bg-base)' }}>
          <Routes>
            <Route path="/"            element={<DailyDashboard />} />
            <Route path="/market"      element={<MarketHub />} />
            <Route path="/watchlist"   element={<Watchlist />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/trades"      element={<TradeLog />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/calendar"    element={<EconomicCalendar />} />
            <Route path="/patterns"    element={<PatternLibrary />} />
            <Route path="/ai"          element={<AiInsights />} />
            <Route path="/backtest"    element={<Backtest />} />
            <Route path="/settings"    element={<Settings />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      {chartState && (
        <ChartModal
          symbol={chartState.symbol}
          entryPrice={chartState.entryPrice}
          onClose={closeChart}
        />
      )}
      <MigrationBanner />
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    const params = new URLSearchParams(window.location.search);
    return <SignIn error={params.get('error')} />;
  }

  return (
    <BrowserRouter>
      <ChartProvider>
        <CurrencyProvider>
          <AppShell />
        </CurrencyProvider>
      </ChartProvider>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

