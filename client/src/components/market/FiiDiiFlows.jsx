import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { TrendingUp, TrendingDown } from 'lucide-react';

const api = axios.create({ baseURL: '/api' });

function fmt(v) {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const prefix = v >= 0 ? '+' : '-';
  if (abs >= 100000) return `${prefix}₹${(abs / 100000).toFixed(1)}L cr`;
  if (abs >= 1000) return `${prefix}₹${(abs / 1000).toFixed(1)}K cr`;
  return `${prefix}₹${abs.toFixed(0)} cr`;
}

function FlowBar({ fiiNet, diiNet }) {
  const maxAbs = Math.max(Math.abs(fiiNet), Math.abs(diiNet), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[['FII', fiiNet], ['DII', diiNet]].map(([label, net]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', width: 28 }}>{label}</span>
          <div style={{ flex: 1, height: 8, background: 'var(--color-border)', borderRadius: 9999, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: net >= 0 ? '50%' : `${50 - (Math.abs(net) / maxAbs) * 50}%`,
              width: `${(Math.abs(net) / maxAbs) * 50}%`,
              height: '100%',
              background: net >= 0 ? 'var(--color-green)' : 'var(--color-red)',
              borderRadius: 9999,
            }} />
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--color-border-bright)' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: net >= 0 ? 'var(--color-green)' : 'var(--color-red)', width: 80, textAlign: 'right' }}>
            {fmt(net)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function FiiDiiFlows() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['fii-dii'],
    queryFn: () => api.get('/nse/fii-dii').then(r => r.data),
    staleTime: 4 * 60 * 60 * 1000,
  });

  const recent = data.slice(0, 7);
  const today = recent[0];

  if (isLoading) return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20 }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>FII/DII Flows</div>
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 16 }}>Loading…</div>
    </div>
  );

  if (!today) return null;

  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>FII / DII Daily Flows</span>
        <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{today.date}</span>
      </div>

      {/* Today's summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'FII Net', value: today.fii_net, buy: today.fii_buy, sell: today.fii_sell },
          { label: 'DII Net', value: today.dii_net, buy: today.dii_buy, sell: today.dii_sell },
        ].map(({ label, value, buy, sell }) => (
          <div key={label} style={{ background: 'var(--color-bg-base)', border: `1px solid ${value >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: value >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
              {fmt(value)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              B: {fmt(buy)} · S: {fmt(sell)}
            </div>
          </div>
        ))}
      </div>

      {/* 7-day bars */}
      {recent.length > 1 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last 7 Days</div>
          {recent.map((row, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: 'var(--color-text-secondary)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{row.date}</div>
              <FlowBar fiiNet={row.fii_net} diiNet={row.dii_net} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
