import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pricesApi, watchlistApi } from '../../api/client.js';
import SparklineCell from './SparklineCell.jsx';
import AlertForm from './AlertForm.jsx';

function fmt(v, d = 2) {
  if (v == null) return '—';
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function WatchlistTable({ list }) {
  const qc = useQueryClient();
  const [alertFor, setAlertFor] = useState(null);
  const [addSymbol, setAddSymbol] = useState('');

  const symbols = list.symbols || [];

  const { data: prices = {} } = useQuery({
    queryKey: ['wl-prices', symbols.join(',')],
    queryFn: () => symbols.length ? pricesApi.get(symbols) : {},
    enabled: symbols.length > 0,
    refetchInterval: 30_000,
  });

  const mutOpts = { onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }) };

  const removeSymbol = useMutation({
    mutationFn: (sym) => watchlistApi.removeSymbol(list.id, sym),
    ...mutOpts,
  });

  const addAlert = useMutation({
    mutationFn: ({ symbol, type, price }) => watchlistApi.addAlert(list.id, symbol, type, price),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }); setAlertFor(null); },
  });

  const removeAlert = useMutation({
    mutationFn: (alertId) => watchlistApi.removeAlert(list.id, alertId),
    ...mutOpts,
  });

  const addSym = useMutation({
    mutationFn: (sym) => watchlistApi.addSymbol(list.id, sym.trim().toUpperCase()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }); setAddSymbol(''); },
  });

  return (
    <div>
      {/* Add symbol bar */}
      <form onSubmit={e => { e.preventDefault(); if (addSymbol) addSym.mutate(addSymbol); }}
        style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={addSymbol}
          onChange={e => setAddSymbol(e.target.value)}
          placeholder="Add symbol e.g. RELIANCE.NS"
          style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13 }}
        />
        <button type="submit" disabled={!addSymbol || addSym.isPending}
          style={{ padding: '6px 14px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
          + Add
        </button>
      </form>

      {symbols.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px 0', fontSize: 13 }}>No symbols yet. Add one above.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Symbol', 'Price', 'Chg%', 'Volume', '1M Chart', 'Alerts', ''].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {symbols.map(sym => {
                const q = prices[sym] || {};
                const up = q.change_pct >= 0;
                const alerts = (list.alerts || []).filter(a => a.symbol === sym);
                return (
                  <tr key={sym} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--text-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{sym}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--text-mono)' }}>{fmt(q.price)}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--text-mono)', fontWeight: 600, color: q.change_pct == null ? 'var(--text-dim)' : up ? 'var(--green)' : 'var(--red)' }}>
                      {q.change_pct == null ? '—' : `${up ? '+' : ''}${fmt(q.change_pct)}%`}
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--text-mono)', color: 'var(--text-secondary)' }}>
                      {q.volume ? (q.volume / 1_000_000).toFixed(1) + 'M' : '—'}
                    </td>
                    <td style={{ padding: '4px 10px' }}>
                      <SparklineCell symbol={sym} />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      {alerts.map(a => (
                        <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 6, padding: '2px 6px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }}>
                          {a.type === 'above' ? '▲' : '▼'} {fmt(a.price)}
                          <button onClick={() => removeAlert.mutate(a.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 11, padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      ))}
                      <button onClick={() => setAlertFor(sym)}
                        style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 11, color: 'var(--text-dim)' }}>
                        + Alert
                      </button>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <button onClick={() => removeSymbol.mutate(sym)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 14 }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {alertFor && (
        <AlertForm symbol={alertFor} onClose={() => setAlertFor(null)}
          onSave={({ symbol, type, price }) => addAlert.mutate({ symbol, type, price })} />
      )}
    </div>
  );
}
