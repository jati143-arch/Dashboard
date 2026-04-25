import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tradesApi, dailyApi } from '../api/client.js';
import HeroCard from '../components/dashboard/HeroCard.jsx';
import PnlSummary from '../components/dashboard/PnlSummary.jsx';
import TodayTradeTable from '../components/dashboard/TodayTradeTable.jsx';
import BestSetups from '../components/dashboard/BestSetups.jsx';
import Modal from '../components/shared/Modal.jsx';
import TradeForm from '../components/trades/TradeForm.jsx';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function DailyDashboard() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);

  const { data: trades = [], isLoading: tradesLoading } = useQuery({
    queryKey: ['trades', selectedDate],
    queryFn: () => tradesApi.list({ date: selectedDate }),
  });

  const { data: daily, isLoading: dailyLoading } = useQuery({
    queryKey: ['daily', selectedDate],
    queryFn: () => dailyApi.get(selectedDate),
  });

  const bestTrade = trades.find(t => t.is_best_trade);

  const isLoading = tradesLoading || dailyLoading;

  return (
    <div>
      {/* Date picker + Add Trade */}
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
        <button className="btn-primary" onClick={() => { setEditingTrade(null); setShowForm(true); }}>
          + Add Trade
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading..." />
      ) : (
        <>
          <HeroCard trade={bestTrade} date={selectedDate} />
          <PnlSummary trades={trades} />
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
        </>
      )}

      {showForm && (
        <Modal
          title={editingTrade ? 'Edit Trade' : 'Add Trade'}
          onClose={() => { setShowForm(false); setEditingTrade(null); }}
          width={580}
        >
          <TradeForm
            trade={editingTrade}
            defaultDate={selectedDate}
            onClose={() => { setShowForm(false); setEditingTrade(null); }}
          />
        </Modal>
      )}
    </div>
  );
}
