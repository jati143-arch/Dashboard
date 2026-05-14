import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { statsApi, tradesApi, pricesApi } from '../../api/client.js';
import { useCurrency } from '../../context/CurrencyContext.jsx';
import { CUR_SYMBOL } from '../../utils/currency.js';

const TIMEFRAMES = [
  {
    group: 'Intraday',
    options: [
      { label: '1 Min',  value: '1min' },
      { label: '5 Min',  value: '5min' },
      { label: '10 Min', value: '10min' },
      { label: '15 Min', value: '15min' },
      { label: '30 Min', value: '30min' },
      { label: '1 Hr',   value: '1h' },
      { label: '2 Hr',   value: '2h' },
      { label: '4 Hr',   value: '4h' },
    ],
  },
  {
    group: 'Short',
    options: [
      { label: '1 Day',   value: '1d' },
      { label: '2 Days',  value: '2d' },
      { label: '1 Week',  value: '1w' },
      { label: '2 Weeks', value: '2w' },
    ],
  },
  {
    group: 'Medium / Long',
    options: [
      { label: '1 Month',  value: '1m' },
      { label: '6 Months', value: '6m' },
      { label: '1 Year',   value: '1y' },
      { label: 'All',      value: 'all' },
    ],
  },
];

const INTRADAY = new Set(['1min','5min','10min','15min','30min','1h','2h','4h']);

const TF_INTERVAL_MS = {
  '1min': 60_000, '5min': 5*60_000, '10min': 10*60_000,
  '15min': 15*60_000, '30min': 30*60_000,
  '1h': 60*60_000, '2h': 2*60*60_000, '4h': 4*60*60_000,
};

function snapTimeKey(tf) {
  const now = new Date();
  const totalMins = now.getHours() * 60 + now.getMinutes();
  const interval = { '1min':1,'5min':5,'10min':10,'15min':15,'30min':30,'1h':60,'2h':120,'4h':240 }[tf] || 1;
  const rounded = Math.floor(totalMins / interval) * interval;
  const h = String(Math.floor(rounded / 60)).padStart(2, '0');
  const m = String(rounded % 60).padStart(2, '0');
  return `${h}:${m}`;
}

const SESSION_KEY = `pf_snapshots_${new Date().toISOString().slice(0, 10)}`;

function loadSnapshots() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]'); } catch { return []; }
}

function saveSnapshots(snaps) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(snaps)); } catch { /* quota */ }
}

function tfToFrom(tf) {
  const today = new Date().toISOString().slice(0, 10);
  if (INTRADAY.has(tf)) return today;
  const d = new Date();
  const map = { '1d': 1, '2d': 2, '1w': 7, '2w': 14, '1m': 30, '6m': 180, '1y': 365 };
  if (map[tf]) { d.setDate(d.getDate() - map[tf]); return d.toISOString().slice(0, 10); }
  return '2000-01-01';
}

function fmtY(sym) {
  return v => {
    if (Math.abs(v) >= 10_000_000) return `${sym}${(v / 10_000_000).toFixed(1)}Cr`;
    if (Math.abs(v) >= 100_000)    return `${sym}${(v / 100_000).toFixed(1)}L`;
    if (Math.abs(v) >= 1_000)      return `${sym}${(v / 1_000).toFixed(1)}K`;
    return `${sym}${v}`;
  };
}

function fmtDate(dateStr, tf) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (tf === '1d' || tf === '2d') return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (tf === '1w' || tf === '2w') return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (tf === '1m') return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function CustomTooltip({ active, payload, label, sym }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '12px 16px', fontSize: 12 }}>
      <div style={{ color: '#71717a', marginBottom: 8 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontFamily: 'JetBrains Mono', monospace, marginBottom: 2 }}>
          {p.name}: {sym}{Number(p.value).toLocaleString('en-IN')}
        </div>
      ))}
    </div>
  );
}

export default function PortfolioChart() {
  const [tf, setTf] = useState('1y');
  const today = new Date().toISOString().slice(0, 10);
  const from = useMemo(() => tfToFrom(tf), [tf]);
  const isIntraday = INTRADAY.has(tf);
  const { currency } = useCurrency();
  const sym = CUR_SYMBOL[currency] || '₹';

  const refetchMs = isIntraday ? (TF_INTERVAL_MS[tf] || 60_000) : false;

  const snapshotsRef = useRef(loadSnapshots());
  const [tickCount, setTickCount] = useState(snapshotsRef.current.length);

  const { data: histData = [], isLoading: histLoading } = useQuery({
    queryKey: ['portfolio-series', from, today],
    queryFn: () => statsApi.portfolioSeries(from, today),
    enabled: !isIntraday,
    staleTime: 5 * 60 * 1000,
  });

  const { data: openTrades = [] } = useQuery({
    queryKey: ['trades', { status: 'open' }],
    queryFn: () => tradesApi.list({ status: 'open' }),
    enabled: isIntraday,
    staleTime: refetchMs || 60_000,
    refetchInterval: refetchMs,
  });

  const liveSymbols = useMemo(
    () => [...new Set(openTrades.filter(t => t.instrument_type !== 'mutual_fund').map(t => t.symbol))],
    [openTrades],
  );

  const { data: livePrices = {}, dataUpdatedAt } = useQuery({
    queryKey: ['live-prices', liveSymbols],
    queryFn: () => pricesApi.get(liveSymbols),
    enabled: isIntraday && liveSymbols.length > 0,
    staleTime: refetchMs || 60_000,
    refetchInterval: refetchMs,
  });

  const { data: allTimeStats } = useQuery({
    queryKey: ['stats', 'all', ''],
    queryFn: () => statsApi.summary('all', ''),
    enabled: isIntraday,
    staleTime: refetchMs || 60_000,
    refetchInterval: refetchMs,
  });

  const appendSnapshot = useCallback(() => {
    const nonMf = openTrades.filter(t => t.instrument_type !== 'mutual_fund');
    if (nonMf.length === 0 && !allTimeStats) return;
    const invested = nonMf.reduce((s, t) => s + t.entry_price * (t.remaining_size ?? t.size), 0);
    const unrealized = nonMf.reduce((s, t) => {
      const cp = livePrices[t.symbol]?.price;
      if (!cp) return s;
      const qty = t.remaining_size ?? t.size;
      return s + (t.direction === 'long' ? (cp - t.entry_price) * qty : (t.entry_price - cp) * qty);
    }, 0);
    const realized = allTimeStats?.total_pnl || 0;
    const timeKey = snapTimeKey(tf);
    const point = { time: timeKey, portfolio: Math.round(invested + unrealized + realized), invested: Math.round(invested), realizedPnl: Math.round(realized) };
    const prev = snapshotsRef.current;
    const next = prev.length > 0 && prev[prev.length - 1].time === timeKey
      ? [...prev.slice(0, -1), point]
      : [...prev, point];
    snapshotsRef.current = next;
    saveSnapshots(next);
    setTickCount(c => c + 1);
  }, [openTrades, livePrices, allTimeStats, tf]);

  useEffect(() => {
    if (!isIntraday) return;
    appendSnapshot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt, allTimeStats?.total_pnl, isIntraday]);

  useEffect(() => {
    if (isIntraday) appendSnapshot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIntraday]);

  const chartData = isIntraday ? snapshotsRef.current : histData;
  const isLoading = isIntraday ? false : histLoading;
  const noData = chartData.length === 0;

  const selectStyle = {
    background: '#111111',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 9999,
    padding: '6px 14px',
    fontSize: 13,
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: '20px 24px', marginBottom: 24, background: '#111111' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>Portfolio Equity Curve</div>
          {isIntraday && (
            <span style={{ fontSize: 11, background: '#22ff88', color: '#000', borderRadius: 9999, padding: '3px 10px', fontWeight: 700 }}>
              LIVE
            </span>
          )}
        </div>
        <select value={tf} onChange={e => setTf(e.target.value)} style={selectStyle}>
          {TIMEFRAMES.map(group => (
            <optgroup key={group.group} label={group.group}>
              {group.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b' }}>Loading…</div>
      ) : noData ? (
        <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: 13, gap: 8 }}>
          {isIntraday ? (
            <>
              <div>Building live chart…</div>
              <div style={{ fontSize: 11 }}>Prices update every minute. Keep this tab open.</div>
            </>
          ) : (
            <div>No trade data for this period</div>
          )}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" opacity={0.4} />
            <XAxis
              dataKey={isIntraday ? 'time' : 'date'}
              tickFormatter={isIntraday ? (t => t) : (d => fmtDate(d, tf))}
              tick={{ fontSize: 11, fill: '#52525b' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtY(sym)}
              tick={{ fontSize: 11, fill: '#52525b' }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip content={<CustomTooltip sym={sym} />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8, color: '#71717a' }} />
            <Area
              type="monotone"
              dataKey="portfolio"
              name="Portfolio Value"
              stroke="#f97316"
              fill="#f97316"
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="invested"
              name="Invested"
              stroke="#60a5fa"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="realizedPnl"
              name="Realized P&L"
              stroke="#4ade80"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}