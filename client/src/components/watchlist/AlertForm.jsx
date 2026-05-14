import { useState } from 'react';

export default function AlertForm({ symbol, onSave, onClose }) {
  const [type,  setType]  = useState('above');
  const [price, setPrice] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!price) return;
    onSave({ symbol, type, price: parseFloat(price) });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div className="card" style={{ padding: 24, minWidth: 300 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Set Alert — {symbol}</div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Trigger
            <select value={type} onChange={e => setType(e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', color: 'var(--color-text-primary)' }}>
              <option value="above">Price goes above</option>
              <option value="below">Price goes below</option>
            </select>
          </label>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Price
            <input type="number" step="any" value={price} onChange={e => setPrice(e.target.value)}
              placeholder="e.g. 2900"
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '6px 14px', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit"
              style={{ padding: '6px 14px', background: 'var(--color-accent)', border: 'none', borderRadius: 'var(--radius)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              Save Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
