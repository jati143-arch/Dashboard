import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pricesApi, watchlistApi } from '../../api/client.js';
import SparklineCell from './SparklineCell.jsx';
import AlertForm from './AlertForm.jsx';
import { useChart } from '../../context/ChartContext.jsx';
import Modal from '../shared/Modal.jsx';
import SymbolResearch from '../research/SymbolResearch.jsx';

function fmt(v, d = 2) {
  if (v == null) return '—';
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function WatchlistTable({ list }) {
  const qc = useQueryClient();
  const { openChart } = useChart();
  const [alertFor, setAlertFor] = useState(null);
  const [researchSym, setResearchSym] = useState(null);
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
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, overflow: 'hidden' }}>
      <form onSubmit={e => { e.preventDefault(); if (addSymbol) addSym.mutate(addSymbol); }}
        style={{ display: 'flex', gap: 10, marginBottom: 4, padding: '14px 16px', background: '#0d0d0d' }}>
        <input
          value={addSymbol}
          onChange={e => setAddSymbol(e.target.value)}
          placeholder="Add symbol e.g. RELIANCE.NS"
          style={{ flex: 1, padding: '8px 14px', background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, color: '#ffffff', fontSize: 13 }}
        />
        <button type="submit" disabled={!addSymbol || addSym.isPending}
          style={{ padding: '8px 16px', background: '#00d4ff', border: 'none', borderRadius: 9999, color: '#000', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          + Add
        </button>
      </form>

      {symbols.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#52525b', padding: '32px 0', fontSize: 14 }}>No symbols yet. Add one above.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0d0d0d' }}>
                {['Symbol', 'Price', 'Chg%', 'Volume', '1M Chart', 'Alerts', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {symbols.map(sym => {
                const q = prices[sym] || {};
                const up = q.change_pct >= 0;
                const alerts = (list.alerts || []).filter(a => a.symbol === sym);
                return (
                  <tr key={sym} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#00d4ff', cursor: 'pointer' }}
                        onClick={() => openChart(sym)}
                        title="View chart"
                      >{sym}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{fmt(q.price)}</td>
                    <td style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 14, color: q.change_pct == null ? '#52525b' : up ? '#22ff88' : '#ff4444' }}>
                      {q.change_pct == null ? '—' : `${up ? '+' : ''}${fmt(q.change_pct)}%`}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono', monospace", color: '#71717a' }}>
                      {q.volume ? (q.volume / 1_000_000).toFixed(1) + 'M' : '—'}
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <SparklineCell symbol={sym} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {alerts.map(a => (
                        <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 8, marginBottom: 4, padding: '4px 10px', background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, fontSize: 11 }}>
                          {a.type === 'above' ? '▲' : '▼'} {fmt(a.price)}
                          <button onClick={() => removeAlert.mutate(a.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', fontSize: 11, padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      ))}
                      <button onClick={() => setAlertFor(sym)}
                        style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 9999, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: '#52525b' }}>
                        + Alert
                      </button>
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => setResearchSym(sym)}
                          style={{ background: 'rgba(34,255,136,0.08)', border: '1px solid rgba(34,255,136,0.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: '#22ff88', fontWeight: 600 }}>
                          Research
                        </button>
                        <button onClick={() => removeSymbol.mutate(sym)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', fontSize: 14 }}>✕</button>
                      </div>
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

      {researchSym && (
        <Modal title={`Research: ${researchSym}`} onClose={() => setResearchSym(null)} width={640}>
          <SymbolResearch symbol={researchSym} onClose={() => setResearchSym(null)} />
        </Modal>
      )}
    </div>
  );
}