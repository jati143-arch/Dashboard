import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../../api/client.js';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const SERIES_LABELS = {
  FEDFUNDS: 'Fed Funds Rate (%)',
  CPIAUCSL: 'US CPI YoY (%)',
  DGS10:    'US 10Y Yield (%)',
  DEXINUS:  'USD/INR',
};

export default function FredChart({ series }) {
  const { data, isLoading } = useQuery({
    queryKey: ['fred', series],
    queryFn: () => calendarApi.fred(series),
    staleTime: 24 * 60 * 60_000,
  });

  const label = SERIES_LABELS[series] || series;

  if (data?.missing) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, padding: 20 }}>
        Add <code style={{ color: 'var(--accent)' }}>FRED_API_KEY</code> to enable macro charts.
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{label}</div>
      {isLoading ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 12, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data?.observations || []} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-dim)' }} tickLine={false} axisLine={false}
              tickFormatter={v => v?.slice(2, 7)} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: 'var(--text-dim)' }} tickLine={false} axisLine={false} width={36} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
              labelStyle={{ color: 'var(--text-dim)' }} itemStyle={{ color: 'var(--accent)' }} />
            <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
