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
      <div style={{ textAlign: 'center', color: '#52525b', fontSize: 13, padding: 24, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, background: '#111111' }}>
        Add <code style={{ color: '#00d4ff', fontFamily: 'JetBrains Mono, monospace' }}>FRED_API_KEY</code> to enable macro charts.
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: '18px 20px', background: '#111111' }}>
      <div style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14, fontWeight: 600 }}>{label}</div>
      {isLoading ? (
        <div style={{ color: '#52525b', fontSize: 12, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data?.observations || []} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#52525b' }} tickLine={false} axisLine={false}
              tickFormatter={v => v?.slice(2, 7)} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: '#52525b' }} tickLine={false} axisLine={false} width={36} />
            <Tooltip contentStyle={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, fontSize: 11 }}
              labelStyle={{ color: '#52525b' }} itemStyle={{ color: '#00d4ff' }} />
            <Line type="monotone" dataKey="value" stroke="#00d4ff" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}