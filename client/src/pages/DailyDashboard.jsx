import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tradesApi, dailyApi, statsApi, pricesApi } from '../api/client.js';
import OpenPositions from '../components/dashboard/OpenPositions.jsx';
import HeroCard from '../components/dashboard/HeroCard.jsx';
import PnlSummary from '../components/dashboard/PnlSummary.jsx';
import TodayTradeTable from '../components/dashboard/TodayTradeTable.jsx';
import BestSetups from '../components/dashboard/BestSetups.jsx';
import NewsWidget from '../components/dashboard/NewsWidget.jsx';
import Modal from '../components/shared/Modal.jsx';
import TradeForm from '../components/trades/TradeForm.jsx';
import CsvImport from '../components/trades/CsvImport.jsx';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';

const todayStr = () => new Date().toISOString().slice(0, 10);

// Before 9:15 AM IST (UTC+5:30 = +330 min), day trading P&L resets to 0
function isBeforeMarketOpen() {
  const now = new Date();
  const istMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
  return istMinutes < 555; // 9 * 60 + 15
}

export default function DailyDashboard() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);

  const { data: trades = [], isLoading: tradesLoading } = useQuery({
    queryKey: ['trades', selectedDate],
    queryFn: () => tradesApi.list({ date: selectedDate }),
  });

  const { data: daily, isLoading: dailyLoading } = useQuery({
    queryKey: ['daily', selectedDate],
    queryFn: () => dailyApi.get(selectedDate),
  });

  const { data: allTimeStats } = useQuery({
    queryKey: ['stats', 'all', ''],
    queryFn: () => statsApi.summary('all', ''),
    staleTime: 60_000,
  });

  // Open positions for unrealized P&L and news widget
  const { data: openTrades = [] } = useQuery({
    queryKey: ['trades', { status: 'open' }],
    queryFn: () => tradesApi.list({ status: 'open' }),
    staleTime: 60_000,
  });

  const openSymbols = [...new Set(
    openTrades
      .filter(t => t.instrument_type !== 'mutual_fund')
      .map(t => t.symbol),
  )];

  const { data: prices = {} } = useQuery({
    queryKey: ['prices', openSymbols],
    queryFn: () => pricesApi.get(openSymbols),
    enabled: openSymbols.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // Sum unrealized P&L from open non-MF positions using live prices
  const unrealizedPnl = openTrades
    .filter(t => t.instrument_type !== 'mutual_fund')
    .reduce((sum, t) => {
      const cp = prices[t.symbol]?.price;
      if (!cp) return sum;
      const qty = t.remaining_size ?? t.size;
      const raw = t.direction === 'long'
        ? (cp - t.entry_price) * qty
        : (t.entry_price - cp) * qty;
      return sum + raw;
    }, 0);

  const openNonMfCount = openTrades.filter(t => t.instrument_type !== 'mutual_fund').length;

  // Only closed, non-MF trades count toward day realized stats
  const closedTrades = trades.filter(t => t.status === 'closed' && t.instrument_type !== 'mutual_fund');
  const bestTrade = trades.find(t => t.is_best_trade);
  const isLoading = tradesLoading || dailyLoading;

  return (
    <div>
      {/* Open positions — always visible regardless of selected date */}
      <OpenPositions />

      {/* Date picker + buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ width: 150 }}
          />
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setSelectedDate(todayStr())}>Today</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => setShowImport(true)}>↑ Import CSV</button>
          <button className="btn-primary" onClick={() => { setEditingTrade(null); setShowForm(true); }}>
            ◉ Open Position
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading..." />
      ) : (
        <>
          <HeroCard trade={bestTrade} date={selectedDate} />
          <PnlSummary
            trades={closedTrades}
            allTimePnl={allTimeStats?.total_pnl}
            unrealizedPnl={unrealizedPnl}
            openNonMfCount={openNonMfCount}
            beforeMarketOpen={isBeforeMarketOpen()}
          />
          <TodayTradeTable
            trades={trades}
            date={selectedDate}
            onEdit={(t) => { setEditingTrade(t); setShowForm(true); }}
          />
          <BestSetups
            date={selectedDate}
            setups={daily?.best_setups || []}
            lesson={daily?.lesson_of_day || ''}
          />
          {daily?.ai_insight && (
            <div className="card" style={{ marginTop: 8, borderLeft: '3px solid var(--accent)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                ✦ AI Insight — {selectedDate}
              </div>
              <pre style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {daily.ai_insight}
              </pre>
            </div>
          )}
          <NewsWidget symbols={openSymbols} />
        </>
      )}

      {showImport && (
        <Modal title="Import from CSV" onClose={() => setShowImport(false)} width={680}>
          <CsvImport onClose={() => { setShowImport(false); }} />
        </Modal>
      )}

      {showForm && (
        <Modal
          title={editingTrade?.id ? 'Edit Trade' : editingTrade?.status === 'closed' ? 'Add Closed Trade' : 'Open New Position'}
          onClose={() => { setShowForm(false); setEditingTrade(null); }}
          width={580}
        >
          <TradeForm
            trade={editingTrade?.id ? editingTrade : null}
            defaultDate={selectedDate}
            defaultStatus={editingTrade?.status || 'open'}
            onClose={() => { setShowForm(false); setEditingTrade(null); }}
          />
        </Modal>
      )}
    </div>
  );
}
