import { useQuery } from '@tanstack/react-query';
import { patternsApi } from '../../api/client.js';

export default function TradeFilters({ filters, onChange }) {
  const { data: patterns = [] } = useQuery({ queryKey: ['patterns'], queryFn: patternsApi.list });
  const set = (field, val) => onChange({ ...filters, [field]: val });

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
      <div>
        <label>From</label>
        <input type="date" value={filters.from || ''} onChange={e => set('from', e.target.value)} style={{ width: 140 }} />
      </div>
      <div>
        <label>To</label>
        <input type="date" value={filters.to || ''} onChange={e => set('to', e.target.value)} style={{ width: 140 }} />
      </div>
      <div>
        <label>Symbol</label>
        <input value={filters.symbol || ''} onChange={e => set('symbol', e.target.value.toUpperCase())} placeholder="AAPL..." style={{ width: 100 }} />
      </div>
      <div>
        <label>Direction</label>
        <select value={filters.direction || ''} onChange={e => set('direction', e.target.value)} style={{ width: 100 }}>
          <option value="">All</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
      </div>
      <div>
        <label>Status</label>
        <select value={filters.status || ''} onChange={e => set('status', e.target.value)} style={{ width: 100 }}>
          <option value="">All</option>
          <option value="closed">Closed</option>
          <option value="open">Open</option>
        </select>
      </div>
      <div>
        <label>Result</label>
        <select value={filters.result || ''} onChange={e => set('result', e.target.value)} style={{ width: 110 }}>
          <option value="">All</option>
          <option value="win">Winners ↑</option>
          <option value="loss">Losers ↓</option>
        </select>
      </div>
      <div>
        <label>Pattern</label>
        <select value={filters.pattern_tag || ''} onChange={e => set('pattern_tag', e.target.value)} style={{ width: 140 }}>
          <option value="">All</option>
          {patterns.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label>Sort by</label>
        <select value={filters.sort || ''} onChange={e => set('sort', e.target.value)} style={{ width: 150 }}>
          <option value="">Date (newest)</option>
          <option value="pnl_desc">P&L — Best first</option>
          <option value="pnl_asc">P&L — Worst first</option>
        </select>
      </div>
      <button className="btn-ghost" onClick={() => onChange({ from: '', to: '', symbol: '', direction: '', status: '', result: '', pattern_tag: '', sort: '' })} style={{ fontSize: 12 }}>
        Clear
      </button>
    </div>
  );
}
