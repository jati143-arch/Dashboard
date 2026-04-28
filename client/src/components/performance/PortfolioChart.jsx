import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { statsApi, tradesApi, pricesApi } from '../../api/client.js';

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

function tfToFrom(tf) {
  const today = new Date().toISOString().slice(0, 10);
  if (INTRADAY.has(tf)) return today;
  const d = new Date();
  const map = { '1d': 1, '2d': 2, '1w': 7, '2w': 14, '1m': 30, '6m': 180, '1y': 365 };
  if (map[tf]) { d.setDate(d.getDate() - map[tf]); return d.toISOString().slice(0, 10); }
  return '2000-01-01';
}

function fmtY(v) {
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000)   return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
}

function fmtDate(dateStr, tf) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (tf === '1d' || tf === '2d') return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (tf === '1w' || tf === '2w') return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (tf === '1m') return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontFamily: 'var(--text-mono)', marginBottom: 2 }}>
          {p.name}: ₹{Number(p.value).toLocaleString('en-IN')}
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

  // Accumulate live snapshots for intraday mode
  const snapshotsRef = useRef([]);
  const [tickCount, setTickCount] = useState(0);

  // Historical data query (non-intraday)
  const { data: histData = [], isLoading: histLoading } = useQuery({
    queryKey: ['portfolio-series', from, today],
    queryFn: () => statsApi.portfolioSeries(from, today),
    enabled: !isIntraday,
    staleTime: 5 * 60 * 1000,
  });

  // Live queries for intraday mode
  const { data: openTrades = [] } = useQuery({
    queryKey: ['trades', { status: 'open' }],
    queryFn: () => tradesApi.list({ status: 'open' }),
    enabled: isIntraday,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const liveSymbols = useMemo(
    () => [...new Set(openTrades.filter(t => t.instrument_type !== 'mutual_fund').map(t => t.symbol))],
    [openTrades],
  );

  const { data: livePrices = {}, dataUpdatedAt } = useQuery({
    queryKey: ['live-prices', liveSymbols],
    queryFn: () => pricesApi.get(liveSymbols),
    enabled: isIntraday && liveSymbols.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: allTimeStats } = useQuery({
    queryKey: ['stats', 'all', ''],
    queryFn: () => statsApi.summary('all', ''),
    enabled: isIntraday,
    staleTime: 60_000,
  });

  // Append a snapshot each time live prices refresh
  useEffect(() => {
    if (!isIntraday) return;
    const nonMf = openTrades.filter(t => t.instrument_type !== 'mutual_fund');
    const invested = nonMf.reduce((s, t) => s + t.entry_price * (t.remaining_size ?? t.size), 0);
    const unrealized = nonMf.reduce((s, t) => {
      const cp = livePrices[t.symbol]?.price;
      if (!cp) return s;
      const qty = t.remaining_size ?? t.size;
      return s + (t.direction === 'long' ? (cp - t.entry_price) * qty : (t.entry_price - cp) * qty);
    }, 0);
    const realized = allTimeStats?.total_pnl || 0;
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    snapshotsRef.current = [
      ...snapshotsRef.current,
      {
        time,
        portfolio: Math.round(invested + unrealized + realized),
        invested:   Math.round(invested),
        realizedPnl: Math.round(realized),
      },
    ];
    setTickCount(c => c + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt, allTimeStats?.total_pnl, isIntraday]);

  // Clear snapshots when switching away from intraday
  useEffect(() => {
    if (!isIntraday) { snapshotsRef.current = []; setTickCount(0); }
  }, [isIntraday]);

  const chartData = isIntraday ? snapshotsRef.current : histData;
  const isLoading = isIntraday ? false : histLoading;
  const noData = chartData.length === 0;

  const selectStyle = {
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 13,
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Portfolio Equity Curve</div>
          {isIntraday && (
            <span style={{ fontSize: 11, background: 'var(--green)', color: '#000', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>
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
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>Loading…</div>
      ) : noData ? (
        <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13, gap: 8 }}>
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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
            <XAxis
              dataKey={isIntraday ? 'time' : 'date'}
              tickFormatter={isIntraday ? (t => t) : (d => fmtDate(d, tf))}
              tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtY}
              tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
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
