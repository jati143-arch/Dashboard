import { useQuery } from '@tanstack/react-query';
import { marketApi } from '../api/client.js';
import IndexCard from '../components/market/IndexCard.jsx';
import SectorHeatmap from '../components/market/SectorHeatmap.jsx';
import TopMovers from '../components/market/TopMovers.jsx';
import EventStrip from '../components/market/EventStrip.jsx';

function Section({ title, children, style }) {
  return (
    <div className="card" style={{ padding: '16px 20px', ...style }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, fontWeight: 600 }}>{title}</div>
      {children}
    </div>
  );
}

function Dot() {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', marginLeft: 8, verticalAlign: 'middle', animation: 'pulse 2s infinite' }} />;
}

export default function MarketHub() {
  const opts = { refetchInterval: 30_000 };

  const { data: overview, isLoading: ovLoading } = useQuery({ queryKey: ['market-overview'], queryFn: marketApi.overview, ...opts });
  const { data: sectors,  isLoading: secLoading } = useQuery({ queryKey: ['market-sectors'],  queryFn: marketApi.sectors,  ...opts });
  const { data: movers,   isLoading: movLoading } = useQuery({ queryKey: ['market-movers'],   queryFn: marketApi.movers,   ...opts });
  const { data: events  }                          = useQuery({ queryKey: ['market-events'],   queryFn: marketApi.events });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Market Hub</h1>
        <Dot />
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>auto-refreshes every 30s</span>
      </div>

      {/* Indices row */}
      <Section title="Global Indices">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {ovLoading ? (
            <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading…</span>
          ) : (
            overview?.indices?.map(idx => (
              <IndexCard key={idx.symbol} {...idx} />
            ))
          )}
        </div>
      </Section>

      {/* FX + Crypto */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <Section title="FX Rates">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {ovLoading ? <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading…</span>
              : overview?.fx?.map(fx => <IndexCard key={fx.symbol} {...fx} />)}
          </div>
        </Section>

        <Section title="Crypto">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {ovLoading ? <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading…</span>
              : overview?.crypto?.map(c => <IndexCard key={c.symbol} {...c} />)}
          </div>
        </Section>
      </div>

      {/* Movers + Sector Heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Section title="Top Movers — NIFTY 50">
          {movLoading ? <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading…</span>
            : <TopMovers gainers={movers?.gainers} losers={movers?.losers} />}
        </Section>

        <Section title="NSE Sector Heatmap">
          {secLoading ? <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading…</span>
            : <SectorHeatmap sectors={sectors} />}
        </Section>
      </div>

      {/* Economic Events */}
      <Section title="Upcoming Economic Events (14 days)">
        <EventStrip events={events?.events} missing={events?.missing} />
      </Section>
    </div>
  );
}
