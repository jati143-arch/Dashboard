import { useState, Fragment } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tradesApi, pricesApi, statsApi, mfApi } from '../api/client.js';
import MutualFundTracker from '../components/mf/MutualFundTracker.jsx';
import Modal from '../components/shared/Modal.jsx';
import ClosePositionForm from '../components/trades/ClosePositionForm.jsx';
import CsvImport from '../components/trades/CsvImport.jsx';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';
import { FundamentalsPanel, ScreenerQuarterlyPanel, ScreenerBalanceSheetPanel, ScreenerCashFlowPanel, ScreenerAnnualPanel } from '../components/shared/FundamentalsPanel.jsx';
import { useChart } from '../context/ChartContext.jsx';

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
  ['all',        'All'],
  ['us',         'US Market'],
  ['indian',     'Indian Markets'],
  ['crypto',     'Crypto'],
  ['etf',        'US ETF/Funds'],
  ['mf',         'Indian MF'],
  ['mf-tracker', 'MF Tracker'],
];

const CURRENCY_OPTIONS = {
  all:        ['USD', 'INR', 'EUR'],
  us:         ['USD', 'EUR'],
  indian:     ['INR', 'EUR'],
  crypto:     ['USD', 'EUR'],
  etf:        ['USD', 'EUR'],
  mf:         ['INR'],
  'mf-tracker': ['INR'],
};

function getInitCurrency(tab) {
  const saved = localStorage.getItem(`inv_currency_${tab}`);
  const opts = CURRENCY_OPTIONS[tab];
  return saved && opts.includes(saved) ? saved : opts[0];
}


function MfNavCell({ schemeCode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['mf-nav', schemeCode],
    queryFn: () => mfApi.nav(schemeCode),
    staleTime: 60 * 60_000,
  });
  if (isLoading) return <span style={{ color: 'var(--color-text-dim)' }}>Loading…</span>;
  if (!data) return <span style={{ color: 'var(--color-text-dim)' }}>—</span>;
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
      ₹{data.nav.toFixed(4)}
      {data.date && <span style={{ fontSize: 10, color: 'var(--color-text-dim)', marginLeft: 4 }}>({data.date})</span>}
    </span>
  );
}

export default function Investments() {
  const qc = useQueryClient();
  const { openChart } = useChart();
  const [activeTab, setActiveTab] = useState('all');
  const [displayCurrency, setDisplayCurrency] = useState(() => getInitCurrency('all'));
  const [closingTrade, setClosingTrade] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [expandedFund, setExpandedFund] = useState(null);
  const [expandedQtly, setExpandedQtly] = useState(null);
  const [expandedBal, setExpandedBal] = useState(null);
  const [expandedCash, setExpandedCash] = useState(null);
  const [expandedAnnual, setExpandedAnnual] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

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

  const counts = { all: 0, us: 0, indian: 0, crypto: 0, etf: 0, mf: 0 };
  openTrades.forEach(t => {
    const r = detectRegion(t.symbol, t.instrument_type);
    counts[r]++;
    if (r !== 'mf') counts.all++;
  });

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const filtered = (() => {
    const arr = openTrades.filter(t => {
      const r = detectRegion(t.symbol, t.instrument_type);
      const matchesTab = activeTab === 'all' ? r !== 'mf' : r === activeTab;
      const matchesSearch = !searchQuery || t.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
    if (!sortKey) return arr;
    return [...arr].sort((a, b) => {
      let av, bv;
      if (sortKey === 'symbol') {
        av = a.symbol; bv = b.symbol;
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (sortKey === 'pnl') {
        const calc = (t) => {
          const native = detectRegion(t.symbol, t.instrument_type) === 'indian' ? 'INR' : 'USD';
          const liveData = prices[t.symbol];
          if (!liveData) return null;
          const remaining = t.remaining_size ?? t.size;
          const entryC = convertPrice(t.entry_price, native);
          const currentC = convertPrice(liveData.price, native);
          return t.direction === 'long' ? (currentC - entryC) * remaining : (entryC - currentC) * remaining;
        };
        av = calc(a) ?? -Infinity;
        bv = calc(b) ?? -Infinity;
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return 0;
    });
  })();

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
    filtered.forEach(t => {
      totalInvested += t.entry_price * (t.remaining_size ?? t.size);
    });
  }

  const pnlColor = totalUnrealized >= 0 ? '#22ff88' : '#ff4444';
  const allTimePnl = tabStats?.total_pnl;
  const allTimePnlColor = allTimePnl == null ? 'var(--color-text-dim)' : allTimePnl >= 0 ? '#22ff88' : '#ff4444';
  const currencyOpts = CURRENCY_OPTIONS[activeTab];

  return (
    <div style={{ animation: 'fadeSlideUp 0.45s ease both' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4, fontFamily: "'Inter', system-ui, sans-serif" }}>Investments</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-dim)', fontFamily: "'Inter', system-ui, sans-serif" }}>Open positions · Prices refresh every 60s</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowImport(true)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '9999px',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            ⬆ Import CSV
          </button>
          <button
            onClick={() => tradesApi.exportCSV(activeTab)}
            style={{
              padding: '10px 20px',
              background: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              color: '#050505',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* Pill sub-tabs */}
      <div style={{
        display: 'flex',
        gap: 6,
        marginBottom: 16,
        flexWrap: 'wrap',
        padding: 4,
        background: 'var(--color-bg-base)',
        borderRadius: '9999px',
        border: '1px solid var(--color-border)',
        width: 'fit-content',
      }}>
        {SUB_TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => switchTab(key)}
            style={{
              padding: '8px 16px',
              fontSize: 12,
              borderRadius: '9999px',
              cursor: 'pointer',
              fontWeight: 600,
              border: 'none',
              background: activeTab === key ? '#ffffff' : 'transparent',
              color: activeTab === key ? '#050505' : 'var(--color-text-secondary)',
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {label}{key !== 'mf-tracker' ? ` (${counts[key]})` : ''}
          </button>
        ))}
      </div>

      {/* Dedicated MF Tracker tab */}
      {activeTab === 'mf-tracker' && (
        <div style={{ marginTop: 8 }}>
          <MutualFundTracker />
        </div>
      )}

      {activeTab !== 'mf-tracker' && (<>
      {/* Search bar */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="🔍 Search symbol..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 24,
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            fontSize: 13,
            fontFamily: "'Inter', system-ui, sans-serif",
            outline: 'none',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              padding: '10px 16px',
              borderRadius: 24,
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-card)',
              color: 'var(--color-text-dim)',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Summary card - large mono stats */}
      <div style={{
        marginBottom: 20,
        padding: 28,
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        flexWrap: 'wrap',
        borderLeft: '3px solid var(--color-green)',
      }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6, fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>Positions</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 28, color: 'var(--color-text-primary)' }}>{filtered.length}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6, fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>Total Invested</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 28, color: 'var(--color-text-primary)' }}>
            {isMfTab ? `₹${totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : fmt(totalInvested)}
          </div>
        </div>
        {!isMfTab && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6, fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>Unrealized P&L</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 28, color: pnlColor }}>
              {totalUnrealized >= 0 ? '+' : '-'}{fmt(totalUnrealized)}
            </div>
          </div>
        )}
        {allTimePnl != null && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6, fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>All-Time Realized P&L</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 28, color: allTimePnlColor }}>
              {allTimePnl >= 0 ? '+' : '-'}{isMfTab ? `₹${Math.abs(allTimePnl).toFixed(2)}` : `$${Math.abs(allTimePnl).toFixed(2)}`}
            </div>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {currencyOpts.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => switchCurrency(c)}
              style={{
                padding: '6px 14px',
                fontSize: 11,
                borderRadius: '9999px',
                cursor: 'pointer',
                fontWeight: 700,
                border: 'none',
                background: displayCurrency === c ? '#22ff88' : 'transparent',
                color: displayCurrency === c ? '#050505' : 'var(--color-text-dim)',
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: 'background 0.15s, color 0.15s',
              }}
            >{c}</button>
          ))}
        </div>
      </div>

      {/* Positions table */}
      {isLoading ? (
        <LoadingSpinner text="Loading positions..." />
      ) : isMfTab ? (
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 24,
          overflow: 'hidden',
          borderLeft: '3px solid var(--color-green)',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}>Scheme Code</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}>Dir</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}>Entry Date</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}>Entry NAV</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}>Latest NAV</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}>Units</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}>Invested</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-dim)', padding: '40px 20px', fontSize: 13 }}>
                      No mutual fund positions. Add one using "Open Position" with type "Indian Mutual Fund".
                    </td>
                  </tr>
                ) : filtered.map(t => {
                  const remaining = t.remaining_size ?? t.size;
                  return (
                    <tr key={t.id}>
                      <td style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--color-text-primary)' }}>{t.symbol}</span>
                        <span style={{ marginLeft: 8, fontSize: 9, padding: '2px 8px', background: 'var(--color-bg-base)', color: 'var(--color-text-secondary)', borderRadius: 9999, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif" }}>MF</span>
                      </td>
                      <td style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 9999, fontWeight: 600, background: t.direction === 'long' ? 'rgba(34,255,136,0.15)' : 'rgba(255,68,68,0.15)', color: t.direction === 'long' ? '#22ff88' : '#ff4444', fontFamily: "'Inter', system-ui, sans-serif" }}>{t.direction}</span>
                      </td>
                      <td style={{ padding: '12px 24px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>{t.date}</td>
                      <td style={{ padding: '12px 24px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>₹{t.entry_price.toFixed(4)}</td>
                      <td style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border)' }}><MfNavCell schemeCode={t.symbol} /></td>
                      <td style={{ padding: '12px 24px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>{remaining}</td>
                      <td style={{ padding: '12px 24px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>₹{(t.entry_price * remaining).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border)' }}>
                        <button
                          onClick={() => setClosingTrade({ trade: t, currentPrice: null })}
                          style={{
                            padding: '6px 14px',
                            background: '#ffffff',
                            border: 'none',
                            borderRadius: 9999,
                            color: '#050505',
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: "'Inter', system-ui, sans-serif",
                          }}
                        >
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
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 24,
          overflow: 'hidden',
          borderLeft: '3px solid var(--color-green)',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th onClick={() => toggleSort('symbol')} style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: sortKey === 'symbol' ? 'var(--color-green)' : 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Symbol {sortKey === 'symbol' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}>Dir</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}>Entry Date</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}>Entry Price</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}>Current Price</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}>Change %</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}>Remaining</th>
                  <th onClick={() => toggleSort('pnl')} style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: sortKey === 'pnl' ? 'var(--color-green)' : 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Unrealized P&L {sortKey === 'pnl' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid var(--color-border)' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--color-text-dim)', padding: '40px 20px', fontSize: 13 }}>
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

                  const rowPnlColor = !calc ? 'var(--color-text-dim)' : calc.pnlD >= 0 ? '#22ff88' : '#ff4444';
                  const nativeSymbol = native === 'INR' ? '₹' : '$';

                  const isIndian = region === 'indian';
                  const fundOpen = expandedFund === t.symbol;

                  return (
                    <Fragment key={t.id}>
                      <tr>
                        <td style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border)' }}>
                          <span
                            style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--color-green)', cursor: 'pointer' }}
                            onClick={() => openChart(t.symbol, t.entry_price)}
                            title="View chart"
                          >{t.symbol}</span>
                          <span style={{ marginLeft: 8, fontSize: 9, padding: '2px 8px', background: 'var(--color-bg-base)', color: 'var(--color-text-secondary)', borderRadius: 9999, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif" }}>{t.instrument_type}</span>
                        </td>
                        <td style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border)' }}>
                          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 9999, fontWeight: 600, background: t.direction === 'long' ? 'rgba(34,255,136,0.15)' : 'rgba(255,68,68,0.15)', color: t.direction === 'long' ? '#22ff88' : '#ff4444', fontFamily: "'Inter', system-ui, sans-serif" }}>{t.direction}</span>
                        </td>
                        <td style={{ padding: '12px 24px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>{t.date}</td>
                        <td style={{ padding: '12px 24px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>
                          {entryC != null ? fmt(entryC) : `${nativeSymbol}${t.entry_price}`}
                        </td>
                        <td style={{ padding: '12px 24px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>
                          {currentC != null
                            ? fmt(currentC)
                            : <span style={{ color: 'var(--color-text-dim)' }}>Loading...</span>}
                        </td>
                        <td style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border)' }}>
                          {liveData && (
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: liveData.changePercent >= 0 ? '#22ff88' : '#ff4444' }}>
                              {liveData.changePercent >= 0 ? '+' : ''}{liveData.changePercent.toFixed(2)}%
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 24px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>{remaining}</td>
                        <td style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border)' }}>
                          {calc ? (
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: rowPnlColor }}>
                              {calc.pnlD >= 0 ? '+' : '-'}{fmt(calc.pnlD)}
                              <span style={{ fontSize: '0.8em', marginLeft: 5, opacity: 0.8 }}>
                                ({calc.pnlP >= 0 ? '+' : ''}{calc.pnlP.toFixed(1)}%)
                              </span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-dim)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 24px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--color-border)' }}>
                          {isIndian && (
                            <button
                              onClick={() => setExpandedFund(fundOpen ? null : t.symbol)}
                              style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                marginRight: 4,
                                background: fundOpen ? 'rgba(34,255,136,0.15)' : 'transparent',
                                border: '1px solid var(--color-border)',
                                color: fundOpen ? '#22ff88' : 'var(--color-text-dim)',
                                borderRadius: 9999,
                                cursor: 'pointer',
                                fontFamily: "'Inter', system-ui, sans-serif",
                              }}
                            >
                              {fundOpen ? '▲ Fund' : '▼ Fund'}
                            </button>
                          )}
                          {isIndian && (
                            <button
                              onClick={() => setExpandedQtly(expandedQtly === t.symbol ? null : t.symbol)}
                              style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                marginRight: 4,
                                background: expandedQtly === t.symbol ? 'rgba(34,255,136,0.15)' : 'transparent',
                                border: '1px solid var(--color-border)',
                                color: expandedQtly === t.symbol ? '#22ff88' : 'var(--color-text-dim)',
                                borderRadius: 9999,
                                cursor: 'pointer',
                                fontFamily: "'Inter', system-ui, sans-serif",
                              }}
                            >
                              {expandedQtly === t.symbol ? '▲ P&L Q' : '📊 P&L Q'}
                            </button>
                          )}
                          {isIndian && (
                            <button
                              onClick={() => setExpandedBal(expandedBal === t.symbol ? null : t.symbol)}
                              style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                marginRight: 4,
                                background: expandedBal === t.symbol ? 'rgba(34,255,136,0.15)' : 'transparent',
                                border: '1px solid var(--color-border)',
                                color: expandedBal === t.symbol ? '#22ff88' : 'var(--color-text-dim)',
                                borderRadius: 9999,
                                cursor: 'pointer',
                                fontFamily: "'Inter', system-ui, sans-serif",
                              }}
                            >
                              {expandedBal === t.symbol ? '▲ Balance' : '📋 Balance'}
                            </button>
                          )}
                          {isIndian && (
                            <button
                              onClick={() => setExpandedCash(expandedCash === t.symbol ? null : t.symbol)}
                              style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                marginRight: 4,
                                background: expandedCash === t.symbol ? 'rgba(34,255,136,0.15)' : 'transparent',
                                border: '1px solid var(--color-border)',
                                color: expandedCash === t.symbol ? '#22ff88' : 'var(--color-text-dim)',
                                borderRadius: 9999,
                                cursor: 'pointer',
                                fontFamily: "'Inter', system-ui, sans-serif",
                              }}
                            >
                              {expandedCash === t.symbol ? '▲ Cash Flow' : '💰 Cash Flow'}
                            </button>
                          )}
                          {isIndian && (
                            <button
                              onClick={() => setExpandedAnnual(expandedAnnual === t.symbol ? null : t.symbol)}
                              style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                marginRight: 6,
                                background: expandedAnnual === t.symbol ? 'rgba(34,255,136,0.15)' : 'transparent',
                                border: '1px solid var(--color-border)',
                                color: expandedAnnual === t.symbol ? '#22ff88' : 'var(--color-text-dim)',
                                borderRadius: 9999,
                                cursor: 'pointer',
                                fontFamily: "'Inter', system-ui, sans-serif",
                              }}
                            >
                              {expandedAnnual === t.symbol ? '▲ P&L Y' : '📈 P&L Y'}
                            </button>
                          )}
                          <button
                            onClick={() => setClosingTrade({ trade: t, currentPrice })}
                            style={{
                              padding: '6px 14px',
                              background: '#ffffff',
                              border: 'none',
                              borderRadius: 9999,
                              color: '#050505',
                              cursor: 'pointer',
                              fontSize: 11,
                              fontWeight: 600,
                              fontFamily: "'Inter', system-ui, sans-serif",
                            }}
                          >
                            Close
                          </button>
                        </td>
                      </tr>
                      {fundOpen && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0, borderBottom: '1px solid var(--color-border)' }}>
                            <FundamentalsPanel symbol={t.symbol} />
                          </td>
                        </tr>
                      )}
                      {expandedQtly === t.symbol && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0, borderBottom: '1px solid var(--color-border)' }}>
                            <ScreenerQuarterlyPanel symbol={t.symbol} />
                          </td>
                        </tr>
                      )}
                      {expandedBal === t.symbol && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0, borderBottom: '1px solid var(--color-border)' }}>
                            <ScreenerBalanceSheetPanel symbol={t.symbol} />
                          </td>
                        </tr>
                      )}
                      {expandedCash === t.symbol && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0, borderBottom: '1px solid var(--color-border)' }}>
                            <ScreenerCashFlowPanel symbol={t.symbol} />
                          </td>
                        </tr>
                      )}
                      {expandedAnnual === t.symbol && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0, borderBottom: '1px solid var(--color-border)' }}>
                            <ScreenerAnnualPanel symbol={t.symbol} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
      </>)}
    </div>
  );
}