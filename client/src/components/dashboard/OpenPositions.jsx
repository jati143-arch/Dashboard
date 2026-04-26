import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tradesApi, pricesApi } from '../../api/client.js';
import Modal from '../shared/Modal.jsx';
import ClosePositionForm from '../trades/ClosePositionForm.jsx';
import { useChart } from '../../context/ChartContext.jsx';

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

export default function OpenPositions() {
  const qc = useQueryClient();
  const { openChart } = useChart();
  const [closingTrade, setClosingTrade] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState('USD');

  const { data: openTrades = [] } = useQuery({
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

  if (openTrades.length === 0) return null;

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

  const counts = { all: openTrades.length, us: 0, indian: 0, crypto: 0 };
  openTrades.forEach(t => { counts[detectRegion(t.symbol, t.instrument_type)]++; });

  const filtered = openTrades
    .filter(t => activeTab === 'all' || detectRegion(t.symbol, t.instrument_type) === activeTab)
    .filter(t => t.symbol.toUpperCase().includes(search.toUpperCase()));

  const totalUnrealized = filtered.reduce((sum, t) => {
    const liveData = prices[t.symbol];
    if (!liveData) return sum;
    const native = detectRegion(t.symbol, t.instrument_type) === 'indian' ? 'INR' : 'USD';
    const entryC = convertPrice(t.entry_price, native);
    const currentC = convertPrice(liveData.price, native);
    const pnlD = t.direction === 'long' ? (currentC - entryC) * t.size : (entryC - currentC) * t.size;
    return sum + pnlD;
  }, 0);

  const TABS = [['all', 'All'], ['us', '🇺🇸 US'], ['indian', '🇮🇳 Indian'], ['crypto', '₿ Crypto']];

  return (
    <>
      <div className="card" style={{ marginBottom: 24, borderLeft: '3px solid var(--yellow)', padding: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ◉ Open Positions ({openTrades.length})
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Prices refresh every 60s</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {['USD', 'INR', 'EUR'].map(c => (
                <button key={c} type="button" onClick={() => setDisplayCurrency(c)} style={{
                  padding: '3px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer', fontWeight: 700,
                  border: displayCurrency === c ? 'none' : '1px solid var(--border)',
                  background: displayCurrency === c ? 'var(--accent)' : 'transparent',
                  color: displayCurrency === c ? '#000' : 'var(--text-dim)',
                }}>{c}</button>
              ))}
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 8 }}>Unrealized:</span>
              <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 15, color: totalUnrealized >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {totalUnrealized >= 0 ? '+' : '-'}{fmt(totalUnrealized)}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs + Search */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TABS.filter(([key]) => key === 'all' || counts[key] > 0).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setActiveTab(key)} style={{
                padding: '4px 12px', fontSize: 11, borderRadius: 4, cursor: 'pointer', fontWeight: 600,
                border: activeTab === key ? 'none' : '1px solid var(--border)',
                background: activeTab === key ? 'var(--yellow)' : 'transparent',
                color: activeTab === key ? '#000' : 'var(--text-secondary)',
              }}>
                {label} ({counts[key]})
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search symbol..."
            style={{ width: 160, fontSize: 12, padding: '4px 10px' }}
          />
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Dir</th>
                <th>Entry Date</th>
                <th>Entry Price</th>
                <th>Current Price</th>
                <th>Change</th>
                <th>Remaining</th>
                <th>Unrealized P&L</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 20 }}>No positions found</td></tr>
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

                const pnlColor = !calc ? 'var(--text-dim)' : calc.pnlD >= 0 ? 'var(--green)' : 'var(--red)';
                const nativeSymbol = native === 'INR' ? '₹' : '$';

                return (
                  <tr key={t.id}>
                    <td>
                      <span
                        style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, color: 'var(--accent)', cursor: 'pointer' }}
                        onClick={() => openChart(t.symbol, t.entry_price)}
                        title="View chart"
                      >{t.symbol}</span>
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
                    <td style={{ fontFamily: 'var(--text-mono)' }}>{t.remaining_size ?? t.size}</td>
                    <td>
                      {calc ? (
                        <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, color: pnlColor }}>
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
                        onClick={() => setClosingTrade({ trade: t, currentPrice })}>
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
        <Modal title={`Close Position — ${closingTrade.trade.symbol}`} onClose={() => setClosingTrade(null)} width={520}>
          <ClosePositionForm
            trade={closingTrade.trade}
            currentPrice={closingTrade.currentPrice}
            onClose={() => setClosingTrade(null)}
          />
        </Modal>
      )}
    </>
  );
}
