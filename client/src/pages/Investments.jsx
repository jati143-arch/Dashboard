import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tradesApi, pricesApi, statsApi, mfApi } from '../api/client.js';
import Modal from '../components/shared/Modal.jsx';
import ClosePositionForm from '../components/trades/ClosePositionForm.jsx';
import CsvImport from '../components/trades/CsvImport.jsx';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';

function detectRegion(symbol, instrumentType) {
  if (instrumentType === 'mutual_fund') return 'mf';
  if (instrumentType === 'crypto') return 'crypto';
  if (instrumentType === 'etf') return 'etf';
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO') ||
      symbol.startsWith('NSE:') || symbol.startsWith('BSE:')) return 'indian';
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

const SUB_TABS = [
  ['all',    'All'],
  ['us',     'US Market'],
  ['indian', 'Indian Markets'],
  ['crypto', 'Crypto'],
  ['etf',    'US ETF/Funds'],
  ['mf',     'Indian MF'],
];

const CURRENCY_OPTIONS = {
  all:    ['USD', 'INR', 'EUR'],
  us:     ['USD', 'EUR'],
  indian: ['INR', 'EUR'],
  crypto: ['USD', 'EUR'],
  etf:    ['USD', 'EUR'],
  mf:     ['INR'],
};

function getInitCurrency(tab) {
  const saved = localStorage.getItem(`inv_currency_${tab}`);
  const opts = CURRENCY_OPTIONS[tab];
  return saved && opts.includes(saved) ? saved : opts[0];
}

// Inline component to fetch AMFI NAV for a single MF position row
function MfNavCell({ schemeCode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['mf-nav', schemeCode],
    queryFn: () => mfApi.nav(schemeCode),
    staleTime: 60 * 60_000, // NAV updates once per day
  });
  if (isLoading) return <span style={{ color: 'var(--text-dim)' }}>Loading…</span>;
  if (!data) return <span style={{ color: 'var(--text-dim)' }}>—</span>;
  return (
    <span style={{ fontFamily: 'var(--text-mono)' }}>
      ₹{data.nav.toFixed(4)}
      {data.date && <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 4 }}>({data.date})</span>}
    </span>
  );
}

export default function Investments() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [displayCurrency, setDisplayCurrency] = useState(() => getInitCurrency('all'));
  const [closingTrade, setClosingTrade] = useState(null);
  const [showImport, setShowImport] = useState(false);

  function switchTab(tab) {
    setActiveTab(tab);
    setDisplayCurrency(getInitCurrency(tab));
  }

  function switchCurrency(c) {
    setDisplayCurrency(c);
    localStorage.setItem(`inv_currency_${activeTab}`, c);
  }

  const { data: openTrades = [], isLoading } = useQuery({
    queryKey: ['trades', { status: 'open' }],
    queryFn: () => tradesApi.list({ status: 'open' }),
  });

  // Only fetch Yahoo Finance prices for non-MF symbols
  const tradeSymbols = [...new Set(
    openTrades
      .filter(t => t.instrument_type !== 'mutual_fund')
      .map(t => t.symbol),
  )];
  const allSymbols = tradeSymbols.length > 0 ? [...tradeSymbols, 'USDINR=X', 'EURUSD=X'] : [];

  const { data: prices = {} } = useQuery({
    queryKey: ['prices', allSymbols],
    queryFn: () => pricesApi.get(allSymbols),
    enabled: allSymbols.length > 0,
    refetchInterval: 60_000,
  });

  const marketParam = ['all', 'mf'].includes(activeTab) ? (activeTab === 'mf' ? 'mf' : '') : activeTab;
  const { data: tabStats } = useQuery({
    queryKey: ['stats', 'all', marketParam],
    queryFn: () => statsApi.summary('all', marketParam),
    staleTime: 60_000,
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

  // Count by region (exclude MF from 'all' count since they're separate)
  const counts = { all: 0, us: 0, indian: 0, crypto: 0, etf: 0, mf: 0 };
  openTrades.forEach(t => {
    const r = detectRegion(t.symbol, t.instrument_type);
    counts[r]++;
    if (r !== 'mf') counts.all++;
  });

  const filtered = openTrades.filter(t => {
    const r = detectRegion(t.symbol, t.instrument_type);
    if (activeTab === 'all') return r !== 'mf'; // all tab excludes MF
    return r === activeTab;
  });

  const isMfTab = activeTab === 'mf';

  let totalInvested = 0;
  let totalUnrealized = 0;
  if (!isMfTab) {
    filtered.forEach(t => {
      const native = detectRegion(t.symbol, t.instrument_type) === 'indian' ? 'INR' : 'USD';
      const entryC = convertPrice(t.entry_price, native);
      const remaining = t.remaining_size ?? t.size;
      totalInvested += entryC * remaining;
      const liveData = prices[t.symbol];
      if (liveData) {
        const currentC = convertPrice(liveData.price, native);
        const pnlD = t.direction === 'long' ? (currentC - entryC) * remaining : (entryC - currentC) * remaining;
        totalUnrealized += pnlD;
      }
    });
  } else {
    // For MF tab: invested = sum of entry_price * size in INR
    filtered.forEach(t => {
      totalInvested += t.entry_price * (t.remaining_size ?? t.size);
    });
  }

  const pnlColor = totalUnrealized >= 0 ? 'var(--green)' : 'var(--red)';
  const allTimePnl = tabStats?.total_pnl;
  const allTimePnlColor = allTimePnl == null ? 'var(--text-dim)' : allTimePnl >= 0 ? 'var(--green)' : 'var(--red)';
  const currencyOpts = CURRENCY_OPTIONS[activeTab];

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Investments</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Open positions · Prices refresh every 60s</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => setShowImport(true)}>⬆ Import CSV</button>
          <button className="btn-ghost" onClick={() => tradesApi.exportCSV(activeTab)}>⬇ Export CSV</button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {SUB_TABS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => switchTab(key)} style={{
            padding: '6px 16px', fontSize: 12, borderRadius: 4, cursor: 'pointer', fontWeight: 600,
            border: activeTab === key ? 'none' : '1px solid var(--border)',
            background: activeTab === key ? 'var(--accent)' : 'var(--bg-card)',
            color: activeTab === key ? '#000' : 'var(--text-secondary)',
            transition: 'background 0.15s',
          }}>
            {label} ({counts[key]})
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
          <div style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)' }}>
            {isMfTab ? `₹${totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : fmt(totalInvested)}
          </div>
        </div>
        {!isMfTab && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Unrealized P&L</div>
            <div style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 22, color: pnlColor }}>
              {totalUnrealized >= 0 ? '+' : '-'}{fmt(totalUnrealized)}
            </div>
          </div>
        )}
        {allTimePnl != null && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>All-Time Realized P&L</div>
            <div style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 22, color: allTimePnlColor }}>
              {allTimePnl >= 0 ? '+' : '-'}{isMfTab ? `₹${Math.abs(allTimePnl).toFixed(2)}` : `$${Math.abs(allTimePnl).toFixed(2)}`}
            </div>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {currencyOpts.map(c => (
            <button key={c} type="button" onClick={() => switchCurrency(c)} style={{
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
      ) : isMfTab ? (
        /* MF Tab — special table with AMFI NAV */
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: '3px solid var(--accent)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Scheme Code</th>
                  <th>Dir</th>
                  <th>Entry Date</th>
                  <th>Entry NAV</th>
                  <th>Latest NAV</th>
                  <th>Units</th>
                  <th>Invested</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '32px 20px' }}>
                      No mutual fund positions. Add one using "Open Position" with type "Indian Mutual Fund".
                    </td>
                  </tr>
                ) : filtered.map(t => {
                  const remaining = t.remaining_size ?? t.size;
                  return (
                    <tr key={t.id}>
                      <td>
                        <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700 }}>{t.symbol}</span>
                        <span className="badge badge-stock" style={{ marginLeft: 6, fontSize: 9 }}>MF</span>
                      </td>
                      <td><span className={`badge badge-${t.direction}`}>{t.direction}</span></td>
                      <td style={{ fontFamily: 'var(--text-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{t.date}</td>
                      <td style={{ fontFamily: 'var(--text-mono)' }}>₹{t.entry_price.toFixed(4)}</td>
                      <td><MfNavCell schemeCode={t.symbol} /></td>
                      <td style={{ fontFamily: 'var(--text-mono)' }}>{remaining}</td>
                      <td style={{ fontFamily: 'var(--text-mono)' }}>₹{(t.entry_price * remaining).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td>
                        <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => setClosingTrade({ trade: t, currentPrice: null })}>
                          Redeem
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* All other tabs — Yahoo Finance prices */
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
                  <th>Remaining</th>
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
                  const remaining = t.remaining_size ?? t.size;

                  const entryC = hasPrice ? convertPrice(t.entry_price, native) : null;
                  const currentC = hasPrice ? convertPrice(currentPrice, native) : null;

                  let calc = null;
                  if (entryC != null && currentC != null && remaining) {
                    const pnlD = t.direction === 'long'
                      ? (currentC - entryC) * remaining
                      : (entryC - currentC) * remaining;
                    const cost = entryC * remaining;
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
                      <td style={{ fontFamily: 'var(--text-mono)' }}>{remaining}</td>
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
      )}

      {closingTrade && (
        <Modal title={`Close Position — ${closingTrade.trade.symbol}`} onClose={() => setClosingTrade(null)} width={520}>
          <ClosePositionForm
            trade={closingTrade.trade}
            currentPrice={closingTrade.currentPrice}
            onClose={() => {
              setClosingTrade(null);
              qc.invalidateQueries({ queryKey: ['trades'] });
            }}
          />
        </Modal>
      )}

      {showImport && (
        <Modal title="Import from CSV" onClose={() => setShowImport(false)} width={680}>
          <CsvImport onClose={() => {
            setShowImport(false);
            qc.invalidateQueries({ queryKey: ['trades'] });
            qc.invalidateQueries({ queryKey: ['stats'] });
          }} />
        </Modal>
      )}
    </div>
  );
}
