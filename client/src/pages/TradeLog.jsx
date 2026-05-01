import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tradesApi } from '../api/client.js';
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trades Shown</div>
            <div style={{ fontFamily: 'var(--text-mono)', fontSize: 20, fontWeight: 700 }}>{trades.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total P&L</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}><PnlBadge value={totalPnl} /></div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Win Rate</div>
            <div style={{ fontFamily: 'var(--text-mono)', fontSize: 20, fontWeight: 700, color: winRate >= 50 ? 'var(--green)' : 'var(--red)' }}>
              {trades.length ? `${winRate}%` : '—'}
            </div>
          </div>
          <CurrencyToggle />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => setShowImport(true)}>↑ Import CSV</button>
          <button className="btn-primary" onClick={() => { setEditingTrade(null); setShowForm(true); }}>+ Add Trade</button>
        </div>
      </div>

      <TradeFilters filters={filters} onChange={setFilters} />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
