import { useQuery } from '@tanstack/react-query';
import { patternsApi } from '../../api/client.js';

export default function TradeFilters({ filters, onChange }) {
  const { data: patterns = [] } = useQuery({ queryKey: ['patterns'], queryFn: patternsApi.list });
  const set = (field, val) => onChange({ ...filters, [field]: val });

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>From</label>
        <input type="date" value={filters.from || ''} onChange={e => set('from', e.target.value)} style={{ width: 140, background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, padding: '6px 12px', color: '#ffffff', fontSize: 13 }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>To</label>
        <input type="date" value={filters.to || ''} onChange={e => set('to', e.target.value)} style={{ width: 140, background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, padding: '6px 12px', color: '#ffffff', fontSize: 13 }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Symbol</label>
        <input value={filters.symbol || ''} onChange={e => set('symbol', e.target.value.toUpperCase())} placeholder="AAPL..." style={{ width: 100, background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, padding: '6px 12px', color: '#ffffff', fontSize: 13 }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Direction</label>
        <select value={filters.direction || ''} onChange={e => set('direction', e.target.value)} style={{ width: 100, background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, padding: '6px 12px', color: '#ffffff', fontSize: 13 }}>
          <option value="">All</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Status</label>
        <select value={filters.status || ''} onChange={e => set('status', e.target.value)} style={{ width: 100, background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, padding: '6px 12px', color: '#ffffff', fontSize: 13 }}>
          <option value="">All</option>
          <option value="closed">Closed</option>
          <option value="open">Open</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Result</label>
        <select value={filters.result || ''} onChange={e => set('result', e.target.value)} style={{ width: 110, background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, padding: '6px 12px', color: '#ffffff', fontSize: 13 }}>
          <option value="">All</option>
          <option value="win">Winners ↑</option>
          <option value="loss">Losers ↓</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Pattern</label>
        <select value={filters.pattern_tag || ''} onChange={e => set('pattern_tag', e.target.value)} style={{ width: 140, background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, padding: '6px 12px', color: '#ffffff', fontSize: 13 }}>
          <option value="">All</option>
          {patterns.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Sort by</label>
        <select value={filters.sort || ''} onChange={e => set('sort', e.target.value)} style={{ width: 150, background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, padding: '6px 12px', color: '#ffffff', fontSize: 13 }}>
          <option value="">Date (newest)</option>
          <option value="pnl_desc">P&L — Best first</option>
          <option value="pnl_asc">P&L — Worst first</option>
        </select>
      </div>
      <button onClick={() => onChange({ from: '', to: '', symbol: '', direction: '', status: '', result: '', pattern_tag: '', sort: '' })} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#71717a', padding: '6px 16px', borderRadius: 9999, cursor: 'pointer', fontSize: 12 }}>
        Clear
      </button>
    </div>
  );
}