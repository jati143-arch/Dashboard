import { useQuery } from '@tanstack/react-query';
import { pythonDataApi } from '../../api/client.js';

function GaugeCard({ label, value, unit = '', changePercent, color, description }) {
  const pos = changePercent >= 0;
  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      transition: 'border-color 0.2s',
    }}>
      <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: color || 'var(--color-text-primary)' }}>
          {value != null ? value.toLocaleString() : '—'}
        </span>
        {unit && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{unit}</span>}
      </div>
      {changePercent != null && (
        <span style={{ fontSize: 11, color: pos ? 'var(--color-green)' : 'var(--color-red)', fontFamily: 'var(--font-mono)' }}>
          {pos ? '+' : ''}{changePercent.toFixed(2)}%
        </span>
      )}
      {description && (
        <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>{description}</span>
      )}
    </div>
  );
}

function VixGauge({ value, label }) {
  if (value == null) return <GaugeCard label={label} value={null} />;

  let zone, color;
  if (value < 15)       { zone = 'LOW FEAR';  color = '#22c55e'; }
  else if (value < 20)  { zone = 'CALM';       color = '#86efac'; }
  else if (value < 25)  { zone = 'ELEVATED';   color = '#fbbf24'; }
  else if (value < 30)  { zone = 'HIGH FEAR';  color = '#f97316'; }
  else                  { zone = 'EXTREME';    color = '#ef4444'; }

  return <GaugeCard label={label} value={value.toFixed(1)} color={color} description={zone} />;
}

function IndexCard({ label, value, changePercent }) {
  const pos = changePercent >= 0;
  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: `1px solid ${pos ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
      borderRadius: 16,
      padding: '16px 18px',
    }}>
      <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
        {value != null ? value.toLocaleString() : '—'}
      </div>
      {changePercent != null && (
        <div style={{
          marginTop: 4, fontSize: 12, fontFamily: 'var(--font-mono)',
          color: pos ? 'var(--color-green)' : 'var(--color-red)',
        }}>
          {pos ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
        </div>
      )}
    </div>
  );
}

export default function MarketPulse() {
  const { data, isLoading } = useQuery({
    queryKey: ['yf-sentiment'],
    queryFn: pythonDataApi.yfSentiment,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  const d = data?.success ? data.data : {};

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--color-green)',
          boxShadow: '0 0 8px var(--color-green)',
          animation: 'pulse-dot 2.5s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
          Market Pulse
        </span>
        {isLoading && <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>loading…</span>}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 10,
      }}>
        {/* Indices */}
        <IndexCard
          label="NIFTY 50"
          value={d.nifty?.price}
          changePercent={d.nifty?.changePercent}
        />
        <IndexCard
          label="BANK NIFTY"
          value={d.banknifty?.price}
          changePercent={d.banknifty?.changePercent}
        />
        <IndexCard
          label="S&P 500"
          value={d.snp500?.price}
          changePercent={d.snp500?.changePercent}
        />

        {/* VIX gauges */}
        <VixGauge label="India VIX" value={d.india_vix?.price} />
        <VixGauge label="US VIX" value={d.us_vix?.price} />

        {/* Commodities */}
        <GaugeCard
          label="DXY (Dollar)"
          value={d.dxy?.price?.toFixed(2)}
          changePercent={d.dxy?.changePercent}
          color={d.dxy?.changePercent >= 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'}
        />
        <GaugeCard
          label="Brent Crude"
          value={d.crude?.price?.toFixed(1)}
          unit="$/bbl"
          changePercent={d.crude?.changePercent}
          color={d.crude?.changePercent >= 0 ? 'var(--color-green)' : 'var(--color-red)'}
        />
        <GaugeCard
          label="Gold"
          value={d.gold?.price?.toFixed(0)}
          unit="$/oz"
          changePercent={d.gold?.changePercent}
          color="#fbbf24"
        />
      </div>
    </div>
  );
}
