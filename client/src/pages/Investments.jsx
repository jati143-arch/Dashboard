import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tradesApi, pricesApi } from '../api/client.js';
import Modal from '../components/shared/Modal.jsx';
import TradeForm from '../components/trades/TradeForm.jsx';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';

function detectRegion(symbol, instrumentType) {
  if (instrumentType === 'crypto') return 'crypto';
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return 'indian';
  return 'us';
}

function toUSD(price, native, usdInr, eurUsd) {
  if (native === 'INR') return price / usdInr;
  if (native === 'EUR') return price * eurUsd;
  return price;
}

function fromUSD(usdPrice, target, usdInr, eurUsd) {
  if (target === 'INR') return usdPrice * usdInr;
  if (target === 'EUR') return usdPrice / eurUsd;
  return usdPrice;
}

const CUR_SYMBOL = { USD: '$', INR: '₹', EUR: '€' };
const SUB_TABS = [['all', 'All'], ['us', 'US Market'], ['indian', 'Indian Markets']];

export default function Investments() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [closingTrade, setClosingTrade] = useState(null);

  const { data: openTrades = [], isLoading } = useQuery({
    queryKey: ['trades', { status: 'open' }],
    queryFn: () => tradesApi.list({ status: 'open' }),
  });

  const tradeSymbols = [...new Set(openTrades.map(t => t.symbol))];
  const allSymbols = tradeSymbols.length > 0 ? [...tradeSymbols, 'USDINR=X', 'EURUSD=X'] : [];

  const { data: prices = {} } = useQuery({
    queryKey: ['prices', allSymbols],
    queryFn: () => pricesApi.get(allSymbols),
    enabled: allSymbols.length > 0,
    refetchInterval: 60_000,
  });

  const usdInr = prices['USDINR=X']?.price || 83;
  const eurUsd = prices['EURUSD=X']?.price || 1.08;
  const cs = CUR_SYMBOL[displayCurrency];

  function fmt(amount) {
    const locale = displayCurrency === 'INR' ? 'en-IN' : 'en-US';
    return `${cs}${Math.abs(amount).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function convertPrice(price, native) {
    return fromUSD(toUSD(price, native, usdInr, eurUsd), displayCurrency, usdInr, eurUsd);
  }

  const counts = { all: openTrades.length, us: 0, indian: 0 };
  openTrades.forEach(t => {
    const r = detectRegion(t.symbol, t.instrument_type);
    if (r === 'us' || r === 'indian') counts[r]++;
  });

  const filtered = openTrades.filter(t => {
    if (activeTab === 'all') return true;
    return detectRegion(t.symbol, t.instrument_type) === activeTab;
  });

  let totalInvested = 0;
  let totalUnrealized = 0;
  filtered.forEach(t => {
    const native = detectRegion(t.symbol, t.instrument_type) === 'indian' ? 'INR' : 'USD';
    const entryC = convertPrice(t.entry_price, native);
    totalInvested += entryC * t.size;
    const liveData = prices[t.symbol];
    if (liveData) {
      const currentC = convertPrice(liveData.price, native);
      const pnlD = t.direction === 'long' ? (currentC - entryC) * t.size : (entryC - currentC) * t.size;
      totalUnrealized += pnlD;
    }
  });

  const pnlColor = totalUnrealized >= 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div>
      {/* Page title */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Investments</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Open positions · Prices refresh every 60s</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {SUB_TABS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)} style={{
            padding: '6px 16px', fontSize: 12, borderRadius: 4, cursor: 'pointer', fontWeight: 600,
            border: activeTab === key ? 'none' : '1px solid var(--border)',
            background: activeTab === key ? 'var(--accent)' : 'var(--bg-card)',
            color: activeTab === key ? '#000' : 'var(--text-secondary)',
            transition: 'background 0.15s',
          }}>
            {label} ({counts[key] ?? filtered.length})
          </button>
        ))}
      </div>

      {/* Summary card */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Positions</div>
          <div style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)' }}>{filtered.length}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Invested</div>
          <div style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)' }}>{fmt(totalInvested)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Unrealized P&L</div>
          <div style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 22, color: pnlColor }}>
            {totalUnrealized >= 0 ? '+' : '-'}{fmt(totalUnrealized)}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {['USD', 'INR', 'EUR'].map(c => (
            <button key={c} type="button" onClick={() => setDisplayCurrency(c)} style={{
              padding: '4px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer', fontWeight: 700,
              border: displayCurrency === c ? 'none' : '1px solid var(--border)',
              background: displayCurrency === c ? 'var(--accent)' : 'transparent',
              color: displayCurrency === c ? '#000' : 'var(--text-dim)',
            }}>{c}</button>
          ))}
        </div>
      </div>

      {/* Positions table */}
      {isLoading ? (
        <LoadingSpinner text="Loading positions..." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: '3px solid var(--accent)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Dir</th>
                  <th>Entry Date</th>
                  <th>Entry Price</th>
                  <th>Current Price</th>
                  <th>Change %</th>
                  <th>Size</th>
                  <th>Unrealized P&L</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '32px 20px' }}>
                      No open positions in this market
                    </td>
                  </tr>
                ) : filtered.map(t => {
                  const region = detectRegion(t.symbol, t.instrument_type);
                  const native = region === 'indian' ? 'INR' : 'USD';
                  const liveData = prices[t.symbol];
                  const currentPrice = liveData?.price;
                  const hasPrice = currentPrice != null;

                  const entryC = hasPrice ? convertPrice(t.entry_price, native) : null;
                  const currentC = hasPrice ? convertPrice(currentPrice, native) : null;

                  let calc = null;
                  if (entryC != null && currentC != null && t.size) {
                    const pnlD = t.direction === 'long'
                      ? (currentC - entryC) * t.size
                      : (entryC - currentC) * t.size;
                    const cost = entryC * t.size;
                    calc = { pnlD, pnlP: cost !== 0 ? (pnlD / cost) * 100 : 0 };
                  }

                  const rowPnlColor = !calc ? 'var(--text-dim)' : calc.pnlD >= 0 ? 'var(--green)' : 'var(--red)';
                  const nativeSymbol = native === 'INR' ? '₹' : '$';

                  return (
                    <tr key={t.id}>
                      <td>
                        <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700 }}>{t.symbol}</span>
                        <span className={`badge badge-${t.instrument_type}`} style={{ marginLeft: 6, fontSize: 9 }}>{t.instrument_type}</span>
                      </td>
                      <td><span className={`badge badge-${t.direction}`}>{t.direction}</span></td>
                      <td style={{ fontFamily: 'var(--text-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{t.date}</td>
                      <td style={{ fontFamily: 'var(--text-mono)' }}>
                        {entryC != null ? fmt(entryC) : `${nativeSymbol}${t.entry_price}`}
                      </td>
                      <td style={{ fontFamily: 'var(--text-mono)', color: 'var(--text-primary)' }}>
                        {currentC != null
                          ? fmt(currentC)
                          : <span style={{ color: 'var(--text-dim)' }}>Loading...</span>}
                      </td>
                      <td>
                        {liveData && (
                          <span style={{ fontFamily: 'var(--text-mono)', fontSize: 12, color: liveData.changePercent >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {liveData.changePercent >= 0 ? '+' : ''}{liveData.changePercent.toFixed(2)}%
                          </span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--text-mono)' }}>{t.size}</td>
                      <td>
                        {calc ? (
                          <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, color: rowPnlColor }}>
                            {calc.pnlD >= 0 ? '+' : '-'}{fmt(calc.pnlD)}
                            <span style={{ fontSize: '0.8em', marginLeft: 5, opacity: 0.8 }}>
                              ({calc.pnlP >= 0 ? '+' : ''}{calc.pnlP.toFixed(1)}%)
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => setClosingTrade({ ...t, exit_price: currentPrice ? currentPrice.toFixed(2) : '', status: 'closed' })}>
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
      )}

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
    </div>
  );
}
