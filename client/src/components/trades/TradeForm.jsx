import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tradesApi, patternsApi } from '../../api/client.js';

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = {
  date: today(), symbol: '', instrument_type: 'stock', direction: 'long',
  entry_price: '', exit_price: '', size: '', pnl_dollar: '', pnl_percent: '',
  pattern_tag: '', entry_time: '', exit_time: '', notes: '', is_best_trade: false,
};

export default function TradeForm({ trade, onClose, defaultDate }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(trade ? { ...trade, is_best_trade: !!trade.is_best_trade } : { ...EMPTY, date: defaultDate || today() });
  const [autoCalc, setAutoCalc] = useState(!trade);

  const { data: patterns = [] } = useQuery({ queryKey: ['patterns'], queryFn: patternsApi.list });

  const { mutate, isPending } = useMutation({
    mutationFn: trade ? (data) => tradesApi.update(trade.id, data) : (data) => tradesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trades'] });
      onClose();
    },
  });

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
  }

  useEffect(() => {
    if (!autoCalc) return;
    const entry = parseFloat(form.entry_price);
    const exit = parseFloat(form.exit_price);
    const size = parseFloat(form.size);
    if (!isNaN(entry) && !isNaN(exit) && !isNaN(size) && size > 0) {
      const pnlD = form.direction === 'short'
        ? (entry - exit) * size
        : (exit - entry) * size;
      const cost = entry * size;
      const pnlP = cost !== 0 ? (pnlD / cost) * 100 : 0;
      setForm(f => ({
        ...f,
        pnl_dollar: pnlD.toFixed(2),
        pnl_percent: pnlP.toFixed(2),
      }));
    }
  }, [form.entry_price, form.exit_price, form.size, form.direction, autoCalc]);

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      entry_price: parseFloat(form.entry_price),
      exit_price: parseFloat(form.exit_price),
      size: parseFloat(form.size),
      pnl_dollar: parseFloat(form.pnl_dollar),
      pnl_percent: parseFloat(form.pnl_percent),
    };
    mutate(payload);
  }

  const row = { display: 'grid', gap: 12, marginBottom: 14 };
  const row2 = { ...row, gridTemplateColumns: '1fr 1fr' };
  const row3 = { ...row, gridTemplateColumns: '1fr 1fr 1fr' };

  return (
    <form onSubmit={handleSubmit}>
      <div style={row2}>
        <div><label>Date</label><input type="date" value={form.date} onChange={e => set('date', e.target.value)} required /></div>
        <div>
          <label>Symbol</label>
          <input value={form.symbol} onChange={e => set('symbol', e.target.value.toUpperCase())} placeholder="AAPL, BTC..." required />
        </div>
      </div>

      <div style={row3}>
        <div>
          <label>Instrument</label>
          <select value={form.instrument_type} onChange={e => set('instrument_type', e.target.value)}>
            <option value="stock">Stock</option>
            <option value="crypto">Crypto</option>
          </select>
        </div>
        <div>
          <label>Direction</label>
          <select value={form.direction} onChange={e => set('direction', e.target.value)}>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>
        <div>
          <label>Size / Shares</label>
          <input type="number" step="any" min="0" value={form.size} onChange={e => set('size', e.target.value)} placeholder="100" required />
        </div>
      </div>

      <div style={row3}>
        <div><label>Entry Price $</label><input type="number" step="any" value={form.entry_price} onChange={e => set('entry_price', e.target.value)} placeholder="0.00" required /></div>
        <div><label>Exit Price $</label><input type="number" step="any" value={form.exit_price} onChange={e => set('exit_price', e.target.value)} placeholder="0.00" /></div>
        <div>
          <label>Entry Time</label>
          <input type="time" value={form.entry_time} onChange={e => set('entry_time', e.target.value)} />
        </div>
      </div>

      <div style={row3}>
        <div>
          <label>P&L $ {autoCalc && <span style={{ color: 'var(--accent)', fontWeight: 400 }}>(auto)</span>}</label>
          <input type="number" step="any" value={form.pnl_dollar}
            onChange={e => { setAutoCalc(false); set('pnl_dollar', e.target.value); }}
            placeholder="Auto-calculated" />
        </div>
        <div>
          <label>P&L %</label>
          <input type="number" step="any" value={form.pnl_percent}
            onChange={e => { setAutoCalc(false); set('pnl_percent', e.target.value); }}
            placeholder="Auto-calculated" />
        </div>
        <div>
          <label>Exit Time</label>
          <input type="time" value={form.exit_time} onChange={e => set('exit_time', e.target.value)} />
        </div>
      </div>

      <div style={row2}>
        <div>
          <label>Pattern / Setup</label>
          <select value={form.pattern_tag} onChange={e => set('pattern_tag', e.target.value)}>
            <option value="">— None —</option>
            {patterns.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0, fontSize: 13, color: 'var(--text-primary)', marginBottom: 0 }}>
            <input
              type="checkbox"
              checked={!!form.is_best_trade}
              onChange={e => set('is_best_trade', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--yellow)' }}
            />
            ★ Mark as best trade
          </label>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label>Notes / Lesson</label>
        <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="What happened? What did you learn?" style={{ resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Saving...' : trade ? 'Update Trade' : 'Add Trade'}
        </button>
      </div>
    </form>
  );
}
