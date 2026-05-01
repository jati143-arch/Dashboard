import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tradesApi, dailyApi, statsApi, pricesApi } from '../api/client.js';
import OpenPositions from '../components/dashboard/OpenPositions.jsx';
import HeroCard from '../components/dashboard/HeroCard.jsx';
import PnlSummary from '../components/dashboard/PnlSummary.jsx';
import BestSetups from '../components/dashboard/BestSetups.jsx';
import NewsWidget from '../components/dashboard/NewsWidget.jsx';
import Modal from '../components/shared/Modal.jsx';
import TradeForm from '../components/trades/TradeForm.jsx';
import CsvImport from '../components/trades/CsvImport.jsx';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { nativeOf, convert } from '../utils/currency.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

function isBeforeMarketOpen() {
  const now = new Date();
  const istMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
  return istMinutes < 555;
}

export default function DailyDashboard() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);

  const { currency, rates } = useCurrency();

  // Today's trades by entry date — for HeroCard, BestSetups, displayTrades
  const { data: todayTrades = [] } = useQuery({
    queryKey: ['trades', todayStr()],
    queryFn: () => tradesApi.list({ date: todayStr() }),
    staleTime: 30_000,
  });

  // Today's REALIZED closed trades — matched by exit_date (catches multi-day trades closed today)
  const { data: realizedToday = [] } = useQuery({
    queryKey: ['trades', 'realized', todayStr()],
    queryFn: () => tradesApi.list({ realized_on: todayStr() }),
    staleTime: 30_000,
  });

  // Selected date trades (only fetched when not today)
  const { data: selectedTrades = [], isLoading: tradesLoading } = useQuery({
    queryKey: ['trades', selectedDate],
    queryFn: () => tradesApi.list({ date: selectedDate }),
    enabled: selectedDate !== todayStr(),
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

  // Open positions
  const { data: openTrades = [] } = useQuery({
    queryKey: ['trades', { status: 'open' }],
    queryFn: () => tradesApi.list({ status: 'open' }),
    staleTime: 60_000,
  });

  const openSymbols = [...new Set(
    openTrades.filter(t => t.instrument_type !== 'mutual_fund').map(t => t.symbol),
  )];

  const { data: prices = {} } = useQuery({
    queryKey: ['prices', openSymbols],
    queryFn: () => pricesApi.get(openSymbols),
    enabled: openSymbols.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const openNonMf = openTrades.filter(t => t.instrument_type !== 'mutual_fund');
  const openNonMfCount = openNonMf.length;

  // Today's gain: price change × qty, converted to display currency
  const todaysGain = openNonMf.reduce((sum, t) => {
    const p = prices[t.symbol];
    if (!p || p.change == null) return sum;
    const native = nativeOf(t.symbol, t.instrument_type);
    const changeDisplay = convert(p.change, native, currency, rates);
    return sum + changeDisplay * (t.remaining_size ?? t.size);
  }, 0);

  // Unrealized P&L: (current - entry) × qty, converted to display currency
  const unrealizedPnl = openNonMf.reduce((sum, t) => {
    const cp = prices[t.symbol]?.price;
    if (!cp) return sum;
    const qty = t.remaining_size ?? t.size;
    const native = nativeOf(t.symbol, t.instrument_type);
    const pnlNative = t.direction === 'long'
      ? (cp - t.entry_price) * qty
      : (t.entry_price - cp) * qty;
    return sum + convert(pnlNative, native, currency, rates);
  }, 0);

  // Today's closed trades for Win Rate / Trades count tiles
  const closedTodayTrades = realizedToday.filter(t => t.instrument_type !== 'mutual_fund');

  // For HeroCard and BestSetups use selected date's trades
  const displayTrades = selectedDate === todayStr() ? todayTrades : selectedTrades;
  const bestTrade = displayTrades.find(t => t.is_best_trade);

  const isLoading = dailyLoading || (selectedDate !== todayStr() && tradesLoading);

  return (
    <div>
      {/* 1. P&L Summary tiles */}
      <PnlSummary
        trades={closedTodayTrades}
        openTrades={openTrades}
        allTimePnl={allTimeStats?.total_pnl}
        unrealizedPnl={unrealizedPnl}
        todaysGain={todaysGain}
        openNonMfCount={openNonMfCount}
        beforeMarketOpen={isBeforeMarketOpen()}
      />

      {/* 2. Portfolio News */}
      <NewsWidget symbols={openSymbols} />

      {/* 3. Open Positions */}
      <OpenPositions />

      {/* 4. Date picker + action buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 8 }}>
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

      {/* 5–7. Date-specific content */}
      {isLoading ? (
        <LoadingSpinner text="Loading..." />
      ) : (
        <>
          <HeroCard trade={bestTrade} date={selectedDate} />
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
        </>
      )}

      {showImport && (
        <Modal title="Import from CSV" onClose={() => setShowImport(false)} width={680}>
          <CsvImport onClose={() => setShowImport(false)} />
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
