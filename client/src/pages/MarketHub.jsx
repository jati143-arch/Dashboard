import { useQuery } from '@tanstack/react-query';
import { marketApi } from '../api/client.js';
import IndexCard from '../components/market/IndexCard.jsx';
import SectorHeatmap from '../components/market/SectorHeatmap.jsx';
import TopMovers from '../components/market/TopMovers.jsx';
import EventStrip from '../components/market/EventStrip.jsx';
import FiiDiiFlows from '../components/market/FiiDiiFlows.jsx';

const CARD = {
  background: '#111111',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 24,
  padding: 28,
};

const TEXT_DIM = '#52525b';
const TEXT_SECONDARY = '#71717a';
const TEXT_PRIMARY = '#ffffff';
const GREEN = '#22ff88';

function Section({ title, children, style }) {
  return (
    <div style={{ ...CARD, padding: 28, ...style }}>
      <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>{title}</div>
      {children}
    </div>
  );
}

function Dot() {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: GREEN, marginLeft: 12, verticalAlign: 'middle', boxShadow: `0 0 8px ${GREEN}`, animation: 'pulse 2s infinite' }} />;
}

export default function MarketHub() {
  const opts = { refetchInterval: 30_000 };

  const { data: overview, isLoading: ovLoading } = useQuery({ queryKey: ['market-overview'], queryFn: marketApi.overview, ...opts });
  const { data: sectors,  isLoading: secLoading } = useQuery({ queryKey: ['market-sectors'],  queryFn: marketApi.sectors,  ...opts });
  const { data: movers,   isLoading: movLoading } = useQuery({ queryKey: ['market-movers'],   queryFn: marketApi.movers,   ...opts });
  const { data: events  }                          = useQuery({ queryKey: ['market-events'],   queryFn: marketApi.events });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeSlideUp 0.45s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, fontFamily: 'Inter, system-ui, sans-serif' }}>Market Hub</h1>
        <Dot />
        <span style={{ fontSize: 11, color: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif' }}>auto-refreshes every 30s</span>
      </div>

      <Section title="Global Indices">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {ovLoading ? (
            <span style={{ color: TEXT_DIM, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}>Loading…</span>
          ) : (
            overview?.indices?.map(idx => (
              <IndexCard key={idx.symbol} {...idx} />
            ))
          )}
        </div>
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <Section title="FX Rates">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {ovLoading ? <span style={{ color: TEXT_DIM, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}>Loading…</span>
              : overview?.fx?.map(fx => <IndexCard key={fx.symbol} {...fx} />)}
          </div>
        </Section>

        <Section title="Crypto">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {ovLoading ? <span style={{ color: TEXT_DIM, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}>Loading…</span>
              : overview?.crypto?.map(c => <IndexCard key={c.symbol} {...c} />)}
          </div>
        </Section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        <Section title="Top Movers — NIFTY 50">
          {movLoading ? <span style={{ color: TEXT_DIM, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}>Loading…</span>
            : <TopMovers gainers={movers?.gainers} losers={movers?.losers} />}
        </Section>

        <Section title="NSE Sector Heatmap">
          {secLoading ? <span style={{ color: TEXT_DIM, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}>Loading…</span>
            : <SectorHeatmap sectors={sectors} />}
        </Section>
      </div>

      <Section title="Upcoming Economic Events (14 days)">
        <EventStrip events={events?.events} missing={events?.missing} />
      </Section>

      <Section title="FII / DII Daily Flows (India)">
        <FiiDiiFlows />
      </Section>
    </div>
  );
}