import { useQuery } from '@tanstack/react-query';
import { chartApi } from '../../api/client.js';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export default function SparklineCell({ symbol }) {
  const { data } = useQuery({
    queryKey: ['spark', symbol],
    queryFn: () => chartApi.ohlcv(symbol, '1mo'),
    staleTime: 5 * 60_000,
  });

  if (!data?.candles?.length) return <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>;

  const candles = data.candles.slice(-30);
  const first = candles[0].close;
  const last  = candles[candles.length - 1].close;
  const up    = last >= first;

  return (
    <div style={{ width: 80, height: 32 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={candles} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={`sg-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={up ? '#22c55e' : '#ef4444'} stopOpacity={0.4} />
              <stop offset="95%" stopColor={up ? '#22c55e' : '#ef4444'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="close" stroke={up ? '#22c55e' : '#ef4444'} strokeWidth={1.5}
            fill={`url(#sg-${symbol})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
