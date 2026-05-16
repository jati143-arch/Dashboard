import { useState, Fragment } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tradesApi, pricesApi, signalsApi } from '../../api/client.js';
import { FundamentalsPanel } from '../shared/FundamentalsPanel.jsx';
import SignalsPanel from '../shared/SignalsPanel.jsx';
import Modal from '../shared/Modal.jsx';
import ClosePositionForm from '../trades/ClosePositionForm.jsx';
import { useChart } from '../../context/ChartContext.jsx';
import { useCurrency } from '../../context/CurrencyContext.jsx';
import { CUR_SYMBOL } from '../../utils/currency.js';
import CurrencyToggle from '../shared/CurrencyToggle.jsx';
import { toTvSymbol } from '../../utils/tvSymbol.js';

const SIG_BG = {
  'STRONG BUY': 'rgba(34,255,136,0.1)', 'BUY': 'rgba(0,220,100,0.08)',
  'WEAK BUY': 'rgba(80,200,120,0.07)', 'NEUTRAL': 'rgba(100,100,100,0.07)',
  'WEAK SELL': 'rgba(255,120,80,0.07)', 'SELL': 'rgba(255,80,60,0.08)',
  'STRONG SELL': 'rgba(255,51,85,0.1)',
};

function detectRegion(symbol, instrumentType) {
  if (instrumentType === 'crypto') return 'crypto';
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO') || symbol.startsWith('NSE:') || symbol.startsWith('BSE:')) return 'indian';
  return 'us';
}

function toUSD(price, native, usdInr) { return native === 'INR' ? price / usdInr : price; }
function fromUSD(usdPrice, target, usdInr) { return target === 'INR' ? usdPrice * usdInr : usdPrice; }

export default function OpenPositions({ onAddPosition }) {
  const qc = useQueryClient();
  const { openChart } = useChart();
  const { currency: displayCurrency, rates } = useCurrency();
  const [closingTrade, setClosingTrade] = useState(null);
  const [expandedFund, setExpandedFund] = useState(null);
  const [showFundTab, setShowFundTab] = useState('fundamentals');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [signals, setSignals] = useState({});
  const [scanLoading, setScanLoading] = useState(false);
  const [showTvModal, setShowTvModal] = useState(false);
  const [copied, setCopied] = useState(null);

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

  const usdInr = rates.usdInr;
  const cs = CUR_SYMBOL[displayCurrency];

  function fmt(amount) {
    const locale = displayCurrency === 'INR' ? 'en-IN' : 'en-US';
    return `${cs}${Math.abs(amount).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function convertPrice(price, native) {
    return fromUSD(toUSD(price, native, usdInr), displayCurrency, usdInr);
  }

  async function scanSignals() {
    setScanLoading(true);
    const results = {};
    await Promise.allSettled(tradeSymbols.map(async sym => {
      try { results[sym] = await signalsApi.get(sym); } catch { results[sym] = null; }
    }));
    setSignals(results);
    setScanLoading(false);
  }

  const counts = { all: openTrades.length, us: 0, indian: 0, crypto: 0 };
  openTrades.forEach(t => { counts[detectRegion(t.symbol, t.instrument_type)]++; });

  const TABS = [['all', 'All'], ['us', 'US'], ['indian', 'Indian'], ['crypto', 'Crypto']];

  const enriched = openTrades
    .filter(t => activeTab === 'all' || detectRegion(t.symbol, t.instrument_type) === activeTab)
    .filter(t => t.symbol.toUpperCase().includes(search.toUpperCase()))
    .map(t => {
      const region = detectRegion(t.symbol, t.instrument_type);
      const native = region === 'indian' ? 'INR' : 'USD';
      const liveData = prices[t.symbol];
      const currentPrice = liveData?.price;
      const hasPrice = currentPrice != null;
      const qty = t.remaining_size ?? t.size;
      const entryC = hasPrice ? convertPrice(t.entry_price, native) : null;
      const currentC = hasPrice ? convertPrice(currentPrice, native) : null;
      const prevCloseRaw = hasPrice && liveData.change != null ? currentPrice - liveData.change : null;
      const prevCloseC = prevCloseRaw != null ? convertPrice(prevCloseRaw, native) : null;
      let pnlD = null, pnlP = null;
      if (entryC != null && currentC != null) {
        pnlD = t.direction === 'long' ? (currentC - entryC) * qty : (entryC - currentC) * qty;
        const cost = entryC * qty;
        pnlP = cost !== 0 ? (pnlD / cost) * 100 : 0;
      }
      const todayGain = liveData?.change != null ? liveData.change * qty : null;
      const todayGainC = todayGain != null ? convertPrice(Math.abs(todayGain), native) * Math.sign(todayGain) : null;
      return { t, region, liveData, currentPrice, hasPrice, qty, entryC, currentC, prevCloseC, pnlD, pnlP, todayGain, todayGainC };
    });

  const totalUnrealized = enriched.reduce((sum, { pnlD }) => sum + (pnlD ?? 0), 0);
  const headerBg = { background: 'rgba(34,255,136,0.04)', borderLeft: '3px solid var(--color-yellow)' };

  return (
    <>
      <div className="card mb-6" style={headerBg}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-yellow)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>◉ Open Positions ({openTrades.length})</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>prices refresh every 60s</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {onAddPosition && (
              <button onClick={onAddPosition} style={{ padding: '8px 20px', fontSize: 12, fontWeight: 700, borderRadius: 9999, border: 'none', background: '#fff', color: '#000', cursor: 'pointer' }}>
                + Add Position
              </button>
            )}
            <button onClick={scanSignals} disabled={scanLoading} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 9999, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              {scanLoading ? '⟳ Scanning…' : '◈ Scan Signals'}
            </button>
            <button onClick={() => setShowTvModal(true)} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 9999, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              ⟷ TV Tickers
            </button>
            <CurrencyToggle />
            <div>
              <span style={{ fontSize: 11, color: 'var(--color-text-dim)', marginRight: 8 }}>Unrealized:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: totalUnrealized >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                {totalUnrealized >= 0 ? '+' : '-'}{fmt(totalUnrealized)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {TABS.filter(([k]) => k === 'all' || counts[k] > 0).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{
                padding: '6px 16px', fontSize: 12, fontWeight: 600, borderRadius: 9999, cursor: 'pointer',
                border: activeTab === key ? 'none' : '1px solid rgba(255,255,255,0.1)',
                background: activeTab === key ? 'var(--color-yellow)' : 'transparent',
                color: activeTab === key ? '#000' : 'var(--color-text-secondary)',
              }}>{label} ({counts[key]})</button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search symbol..." style={{ width: 160, fontSize: 12, padding: '6px 12px' }} />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Dir</th>
                <th>Entry Date</th>
                <th>Entry Price</th>
                <th>Prev Close</th>
                <th>Current Price</th>
                <th>Change</th>
                <th>Today's Gain</th>
                <th>Remaining</th>
                <th>Unrealized P&L</th>
                <th>Signal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', color: 'var(--color-text-dim)', padding: 32 }}>No positions found</td></tr>
              ) : enriched.map(({ t, liveData, entryC, currentC, prevCloseC, pnlD, pnlP, todayGainC }) => {
                const pnlColor = pnlD == null ? 'var(--color-text-dim)' : pnlD >= 0 ? 'var(--color-green)' : 'var(--color-red)';
                const gainColor = todayGainC == null ? 'var(--color-text-dim)' : todayGainC >= 0 ? 'var(--color-green)' : 'var(--color-red)';
                const region = detectRegion(t.symbol, t.instrument_type);
                const fundOpen = expandedFund === t.id;

                return (
                  <Fragment key={t.id}>
                    <tr>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent-secondary)', cursor: 'pointer', fontSize: 15 }} onClick={() => openChart(t.symbol, t.entry_price)}>{t.symbol}</span>
                        <span className={`badge badge-${t.instrument_type}`} style={{ marginLeft: 6, fontSize: 9 }}>{t.instrument_type}</span>
                      </td>
                      <td><span className={`badge badge-${t.direction}`}>{t.direction}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}>{t.date}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{entryC != null ? fmt(entryC) : `${region === 'indian' ? '₹' : '$'}${t.entry_price}`}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{prevCloseC != null ? fmt(prevCloseC) : <span style={{ color: 'var(--color-text-dim)' }}>—</span>}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{currentC != null ? fmt(currentC) : <span style={{ color: 'var(--color-text-dim)' }}>Loading...</span>}</td>
                      <td>
                        {liveData && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: liveData.changePercent >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                            {liveData.changePercent >= 0 ? '+' : ''}{liveData.changePercent.toFixed(2)}%
                          </span>
                        )}
                      </td>
                      <td>
                        {todayGainC != null ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: gainColor }}>
                            {todayGainC >= 0 ? '+' : '-'}{fmt(todayGainC)}
                          </span>
                        ) : <span style={{ color: 'var(--color-text-dim)' }}>—</span>}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{t.remaining_size ?? t.size}</td>
                      <td>
                        {pnlD != null ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: pnlColor }}>
                            {pnlD >= 0 ? '+' : '-'}{fmt(pnlD)}
                            <span style={{ fontSize: '0.8em', marginLeft: 5, opacity: 0.8 }}>({pnlP >= 0 ? '+' : ''}{pnlP.toFixed(1)}%)</span>
                          </span>
                        ) : <span style={{ color: 'var(--color-text-dim)', fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        {(() => {
                          const sig = signals[t.symbol];
                          if (!sig) return <span style={{ color: 'var(--color-text-dim)', fontSize: 11 }}>—</span>;
                          return (
                            <span onClick={() => openChart(t.symbol, t.entry_price)} style={{ cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, background: SIG_BG[sig.signal] || SIG_BG['NEUTRAL'], color: sig.signal === 'STRONG BUY' ? 'var(--color-green)' : sig.signal.includes('BUY') ? 'var(--color-green)' : sig.signal.includes('SELL') ? 'var(--color-red)' : 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                              {sig.signal}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {region === 'indian' && (
                          <button onClick={() => setExpandedFund(fundOpen ? null : t.id)} style={{ padding: '4px 12px', fontSize: 11, marginRight: 6, background: fundOpen ? 'rgba(0,212,255,0.1)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: fundOpen ? 'var(--color-accent-secondary)' : 'var(--color-text-dim)', borderRadius: 9999, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ display: 'inline-block', transition: 'transform 0.3s ease', transform: fundOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span> Fund
                          </button>
                        )}
                        <button onClick={() => setClosingTrade({ trade: t, currentPrice: liveData?.price })} style={{ padding: '6px 16px', fontSize: 12, fontWeight: 700, borderRadius: 9999, border: 'none', background: '#fff', color: '#000', cursor: 'pointer' }}>
                          Close
                        </button>
                      </td>
                    </tr>
{/* Expandable row: Fundamentals + Signals sub-panels */}
                     {fundOpen && (
                       <tr><td colSpan={12} style={{ padding: 0 }}>
                         <div style={{ animation: 'fadeSlideUp 0.3s ease both' }}>
                         <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                           <button
                             onClick={() => setShowFundTab('fundamentals')}
                             style={{
                               padding: '8px 16px', fontSize: 12, fontWeight: 600,
                               background: showFundTab === 'fundamentals' ? 'var(--color-accent)' : 'transparent',
                               color: showFundTab === 'fundamentals' ? '#000' : 'var(--color-text-dim)',
                               border: 'none', cursor: 'pointer',
                               borderBottom: showFundTab === 'fundamentals' ? '2px solid #22ff88' : 'none',
                             }}
                           >
                             Fundamentals
                           </button>
                           <button
                             onClick={() => setShowFundTab('signals')}
                             style={{
                               padding: '8px 16px', fontSize: 12, fontWeight: 600,
                               background: showFundTab === 'signals' ? 'var(--color-accent)' : 'transparent',
                               color: showFundTab === 'signals' ? '#000' : 'var(--color-text-dim)',
                               border: 'none', cursor: 'pointer',
                               borderBottom: showFundTab === 'signals' ? '2px solid #22ff88' : 'none',
                             }}
                           >
                             Signal Analysis
                           </button>
                         </div>
                         <div style={{ display: showFundTab === 'fundamentals' ? 'block' : 'none' }}>
                           <FundamentalsPanel symbol={t.symbol} />
                         </div>
                         <div style={{ display: showFundTab === 'signals' ? 'block' : 'none' }}>
                           <SignalsPanel symbol={t.symbol} />
                         </div>
                         </div>
                       </td></tr>
                     )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {closingTrade && (
        <Modal title={`Close Position — ${closingTrade.trade.symbol}`} onClose={() => setClosingTrade(null)} width={520}>
          <ClosePositionForm trade={closingTrade.trade} currentPrice={closingTrade.currentPrice} onClose={() => setClosingTrade(null)} />
        </Modal>
      )}

      {showTvModal && (
        <Modal title="TradingView Symbol Reference" onClose={() => setShowTvModal(false)} width={520}>
          <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--color-text-dim)' }}>Use these symbols in TradingView search. Click any symbol to copy.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tradeSymbols.map(sym => {
              const tv = toTvSymbol(sym);
              const key = `all_${sym}`;
              return (
                <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--color-bg-base)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-dim)', width: 140, flexShrink: 0 }}>{sym}</span>
                  <span style={{ color: 'var(--color-text-dim)' }}>→</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--color-accent-secondary)', flex: 1 }}>{tv}</span>
                  <button onClick={() => { navigator.clipboard.writeText(tv); setCopied(key); setTimeout(() => setCopied(null), 1500); }} style={{ padding: '4px 12px', fontSize: 10, borderRadius: 9999, cursor: 'pointer', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', background: copied === key ? 'rgba(34,255,136,0.1)' : 'transparent', color: copied === key ? 'var(--color-green)' : 'var(--color-text-secondary)' }}>
                    {copied === key ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
}