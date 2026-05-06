import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

function buildHistogram(dailyPnl, bins = 20) {
  if (!dailyPnl?.length) return [];
  const values = dailyPnl.map(d => d.pnl);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min) / bins || 1;
  const buckets = Array.from({ length: bins }, (_, i) => ({
    label: (min + i * width).toFixed(0),
    from:  min + i * width,
    to:    min + (i + 1) * width,
    count: 0,
  }));
  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / width), bins - 1);
    buckets[idx].count++;
  }
  return buckets;
}

export default function ReturnDistribution({ dailyPnl = [] }) {
  const hist = buildHistogram(dailyPnl);
  if (!hist.length) return null;

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Daily Return Distribution</div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={hist} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-dim)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 9, fill: 'var(--text-dim)' }} tickLine={false} axisLine={false} width={28} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
            formatter={(v, _, p) => [`${v} day${v !== 1 ? 's' : ''}`, `P&L ≈ ₹${p.payload.label}`]}
          />
          <ReferenceLine x="0" stroke="var(--text-dim)" strokeDasharray="4 4" />
          <Bar dataKey="count" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {hist.map((b, i) => (
              <Cell key={i} fill={Number(b.label) >= 0 ? 'var(--green)' : 'var(--red)'} fillOpacity={0.75} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
