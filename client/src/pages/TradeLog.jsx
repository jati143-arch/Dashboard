import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tradesApi } from '../api/client.js';
import { useCountUp } from '../hooks/useCountUp.js';
import TradeFilters from '../components/trades/TradeFilters.jsx';
import TradeTable from '../components/trades/TradeTable.jsx';
import Modal from '../components/shared/Modal.jsx';
import TradeForm from '../components/trades/TradeForm.jsx';
import CsvImport from '../components/trades/CsvImport.jsx';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';
import PnlBadge from '../components/shared/PnlBadge.jsx';
import CurrencyToggle from '../components/shared/CurrencyToggle.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { nativeOf } from '../utils/currency.js';

const EMPTY_FILTERS = { from: '', to: '', symbol: '', direction: '', pattern_tag: '' };

const CARD = {
  background: 'var(--color-bg-card)',
  backdropFilter: 'blur(24px)',
  border: '1px solid var(--color-border)',
  borderRadius: 24,
  padding: 28,
};

const TEXT_DIM = 'var(--color-text-dim)';
const TEXT_SECONDARY = 'var(--color-text-secondary)';
const TEXT_PRIMARY = 'var(--color-text-primary)';
const GREEN = 'var(--color-green)';
const RED = 'var(--color-red)';

const PILL_BTN = {
  padding: '8px 20px',
  borderRadius: 9999,
  border: '1px solid var(--color-border-bright)',
  background: 'var(--color-bg-card)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontWeight: 500,
};

const PILL_BTN_ACTIVE = {
  ...PILL_BTN,
  background: 'var(--color-accent)',
  color: '#000',
  border: '1px solid var(--color-accent)',
};

export default function TradeLog() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const { currency, rates } = useCurrency();

  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades', params],
    queryFn: () => tradesApi.list(params),
  });

  const totalPnl = trades.reduce((s, t) => s + (t.pnl_dollar ?? 0), 0);
  const wins = trades.filter(t => t.pnl_dollar > 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0;

  const countedLen = useCountUp(trades.length, 800, 0);
  const countedWinRate = useCountUp(winRate, 1000, 0);

  return (
    <div style={{ animation: 'fadeSlideUp 0.45s ease both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ ...CARD, padding: '20px 24px', minWidth: 120 }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>Trades Shown</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, color: TEXT_PRIMARY }}>{countedLen}</div>
          </div>
          <div style={{ ...CARD, padding: '20px 24px', minWidth: 140 }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>Total P&L</div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}><PnlBadge value={totalPnl} /></div>
          </div>
          <div style={{ ...CARD, padding: '20px 24px', minWidth: 120 }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>Win Rate</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, color: winRate >= 50 ? GREEN : RED }}>
              {trades.length ? `${countedWinRate}%` : '—'}
            </div>
          </div>
          <CurrencyToggle />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={PILL_BTN} onClick={() => setShowImport(true)}>↑ Import CSV</button>
          <button style={PILL_BTN_ACTIVE} onClick={() => { setEditingTrade(null); setShowForm(true); }}>+ Add Trade</button>
        </div>
      </div>

      <TradeFilters filters={filters} onChange={setFilters} />

      <div className="card-glass" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingSpinner text="Loading trades..." />
        ) : (
          <TradeTable trades={trades} onEdit={(t) => { setEditingTrade(t); setShowForm(true); }} />
        )}
      </div>

      {showForm && (
        <Modal title={editingTrade ? 'Edit Trade' : 'Add Trade'} onClose={() => { setShowForm(false); setEditingTrade(null); }} width={580}>
          <TradeForm trade={editingTrade} onClose={() => { setShowForm(false); setEditingTrade(null); }} />
        </Modal>
      )}

      {showImport && (
        <Modal title="Import from CSV" onClose={() => setShowImport(false)} width={680}>
          <CsvImport onClose={() => setShowImport(false)} />
        </Modal>
      )}
    </div>
  );
}