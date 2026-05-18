import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../../api/client.js';
import { Bell, BellOff, Trash2, Plus, Send } from 'lucide-react';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AlertsPanel({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ symbol: '', condition: 'above', price: '', note: '' });
  const [telegramStatus, setTelegramStatus] = useState(null);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.list,
    staleTime: 30_000,
  });

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: alertsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); setForm({ symbol: '', condition: 'above', price: '', note: '' }); },
  });

  const { mutate: remove } = useMutation({
    mutationFn: alertsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const { mutate: toggle } = useMutation({
    mutationFn: alertsApi.toggle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const { mutate: telegramTest, isPending: testing } = useMutation({
    mutationFn: alertsApi.telegramTest,
    onSuccess: () => setTelegramStatus('sent'),
    onError: () => setTelegramStatus('error'),
  });

  function handleCreate(e) {
    e.preventDefault();
    if (!form.symbol || !form.price) return;
    create({ symbol: form.symbol.toUpperCase(), condition: form.condition, price: parseFloat(form.price), note: form.note });
  }

  const active = alerts.filter(a => a.active);
  const fired  = alerts.filter(a => !a.active);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* New Alert Form */}
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          New Price Alert
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <input
            value={form.symbol}
            onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
            placeholder="RELIANCE.NS"
            required
            style={{ padding: '8px 12px', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text-primary)', fontSize: 13, outline: 'none' }}
          />
          <select
            value={form.condition}
            onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
            style={{ padding: '8px 12px', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text-primary)', fontSize: 13 }}
          >
            <option value="above">Crosses Above</option>
            <option value="below">Falls Below</option>
          </select>
          <input
            type="number"
            value={form.price}
            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            placeholder="Price"
            required
            step="0.01"
            style={{ padding: '8px 12px', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text-primary)', fontSize: 13, outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="Optional note…"
            style={{ flex: 1, padding: '8px 12px', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text-primary)', fontSize: 13, outline: 'none' }}
          />
          <button type="submit" disabled={creating} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            background: 'var(--color-accent)', border: 'none', borderRadius: 10,
            color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            <Plus size={14} /> Set Alert
          </button>
        </div>
      </form>

      {/* Active Alerts */}
      {active.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Active ({active.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {active.map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 12,
                background: 'rgba(34,255,136,0.04)', border: '1px solid rgba(34,255,136,0.15)',
              }}>
                <Bell size={14} color="var(--color-green)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{a.symbol}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                    {a.condition === 'above' ? '≥' : '≤'} {a.price.toLocaleString()}
                  </span>
                  {a.note && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 8, fontStyle: 'italic' }}>{a.note}</span>}
                </div>
                <button onClick={() => toggle(a.id)} title="Disable" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}>
                  <BellOff size={13} />
                </button>
                <button onClick={() => remove(a.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-red)', padding: 4 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fired alerts */}
      {fired.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Triggered
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {fired.slice(0, 5).map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
                opacity: 0.6,
              }}>
                <Bell size={14} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{a.symbol}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                    {a.condition === 'above' ? '≥' : '≤'} {a.price.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginLeft: 8 }}>{timeAgo(a.firedAt)}</span>
                </div>
                <button onClick={() => remove(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && alerts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
          No alerts set. Add one above.
        </div>
      )}

      {/* Telegram test */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => telegramTest()} disabled={testing} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          background: 'rgba(0,136,204,0.12)', border: '1px solid rgba(0,136,204,0.3)',
          borderRadius: 10, color: '#0088cc', fontSize: 12, cursor: 'pointer',
        }}>
          <Send size={13} /> {testing ? 'Sending…' : 'Test Telegram'}
        </button>
        {telegramStatus === 'sent' && <span style={{ fontSize: 12, color: 'var(--color-green)' }}>✓ Sent! Check Telegram.</span>}
        {telegramStatus === 'error' && <span style={{ fontSize: 12, color: 'var(--color-red)' }}>Failed — check bot token in Settings.</span>}
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Add Telegram Bot Token in Settings to receive mobile alerts.</span>
      </div>
    </div>
  );
}
