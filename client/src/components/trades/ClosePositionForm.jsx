import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tradesApi } from '../../api/client.js';

const today = () => new Date().toISOString().slice(0, 10);

function detectRegion(symbol, instrumentType) {
  if (instrumentType === 'crypto') return 'crypto';
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return 'indian';
  return 'us';
}

export default function ClosePositionForm({ trade, currentPrice, onClose }) {
  const qc = useQueryClient();
  const maxQty = trade.remaining_size ?? trade.size;

  const region = detectRegion(trade.symbol, trade.instrument_type);
  const native = region === 'indian' ? 'INR' : 'USD';
  const cs = native === 'INR' ? '₹' : '$';

  const [qty, setQty] = useState(String(maxQty));
  const [exitPrice, setExitPrice] = useState(currentPrice ? String(currentPrice) : '');
  const [exitDate, setExitDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState(null);

  const entryPrice = parseFloat(trade.entry_price);
  const qtyNum = parseFloat(qty) || 0;
  const exitNum = parseFloat(exitPrice) || 0;

  const pnlD = exitNum && qtyNum
    ? (trade.direction === 'long'
        ? (exitNum - entryPrice) * qtyNum
        : (entryPrice - exitNum) * qtyNum)
    : null;
  const pnlP = pnlD != null && entryPrice > 0
    ? (pnlD / (entryPrice * qtyNum)) * 100
    : null;

  const isFullClose = qtyNum >= maxQty - 0.0001;

  const { mutate: doClose, isPending } = useMutation({
    mutationFn: () => {
      const payload = {
        qty_to_sell: qtyNum,
        exit_price: exitNum,
        exit_date: exitDate || null,
        pnl_dollar: pnlD,
        pnl_percent: pnlP,
        notes: notes || null,
      };
      if (isFullClose) {
        return tradesApi.update(trade.id, {
          ...trade,
          exit_price: exitNum,
          exit_date: exitDate || null,
          pnl_dollar: pnlD,
          pnl_percent: pnlP,
          notes: notes || trade.notes || null,
          status: 'closed',
        });
      }
      return tradesApi.partialClose(trade.id, payload);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['trades'] });
      setResult({ isFullClose, data });
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!exitNum || !qtyNum) return;
    doClose();
  }

  if (result) {
    const remaining = result.isFullClose ? 0 : (result.data?.updated?.remaining_size ?? 0);
    const pnl = result.isFullClose ? pnlD : result.data?.created?.pnl_dollar;
    const pnlColor = pnl >= 0 ? 'var(--green)' : 'var(--red)';

    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        {result.isFullClose ? (
          <>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 8 }}>
              Position Fully Closed
            </div>
            <div style={{ fontFamily: 'var(--text-mono)', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {qtyNum} shares @ {cs}{exitNum.toFixed(2)}
            </div>
            {pnl != null && (
              <div style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 20, color: pnlColor }}>
                {pnl >= 0 ? '+' : ''}{cs}{Math.abs(pnl).toFixed(2)}
                {pnlP != null && (
                  <span style={{ fontSize: 13, marginLeft: 8, opacity: 0.8 }}>
                    ({pnlP >= 0 ? '+' : ''}{pnlP.toFixed(1)}%)
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 12 }}>◑</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--yellow)', marginBottom: 8 }}>
              Partial Close Recorded
            </div>
            <div style={{ fontFamily: 'var(--text-mono)', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{qtyNum}</strong> shares sold @ <strong style={{ color: 'var(--text-primary)' }}>{cs}{exitNum.toFixed(2)}</strong>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              <strong style={{ color: 'var(--yellow)' }}>{remaining}</strong> shares remain open
            </div>
            {pnl != null && (
              <div style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 18, color: pnlColor }}>
                {pnl >= 0 ? '+' : ''}{cs}{Math.abs(pnl).toFixed(2)}
              </div>
            )}
          </>
        )}
        <div style={{ marginTop: 20 }}>
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Symbol: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--text-mono)' }}>{trade.symbol}</strong>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Entry: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--text-mono)' }}>{cs}{entryPrice}</strong>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Remaining: <strong style={{ color: 'var(--yellow)', fontFamily: 'var(--text-mono)' }}>{maxQty}</strong>
        </div>
      </div>

      <div style={row2}>
        <div>
          <label>Qty to Sell</label>
          <input
            type="number" step="any" min="0.0001" max={maxQty}
            value={qty} onChange={e => setQty(e.target.value)} required
          />
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
            Max: {maxQty} · {isFullClose ? 'Full close' : `${(maxQty - qtyNum).toFixed(4)} remain`}
          </div>
        </div>
        <div>
          <label>Exit Price {native}</label>
          <input
            type="number" step="any" value={exitPrice}
            onChange={e => setExitPrice(e.target.value)} placeholder="0.00" required
          />
        </div>
      </div>

      <div style={row2}>
        <div>
          <label>Exit Date</label>
          <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} />
        </div>
        <div>
          <label>P&L (auto-calculated)</label>
          <input
            readOnly
            value={pnlD != null
              ? `${pnlD >= 0 ? '+' : ''}${cs}${Math.abs(pnlD).toFixed(2)} (${pnlP >= 0 ? '+' : ''}${pnlP?.toFixed(1)}%)`
              : ''}
            style={{ color: pnlD == null ? 'var(--text-dim)' : pnlD >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--text-mono)' }}
            placeholder="Enter qty and exit price"
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>Notes</label>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." style={{ resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isPending || !exitNum || !qtyNum}>
          {isPending ? 'Saving...' : isFullClose ? 'Close Full Position' : `Sell ${qtyNum || 0} Shares`}
        </button>
      </div>
    </form>
  );
}
