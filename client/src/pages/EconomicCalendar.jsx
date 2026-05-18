import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarApi, tradesApi, watchlistApi } from '../api/client.js';
import EventRow from '../components/calendar/EventRow.jsx';
import FredChart from '../components/calendar/FredChart.jsx';

const COUNTRIES = ['All', 'US', 'IN', 'EU', 'GB', 'JP', 'CN'];
const FRED_SERIES = ['FEDFUNDS', 'DGS10', 'CPIAUCSL', 'DEXINUS'];
const CAL_TABS = ['events', 'earnings', 'macro'];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (diff < 0) return 'Past';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff}d away`;
}

function EarningsPanel() {
  const { data: trades = [] } = useQuery({ queryKey: ['trades'], queryFn: () => tradesApi.list({ status: 'open' }), staleTime: 5 * 60 * 1000 });
  const { data: watchlists = [] } = useQuery({ queryKey: ['watchlists'], queryFn: watchlistApi.list, staleTime: 5 * 60 * 1000 });

  const symbols = [
    ...new Set([
      ...trades.filter(t => t.status === 'open' && t.symbol).map(t => t.symbol),
      ...watchlists.flatMap(w => (w.symbols || []).map(s => typeof s === 'string' ? s : s.symbol)).filter(Boolean),
    ])
  ].slice(0, 20);

  const { data: earnings = [], isLoading, isError } = useQuery({
    queryKey: ['yf-earnings', symbols.join(',')],
    queryFn: () => calendarApi.yfEarnings(symbols),
    staleTime: 12 * 60 * 60 * 1000,
    enabled: symbols.length > 0,
    retry: false,
    timeout: 30000,
  });

  if (symbols.length === 0) return (
    <div style={{ textAlign: 'center', color: TEXT_DIM, padding: '40px 0', fontSize: 13 }}>
      Add positions or watchlist items to see upcoming earnings.
    </div>
  );

  if (isLoading) return <div style={{ color: TEXT_DIM, padding: '40px 0', textAlign: 'center' }}>Loading earnings…</div>;
  if (isError) return (
    <div style={{ textAlign: 'center', color: TEXT_DIM, padding: '40px 0', fontSize: 13 }}>
      Could not load earnings data. Make sure yfinance is installed on the server.
    </div>
  );

  const sorted = [...earnings].sort((a, b) => new Date(a.earningsDate) - new Date(b.earningsDate));

  return (
    <div>
      <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 16 }}>
        Upcoming earnings for your open positions + watchlist ({symbols.length} symbols checked).
      </div>
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', color: TEXT_DIM, padding: '32px 0', fontSize: 13 }}>
          No upcoming earnings data found. Ensure yfinance is installed.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {sorted.map(e => {
            const due = daysUntil(e.earningsDate);
            const urgent = due === 'Today' || due === 'Tomorrow';
            return (
              <div key={e.symbol} style={{
                background: 'var(--color-bg-card)', border: `1px solid ${urgent ? 'rgba(239,68,68,0.3)' : 'var(--color-border)'}`,
                borderRadius: 12, padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: TEXT_PRIMARY }}>{e.symbol}</div>
                  <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 }}>
                    {e.earningsDate}
                    {e.epsEstimate != null ? ` · EPS est: $${e.epsEstimate}` : ''}
                  </div>
                </div>
                {due && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                    background: urgent ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.08)',
                    color: urgent ? '#ef4444' : GREEN,
                    border: `1px solid ${urgent ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.2)'}`,
                    whiteSpace: 'nowrap',
                  }}>{due}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CARD = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 24,
  padding: 28,
};

const TEXT_DIM = 'var(--color-text-dim)';
const TEXT_SECONDARY = 'var(--color-text-secondary)';
const TEXT_PRIMARY = 'var(--color-text-primary)';
const GREEN = 'var(--color-green)';

function addDays(d, n) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

const PILL_BTN = (active) => ({
  padding: '6px 14px',
  borderRadius: 9999,
  border: '1px solid var(--color-border)',
  background: active ? GREEN : 'transparent',
  color: active ? '#000000' : TEXT_SECONDARY,
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontWeight: 500,
});

const NAV_BTN = {
  padding: '6px 14px',
  borderRadius: 9999,
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: TEXT_SECONDARY,
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'Inter, system-ui, sans-serif',
};

export default function EconomicCalendar() {
  const today = new Date().toISOString().slice(0, 10);
  const [calTab, setCalTab]       = useState('events');
  const [weekStart, setWeekStart] = useState(today);
  const [country, setCountry]     = useState('All');
  const [impact, setImpact]       = useState('All');

  const from = weekStart;
  const to   = addDays(weekStart, 6);

  const { data, isLoading } = useQuery({
    queryKey: ['cal-events', from, to, country],
    queryFn: () => calendarApi.events({ from, to, country: country === 'All' ? undefined : country }),
  });

  let events = data?.events || [];
  if (impact !== 'All') {
    events = events.filter(e => {
      const s = String(e.impact || '').toLowerCase();
      if (impact === 'High')   return s.includes('high')   || s === '3';
      if (impact === 'Medium') return s.includes('med')    || s === '2';
      return true;
    });
  }

  const grouped = {};
  for (const e of events) {
    const d = (e.time || e.date || '').slice(0, 10);
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(e);
  }
  const days = Object.keys(grouped).sort();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeSlideUp 0.45s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, fontFamily: 'Inter, system-ui, sans-serif' }}>Calendar</h1>
        <div style={{ display: 'flex', gap: 6, background: 'var(--color-bg-base)', borderRadius: 9999, border: '1px solid var(--color-border)', padding: 4 }}>
          {CAL_TABS.map(t => (
            <button key={t} onClick={() => setCalTab(t)} style={{ padding: '6px 16px', borderRadius: 9999, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: calTab === t ? '#ffffff' : 'transparent', color: calTab === t ? '#050505' : TEXT_SECONDARY, fontFamily: 'Inter, system-ui, sans-serif', textTransform: 'capitalize' }}>
              {t === 'events' ? 'Economic Events' : t === 'earnings' ? 'Earnings' : 'FRED Macro'}
            </button>
          ))}
        </div>
      </div>

      {calTab === 'earnings' && (
        <div style={CARD}>
          <EarningsPanel />
        </div>
      )}

      {calTab === 'macro' && (
        <div>
          <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>Macro Charts (FRED)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {FRED_SERIES.map(s => <FredChart key={s} series={s} />)}
          </div>
        </div>
      )}

      {calTab !== 'events' ? null : (<>
      <div style={{ ...CARD, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} style={NAV_BTN}>◀</button>
          <span style={{ padding: '6px 14px', fontSize: 12, color: TEXT_SECONDARY, fontFamily: "'JetBrains Mono', monospace", background: 'var(--color-bg-base)', borderRadius: 12 }}>{from} → {to}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} style={NAV_BTN}>▶</button>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {COUNTRIES.map(c => (
            <button key={c} onClick={() => setCountry(c)} style={PILL_BTN(country === c)}>
              {c}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'High', 'Medium'].map(imp => (
            <button key={imp} onClick={() => setImpact(imp)} style={PILL_BTN(impact === imp)}>
              {imp === 'High' ? '🔴' : imp === 'Medium' ? '🟡' : ''} {imp}
            </button>
          ))}
        </div>
      </div>

      <div style={CARD}>
        <div style={{ display: 'grid', gridTemplateColumns: '8px 70px 36px 1fr 80px 80px 80px', gap: 12, padding: '0 4px 12px', borderBottom: '1px solid var(--color-border)', marginBottom: 8 }}>
          {['', 'Date', '', 'Event', 'Prev', 'Est', 'Actual'].map(h => (
            <span key={h} style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, textAlign: h === 'Prev' || h === 'Est' || h === 'Actual' ? 'right' : 'left', fontFamily: 'Inter, system-ui, sans-serif' }}>{h}</span>
          ))}
        </div>

        {isLoading && <div style={{ color: TEXT_DIM, padding: '40px 0', textAlign: 'center', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}>Loading…</div>}
        {data?.missing && (
          <div style={{ textAlign: 'center', color: TEXT_DIM, padding: '40px 0', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Add <code style={{ color: GREEN, fontFamily: "'JetBrains Mono', monospace" }}>FINNHUB_API_KEY</code> to enable economic events.
          </div>
        )}
        {!isLoading && !data?.missing && days.length === 0 && (
          <div style={{ color: TEXT_DIM, padding: '40px 0', textAlign: 'center', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}>No events for this week.</div>
        )}

        {days.map(d => (
          <div key={d} style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: 'uppercase', padding: '12px 4px 6px', letterSpacing: '0.08em', fontFamily: 'Inter, system-ui, sans-serif' }}>
              {new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            {grouped[d].map((e, i) => <EventRow key={i} event={e} />)}
          </div>
        ))}
      </div>

      </>)}
    </div>
  );
}