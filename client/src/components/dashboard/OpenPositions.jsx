import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tradesApi, pricesApi } from '../../api/client.js';
import Modal from '../shared/Modal.jsx';
import TradeForm from '../trades/TradeForm.jsx';

function calcUnrealized(trade, currentPrice) {
  if (!currentPrice || !trade.entry_price || !trade.size) return null;
  const pnlD = trade.direction === 'long'
    ? (currentPrice - trade.entry_price) * trade.size
    : (trade.entry_price - currentPrice) * trade.size;
  const cost = trade.entry_price * trade.size;
  const pnlP = cost !== 0 ? (pnlD / cost) * 100 : 0;
  return { pnlD, pnlP };
}

export default function OpenPositions() {
  const qc = useQueryClient();
  const [closingTrade, setClosingTrade] = useState(null);

  const { data: openTrades = [] } = useQuery({
    queryKey: ['trades', { status: 'open' }],
    queryFn: () => tradesApi.list({ status: 'open' }),
  });

  const symbols = [...new Set(openTrades.map(t => t.symbol))];

  const { data: prices = {} } = useQuery({
    queryKey: ['prices', symbols],
    queryFn: () => symbols.length ? pricesApi.get(symbols) : {},
    enabled: symbols.length > 0,
    refetchInterval: 60_000,
  });

  if (openTrades.length === 0) return null;

  const totalUnrealized = openTrades.reduce((sum, t) => {
    const p = prices[t.symbol]?.price;
    const calc = calcUnrealized(t, p);
    return sum + (calc?.pnlD ?? 0);
  }, 0);

  return (
    <>
      <div className="card" style={{
        marginBottom: 24,
        borderLeft: '3px solid var(--yellow)',
        padding: 0,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ◉ Open Positions ({openTrades.length})
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Prices refresh every 60s</span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 8 }}>Unrealized:</span>
            <span style={{
              fontFamily: 'var(--text-mono)',
              fontWeight: 700,
              fontSize: 15,
              color: totalUnrealized >= 0 ? 'var(--green)' : 'var(--red)',
            }}>
              {totalUnrealized >= 0 ? '+' : ''}${Math.abs(totalUnrealized).toFixed(2)}
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Dir</th>
                <th>Entry Date</th>
                <th>Entry $</th>
                <th>Current $</th>
                <th>Change</th>
                <th>Size</th>
                <th>Unrealized P&L</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {openTrades.map(t => {
                const liveData = prices[t.symbol];
                const currentPrice = liveData?.price;
                const calc = calcUnrealized(t, currentPrice);
                const pnlColor = !calc ? 'var(--text-dim)'
                  : calc.pnlD >= 0 ? 'var(--green)' : 'var(--red)';

                return (
                  <tr key={t.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700 }}>{t.symbol}</span>
                      <span className={`badge badge-${t.instrument_type}`} style={{ marginLeft: 6, fontSize: 9 }}>{t.instrument_type}</span>
                    </td>
                    <td><span className={`badge badge-${t.direction}`}>{t.direction}</span></td>
                    <td style={{ fontFamily: 'var(--text-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{t.date}</td>
                    <td style={{ fontFamily: 'var(--text-mono)' }}>${t.entry_price}</td>
                    <td style={{ fontFamily: 'var(--text-mono)', color: 'var(--text-primary)' }}>
                      {currentPrice != null ? `$${currentPrice.toFixed(2)}` : <span style={{ color: 'var(--text-dim)' }}>Loading...</span>}
                    </td>
                    <td>
                      {liveData && (
                        <span style={{ fontFamily: 'var(--text-mono)', fontSize: 12, color: liveData.change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {liveData.change >= 0 ? '+' : ''}{liveData.changePercent.toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--text-mono)' }}>{t.size}</td>
                    <td>
                      {calc ? (
                        <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, color: pnlColor }}>
                          {calc.pnlD >= 0 ? '+' : ''}${Math.abs(calc.pnlD).toFixed(2)}
                          <span style={{ fontSize: '0.8em', marginLeft: 5, opacity: 0.8 }}>
                            ({calc.pnlP >= 0 ? '+' : ''}{calc.pnlP.toFixed(1)}%)
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 10px', fontSize: 11 }}
                        onClick={() => setClosingTrade({
                          ...t,
                          exit_price: currentPrice ? currentPrice.toFixed(2) : '',
                          status: 'closed',
                        })}
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {closingTrade && (
        <Modal title={`Close Position — ${closingTrade.symbol}`} onClose={() => setClosingTrade(null)} width={580}>
          <TradeForm
            trade={closingTrade}
            defaultStatus="closed"
            onClose={() => {
              setClosingTrade(null);
              qc.invalidateQueries({ queryKey: ['trades'] });
            }}
          />
        </Modal>
      )}
    </>
  );
}
