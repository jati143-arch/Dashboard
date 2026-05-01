import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tradesApi, pricesApi, signalsApi } from '../../api/client.js';
import Modal from '../shared/Modal.jsx';
import ClosePositionForm from '../trades/ClosePositionForm.jsx';
import { useChart } from '../../context/ChartContext.jsx';
import { useCurrency } from '../../context/CurrencyContext.jsx';
import { CUR_SYMBOL } from '../../utils/currency.js';
import CurrencyToggle from '../shared/CurrencyToggle.jsx';
import { speakSignal } from '../../utils/speakSignal.js';
import { toTvSymbol } from '../../utils/tvSymbol.js';

const SIG_BG = {
  'STRONG BUY':  'rgba(0,255,136,0.15)', 'BUY':  'rgba(0,220,100,0.12)',
  'WEAK BUY':    'rgba(80,200,120,0.10)', 'NEUTRAL': 'rgba(120,120,120,0.10)',
  'WEAK SELL':   'rgba(255,120,80,0.10)', 'SELL': 'rgba(255,80,60,0.12)',
  'STRONG SELL': 'rgba(255,51,85,0.15)',
};
const SIG_COLOR = {
  'STRONG BUY': '#00ff88', 'BUY': '#00dc64', 'WEAK BUY': '#50c878',
  'NEUTRAL': '#aaa', 'WEAK SELL': '#ff7850', 'SELL': '#ff503c', 'STRONG SELL': '#ff3355',
};
const SIG_BORDER = {
  'STRONG BUY': 'rgba(0,255,136,0.4)', 'BUY': 'rgba(0,220,100,0.35)',
  'WEAK BUY': 'rgba(80,200,120,0.3)', 'NEUTRAL': 'rgba(150,150,150,0.3)',
  'WEAK SELL': 'rgba(255,120,80,0.3)', 'SELL': 'rgba(255,80,60,0.35)',
  'STRONG SELL': 'rgba(255,51,85,0.4)',
};

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

const SORT_ICON = (key, sortKey, sortDir) => {
  if (sortKey !== key) return <span style={{ color: 'var(--border)', marginLeft: 3 }}>⇅</span>;
  return <span style={{ marginLeft: 3, fontSize: 9 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
};

export default function OpenPositions({ onAddPosition }) {
  const qc = useQueryClient();
  const { openChart } = useChart();
  const { currency: displayCurrency, rates } = useCurrency();
  const [closingTrade, setClosingTrade] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
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
  const eurUsd = rates.eurUsd;
  const cs = CUR_SYMBOL[displayCurrency];

  function fmt(amount) {
    const locale = displayCurrency === 'INR' ? 'en-IN' : 'en-US';
    return `${cs}${Math.abs(amount).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function convertPrice(price, native) {
    return fromUSD(toUSD(price, native, usdInr, eurUsd), displayCurrency, usdInr, eurUsd);
  }

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function copySymbol(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  async function scanSignals() {
    setScanLoading(true);
    const results = {};
    await Promise.allSettled(tradeSymbols.map(async sym => {
      try {
        const data = await signalsApi.get(sym);
        results[sym] = data;
        if (data.isBuy) speakSignal(data, sym);
      } catch { results[sym] = null; }
    }));
    setSignals(results);
    setScanLoading(false);
  }

  const thStyle = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

  const counts = { all: openTrades.length, us: 0, indian: 0, crypto: 0 };
  openTrades.forEach(t => { counts[detectRegion(t.symbol, t.instrument_type)]++; });

  // Build enriched rows for sorting
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
      const prevCloseRaw = (hasPrice && liveData.change != null) ? currentPrice - liveData.change : null;
      const prevCloseC = prevCloseRaw != null ? convertPrice(prevCloseRaw, native) : null;

      let pnlD = null, pnlP = null;
      if (entryC != null && currentC != null) {
        pnlD = t.direction === 'long' ? (currentC - entryC) * qty : (entryC - currentC) * qty;
        const cost = entryC * qty;
        pnlP = cost !== 0 ? (pnlD / cost) * 100 : 0;
      }

      // Today's gain: price change today × qty (in native currency, shown in INR for Indian)
      const todayGain = (liveData?.change != null) ? liveData.change * qty : null;
      const todayGainC = (todayGain != null) ? convertPrice(Math.abs(todayGain), native) * Math.sign(todayGain) : null;

      return { t, region, native, liveData, currentPrice, hasPrice, qty,
               entryC, currentC, prevCloseC, pnlD, pnlP, todayGain, todayGainC };
    });

  // Sort
  const sorted = [...enriched].sort((a, b) => {
    let av, bv;
    switch (sortKey) {
      case 'symbol':     av = a.t.symbol;           bv = b.t.symbol;           break;
      case 'date':       av = a.t.date;              bv = b.t.date;             break;
      case 'entry':      av = a.entryC ?? 0;         bv = b.entryC ?? 0;        break;
      case 'prev_close': av = a.prevCloseC ?? 0;     bv = b.prevCloseC ?? 0;    break;
      case 'current':    av = a.currentC ?? 0;       bv = b.currentC ?? 0;      break;
      case 'change_pct': av = a.liveData?.changePercent ?? -Infinity; bv = b.liveData?.changePercent ?? -Infinity; break;
      case 'remaining':  av = a.qty;                 bv = b.qty;                break;
      case 'pnl':        av = a.pnlD ?? -Infinity;   bv = b.pnlD ?? -Infinity;  break;
      case 'today_gain': av = a.todayGainC ?? -Infinity; bv = b.todayGainC ?? -Infinity; break;
      default:           av = a.t.date;              bv = b.t.date;
    }
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const totalUnrealized = enriched.reduce((sum, { pnlD }) => sum + (pnlD ?? 0), 0);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {onAddPosition && (
              <button
                onClick={onAddPosition}
                style={{ padding: '4px 12px', fontSize: 11, borderRadius: 4, cursor: 'pointer', fontWeight: 600,
                  border: 'none', background: 'var(--accent)', color: '#000' }}
              >
                ◉ Add Position
              </button>
            )}
            <button
              onClick={scanSignals}
              disabled={scanLoading}
              style={{ padding: '4px 12px', fontSize: 11, borderRadius: 4, cursor: 'pointer', fontWeight: 600,
                border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)' }}
            >
              {scanLoading ? '⟳ Scanning…' : '◈ Scan Signals'}
            </button>
            <button
              onClick={() => setShowTvModal(true)}
              style={{ padding: '4px 12px', fontSize: 11, borderRadius: 4, cursor: 'pointer', fontWeight: 600,
                border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)' }}
            >
              ⟷ TV Tickers
            </button>
            <CurrencyToggle />
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
                <th style={thStyle} onClick={() => toggleSort('symbol')}>Symbol {SORT_ICON('symbol', sortKey, sortDir)}</th>
                <th>Dir</th>
                <th style={thStyle} onClick={() => toggleSort('date')}>Entry Date {SORT_ICON('date', sortKey, sortDir)}</th>
                <th style={thStyle} onClick={() => toggleSort('entry')}>Entry Price {SORT_ICON('entry', sortKey, sortDir)}</th>
                <th style={thStyle} onClick={() => toggleSort('prev_close')}>Prev Close {SORT_ICON('prev_close', sortKey, sortDir)}</th>
                <th style={thStyle} onClick={() => toggleSort('current')}>Current Price {SORT_ICON('current', sortKey, sortDir)}</th>
                <th style={thStyle} onClick={() => toggleSort('change_pct')}>Change {SORT_ICON('change_pct', sortKey, sortDir)}</th>
                <th style={thStyle} onClick={() => toggleSort('today_gain')}>Today's Gain {SORT_ICON('today_gain', sortKey, sortDir)}</th>
                <th style={thStyle} onClick={() => toggleSort('remaining')}>Remaining {SORT_ICON('remaining', sortKey, sortDir)}</th>
                <th style={thStyle} onClick={() => toggleSort('pnl')}>Unrealized P&L {SORT_ICON('pnl', sortKey, sortDir)}</th>
                <th>Signal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 20 }}>No positions found</td></tr>
              ) : sorted.map(({ t, liveData, entryC, currentC, prevCloseC, pnlD, pnlP, todayGainC }) => {
                const pnlColor = pnlD == null ? 'var(--text-dim)' : pnlD >= 0 ? 'var(--green)' : 'var(--red)';
                const gainColor = todayGainC == null ? 'var(--text-dim)' : todayGainC >= 0 ? 'var(--green)' : 'var(--red)';
                const region = detectRegion(t.symbol, t.instrument_type);
                const nativeSymbol = region === 'indian' ? '₹' : '$';

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
                    <td style={{ fontFamily: 'var(--text-mono)', color: 'var(--text-secondary)' }}>
                      {prevCloseC != null ? fmt(prevCloseC) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--text-mono)', color: 'var(--text-primary)' }}>
                      {currentC != null ? fmt(currentC) : <span style={{ color: 'var(--text-dim)' }}>Loading...</span>}
                    </td>
                    <td>
                      {liveData && (
                        <span style={{ fontFamily: 'var(--text-mono)', fontSize: 12, color: liveData.changePercent >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {liveData.changePercent >= 0 ? '+' : ''}{liveData.changePercent.toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td>
                      {todayGainC != null ? (
                        <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 600, color: gainColor }}>
                          {todayGainC >= 0 ? '+' : '-'}{fmt(todayGainC)}
                        </span>
                      ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--text-mono)' }}>{t.remaining_size ?? t.size}</td>
                    <td>
                      {pnlD != null ? (
                        <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, color: pnlColor }}>
                          {pnlD >= 0 ? '+' : '-'}{fmt(pnlD)}
                          <span style={{ fontSize: '0.8em', marginLeft: 5, opacity: 0.8 }}>
                            ({pnlP >= 0 ? '+' : ''}{pnlP.toFixed(1)}%)
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const sig = signals[t.symbol];
                        if (!sig) return <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>;
                        return (
                          <span
                            onClick={() => openChart(t.symbol, t.entry_price)}
                            title="View chart"
                            style={{
                              cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                              background: SIG_BG[sig.signal] || SIG_BG['NEUTRAL'],
                              color: SIG_COLOR[sig.signal] || SIG_COLOR['NEUTRAL'],
                              border: `1px solid ${SIG_BORDER[sig.signal] || SIG_BORDER['NEUTRAL']}`,
                              whiteSpace: 'nowrap',
                            }}
                          >{sig.signal}</span>
                        );
                      })()}
                    </td>
                    <td>
                      <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}
                        onClick={() => setClosingTrade({ trade: t, currentPrice: liveData?.price })}>
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

      {showTvModal && (
        <Modal title="TradingView Symbol Reference" onClose={() => setShowTvModal(false)} width={520}>
          <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-dim)' }}>
            Use these symbols in TradingView search or Pine Script. Click any symbol to copy.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tradeSymbols.map(sym => {
              const tv = toTvSymbol(sym);
              const key = `all_${sym}`;
              return (
                <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <span style={{ fontFamily: 'var(--text-mono)', fontSize: 12, color: 'var(--text-dim)', width: 140, flexShrink: 0 }}>{sym}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>→</span>
                  <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 13, color: 'var(--accent)', flex: 1 }}>{tv}</span>
                  <button
                    onClick={() => copySymbol(tv, key)}
                    style={{ padding: '3px 10px', fontSize: 10, borderRadius: 3, cursor: 'pointer', fontWeight: 600, border: '1px solid var(--border)', background: copied === key ? 'rgba(0,255,136,0.15)' : 'transparent', color: copied === key ? 'var(--green)' : 'var(--text-secondary)' }}
                  >{copied === key ? '✓ Copied' : 'Copy'}</button>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => copySymbol(tradeSymbols.map(toTvSymbol).join(','), 'all')}
            style={{ marginTop: 14, width: '100%', padding: '8px', fontSize: 12, borderRadius: 5, cursor: 'pointer', fontWeight: 600, border: '1px solid var(--border)', background: copied === 'all' ? 'rgba(0,255,136,0.15)' : 'transparent', color: copied === 'all' ? 'var(--green)' : 'var(--text-secondary)' }}
          >{copied === 'all' ? '✓ All Copied!' : '⎘ Copy All as Comma-Separated'}</button>
        </Modal>
      )}
    </>
  );
}
