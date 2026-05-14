import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tradesApi } from '../../api/client.js';

const today = () => new Date().toISOString().slice(0, 10);

function detectRegion(symbol, instrumentType) {
  if (instrumentType === 'crypto') return 'crypto';
  if (
    symbol.endsWith('.NS') || symbol.endsWith('.BO') ||
    symbol.startsWith('NSE:') || symbol.startsWith('BSE:')
  ) return 'indian';
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
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['daily'] });
      setResult({ isFullClose, data });
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!exitNum || !qtyNum) return;
    doClose();
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 9999,
    padding: '10px 16px',
    color: '#ffffff',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace",
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    color: '#52525b',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 6,
    display: 'block',
    fontFamily: "'JetBrains Mono', monospace",
  };

  if (result) {
    const remaining = result.isFullClose ? 0 : (result.data?.updated?.remaining_size ?? 0);
    const pnl = result.isFullClose ? pnlD : result.data?.created?.pnl_dollar;
    const pnlColor = pnl >= 0 ? '#22ff88' : '#ff4444';

    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        {result.isFullClose ? (
          <>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#ffffff', marginBottom: 8 }}>
              Position Fully Closed
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#71717a', marginBottom: 16 }}>
              {qtyNum} shares @ {cs}{exitNum.toFixed(2)}
            </div>
            {pnl != null && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 20, color: pnlColor }}>
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
            <div style={{ fontWeight: 700, fontSize: 15, color: '#00d4ff', marginBottom: 8 }}>
              Partial Close Recorded
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#71717a', marginBottom: 8 }}>
              <strong style={{ color: '#ffffff' }}>{qtyNum}</strong> shares sold @ <strong style={{ color: '#ffffff' }}>{cs}{exitNum.toFixed(2)}</strong>
            </div>
            <div style={{ fontSize: 13, color: '#71717a', marginBottom: 16 }}>
              <strong style={{ color: '#00d4ff' }}>{remaining}</strong> shares remain open
            </div>
            {pnl != null && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color: pnlColor }}>
                {pnl >= 0 ? '+' : ''}{cs}{Math.abs(pnl).toFixed(2)}
              </div>
            )}
          </>
        )}
        <div style={{ marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: 'none',
              borderRadius: 9999,
              color: '#000000',
              padding: '10px 24px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >Done</button>
        </div>
      </div>
    );
  }

  const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 24,
        padding: '16px 20px',
        marginBottom: 20,
        display: 'flex',
        gap: 24,
        flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 12, color: '#71717a' }}>
          Symbol: <strong style={{ color: '#ffffff', fontFamily: "'JetBrains Mono', monospace" }}>{trade.symbol}</strong>
        </div>
        <div style={{ fontSize: 12, color: '#71717a' }}>
          Entry: <strong style={{ color: '#ffffff', fontFamily: "'JetBrains Mono', monospace" }}>{cs}{entryPrice}</strong>
        </div>
        <div style={{ fontSize: 12, color: '#71717a' }}>
          Remaining: <strong style={{ color: '#00d4ff', fontFamily: "'JetBrains Mono', monospace" }}>{maxQty}</strong>
        </div>
      </div>

      <div style={row2}>
        <div>
          <label style={labelStyle}>Qty to Sell</label>
          <input
            type="number" step="any" min="0.0001" max={maxQty}
            value={qty} onChange={e => setQty(e.target.value)} required
            style={inputStyle}
          />
          <div style={{ fontSize: 10, color: '#52525b', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
            Max: {maxQty} · {isFullClose ? 'Full close' : `${(maxQty - qtyNum).toFixed(4)} remain`}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Exit Price {native}</label>
          <input
            type="number" step="any" value={exitPrice}
            onChange={e => setExitPrice(e.target.value)} placeholder="0.00" required
            style={inputStyle}
          />
        </div>
      </div>

      <div style={row2}>
        <div>
          <label style={labelStyle}>Exit Date</label>
          <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>P&L (auto-calculated)</label>
          <input
            readOnly
            value={pnlD != null
              ? `${pnlD >= 0 ? '+' : ''}${cs}${Math.abs(pnlD).toFixed(2)} (${pnlP >= 0 ? '+' : ''}${pnlP?.toFixed(1)}%)`
              : ''}
            style={{
              ...inputStyle,
              color: pnlD == null ? '#52525b' : pnlD >= 0 ? '#22ff88' : '#ff4444',
            }}
            placeholder="Enter qty and exit price"
          />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Notes</label>
        <textarea
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional notes..."
          style={{
            resize: 'vertical',
            width: '100%',
            boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: '12px 16px',
            color: '#ffffff',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: 9999,
            color: '#71717a',
            padding: '10px 20px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >Cancel</button>
        <button
          type="submit"
          disabled={isPending || !exitNum || !qtyNum}
          style={{
            background: '#ffffff',
            border: 'none',
            borderRadius: 9999,
            color: '#000000',
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: 600,
            cursor: isPending || !exitNum || !qtyNum ? 'not-allowed' : 'pointer',
            opacity: isPending || !exitNum || !qtyNum ? 0.5 : 1,
          }}
        >
          {isPending ? 'Saving...' : isFullClose ? 'Close Full Position' : `Sell ${qtyNum || 0} Shares`}
        </button>
      </div>
    </form>
  );
}