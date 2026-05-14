import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tradesApi, patternsApi } from '../../api/client.js';
import TickerInput from './TickerInput.jsx';
import OpenPositionsSelect from './OpenPositionsSelect.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = {
  date: today(), symbol: '', instrument_type: 'stock', direction: 'long',
  entry_price: '', exit_price: '', exit_date: '', size: '',
  pnl_dollar: '', pnl_percent: '',
  pattern_tag: '', notes: '',
  is_best_trade: false, status: 'closed',
};

const inputStyle = {
  width: '100%', background: '#111111', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 9999, padding: '8px 14px', color: '#ffffff', fontSize: 13, boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block', fontSize: 10, color: '#52525b', textTransform: 'uppercase',
  letterSpacing: '0.07em', marginBottom: 8, fontWeight: 600,
};

export default function TradeForm({ trade, onClose, defaultDate, defaultStatus }) {
  const qc = useQueryClient();
  const initStatus = trade?.status || defaultStatus || 'closed';
  const [form, setForm] = useState(
    trade
      ? { ...EMPTY, ...trade, is_best_trade: !!trade.is_best_trade }
      : { ...EMPTY, date: defaultDate || today(), status: initStatus }
  );
  const [autoCalc, setAutoCalc] = useState(!trade);
  const [symbolHint, setSymbolHint] = useState(null);
  const hintTimer = useRef(null);

  const { data: patterns = [] } = useQuery({ queryKey: ['patterns'], queryFn: patternsApi.list });

  const { mutate, isPending } = useMutation({
    mutationFn: trade ? (data) => tradesApi.update(trade.id, data) : (data) => tradesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trades'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['daily'] });
      onClose();
    },
  });

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  const isOpen = form.status === 'open';

  useEffect(() => {
    const sym = form.symbol.trim();
    if (!sym || isOpen) { setSymbolHint(null); return; }
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(async () => {
      try {
        const hint = await tradesApi.symbolStats(sym);
        setSymbolHint(hint);
      } catch { setSymbolHint(null); }
    }, 600);
    return () => clearTimeout(hintTimer.current);
  }, [form.symbol, isOpen]);

  useEffect(() => {
    if (!autoCalc || isOpen) return;
    const entry = parseFloat(form.entry_price);
    const exit  = parseFloat(form.exit_price);
    const size  = parseFloat(form.size);
    if (!isNaN(entry) && !isNaN(exit) && !isNaN(size) && size > 0) {
      const pnlD = form.direction === 'short' ? (entry - exit) * size : (exit - entry) * size;
      const cost = entry * size;
      setForm(f => ({
        ...f,
        pnl_dollar:  pnlD.toFixed(2),
        pnl_percent: cost !== 0 ? ((pnlD / cost) * 100).toFixed(2) : '0',
      }));
    }
  }, [form.entry_price, form.exit_price, form.size, form.direction, autoCalc, isOpen]);

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      entry_price: parseFloat(form.entry_price),
      exit_price:  isOpen ? null : parseFloat(form.exit_price) || null,
      size:        parseFloat(form.size),
      pnl_dollar:  isOpen ? null : parseFloat(form.pnl_dollar) || null,
      pnl_percent: isOpen ? null : parseFloat(form.pnl_percent) || null,
    };
    mutate(payload);
  }

  const isClosingNewRecord = !trade?.id && form.status === 'closed';

  const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 };
  const row3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['open', 'closed'].map(s => (
          <button
            key={s}
            type="button"
            onClick={() => set('status', s)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 9999,
              background: form.status === s
                ? (s === 'open' ? '#ffd60a' : '#22ff88')
                : 'transparent',
              border: form.status === s ? 'none' : '1px solid rgba(255,255,255,0.06)',
              color: form.status === s ? '#000' : '#71717a',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            {s === 'open' ? '◉ Open Position' : '✓ Closed Trade'}
          </button>
        ))}
      </div>

      <div style={row2}>
        <div>
          <label style={labelStyle}>Entry Date</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Symbol</label>
          {form.instrument_type === 'mutual_fund' ? (
            <>
              <input
                type="text"
                value={form.symbol}
                onChange={e => set('symbol', e.target.value.trim())}
                placeholder="AMFI scheme code (e.g. 120503)"
                required
                style={inputStyle}
              />
              <div style={{ fontSize: 11, color: '#52525b', marginTop: 6 }}>
                Enter the AMFI scheme code number. Find it at amfiindia.com.
              </div>
            </>
          ) : isClosingNewRecord ? (
            <OpenPositionsSelect
              value={form.symbol}
              onSelect={(sym, type, size) => setForm(f => ({
                ...f, symbol: sym, instrument_type: type,
                size: size != null ? String(size) : f.size,
              }))}
            />
          ) : (
            <>
              <TickerInput
                value={form.symbol}
                onChange={v => set('symbol', v)}
                onSelect={(sym, type) => setForm(f => ({ ...f, symbol: sym, instrument_type: type }))}
              />
              {symbolHint && (
                <div style={{ fontSize: 11, color: '#52525b', marginTop: 6 }}>
                  Previously traded · Last buy: ${symbolHint.last_buy_price.toFixed(2)}
                  {' · '}Avg buy: ${symbolHint.avg_buy_price.toFixed(2)}
                  {' · '}{symbolHint.trade_count} trade{symbolHint.trade_count !== 1 ? 's' : ''}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={row3}>
        <div>
          <label style={labelStyle}>Instrument</label>
          <select value={form.instrument_type} onChange={e => set('instrument_type', e.target.value)} style={inputStyle}>
            <option value="stock">Stock</option>
            <option value="crypto">Crypto</option>
            <option value="etf">ETF / Index Fund</option>
            <option value="mutual_fund">Indian Mutual Fund</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Direction</label>
          <select value={form.direction} onChange={e => set('direction', e.target.value)} style={inputStyle}>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Size / Shares</label>
          <input type="number" step="any" min="0" value={form.size} onChange={e => set('size', e.target.value)} placeholder="100" required style={inputStyle} />
        </div>
      </div>

      <div style={row2}>
        <div>
          <label style={labelStyle}>{form.instrument_type === 'mutual_fund' ? 'Entry NAV ₹' : form.instrument_type === 'stock' && form.symbol.match(/\.(NS|BO)$/) ? 'Entry Price ₹' : 'Entry Price $'}</label>
          <input type="number" step="any" value={form.entry_price} onChange={e => set('entry_price', e.target.value)} placeholder="0.00" required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Pattern / Setup</label>
          <select value={form.pattern_tag || ''} onChange={e => set('pattern_tag', e.target.value)} style={inputStyle}>
            <option value="">— None —</option>
            {patterns.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {!isOpen && (
        <>
          <div style={row2}>
            <div>
              <label style={labelStyle}>Exit Price $</label>
              <input type="number" step="any" value={form.exit_price || ''} onChange={e => { setAutoCalc(false); set('exit_price', e.target.value); }} placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Exit Date <span style={{ color: '#52525b', fontWeight: 400 }}>(if different)</span></label>
              <input type="date" value={form.exit_date || ''} onChange={e => set('exit_date', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={row2}>
            <div>
              <label style={labelStyle}>P&L $ {autoCalc && <span style={{ color: '#00d4ff', fontWeight: 400 }}>(auto)</span>}</label>
              <input type="number" step="any" value={form.pnl_dollar}
                onChange={e => { setAutoCalc(false); set('pnl_dollar', e.target.value); }}
                placeholder="Auto-calculated" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>P&L %</label>
              <input type="number" step="any" value={form.pnl_percent}
                onChange={e => { setAutoCalc(false); set('pnl_percent', e.target.value); }}
                placeholder="Auto-calculated" style={inputStyle} />
            </div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0, fontSize: 13, color: '#ffffff', marginBottom: 0, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!form.is_best_trade}
            onChange={e => set('is_best_trade', e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#ffd60a' }}
          />
          ★ Mark as best trade
        </label>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Notes / Lesson</label>
        <textarea rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)}
          placeholder="What happened? What did you learn?" style={{ ...inputStyle, resize: 'vertical', borderRadius: 16, padding: '10px 14px' }} />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#71717a', padding: '8px 18px', borderRadius: 9999, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        <button type="submit" disabled={isPending} style={{ background: '#22ff88', border: 'none', color: '#000', padding: '8px 18px', borderRadius: 9999, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          {isPending ? 'Saving...' : trade ? 'Update Trade' : (isOpen ? 'Open Position' : 'Add Trade')}
        </button>
      </div>
    </form>
  );
}