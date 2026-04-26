import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar.jsx';
import TopBar from './components/layout/TopBar.jsx';
import DailyDashboard from './pages/DailyDashboard.jsx';
import TradeLog from './pages/TradeLog.jsx';
import Performance from './pages/Performance.jsx';
import PatternLibrary from './pages/PatternLibrary.jsx';
import AiInsights from './pages/AiInsights.jsx';
import Investments from './pages/Investments.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopBar />
          <main style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--bg-base)' }}>
            <Routes>
              <Route path="/" element={<DailyDashboard />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/trades" element={<TradeLog />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/patterns" element={<PatternLibrary />} />
              <Route path="/ai" element={<AiInsights />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
