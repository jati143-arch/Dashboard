import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../api/client.js';
import EventRow from '../components/calendar/EventRow.jsx';
import FredChart from '../components/calendar/FredChart.jsx';

const COUNTRIES = ['All', 'US', 'IN', 'EU', 'GB', 'JP', 'CN'];
const FRED_SERIES = ['FEDFUNDS', 'DGS10', 'CPIAUCSL', 'DEXINUS'];

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

function addDays(d, n) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

const PILL_BTN = (active) => ({
  padding: '6px 14px',
  borderRadius: 9999,
  border: '1px solid rgba(255,255,255,0.06)',
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
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'transparent',
  color: TEXT_SECONDARY,
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'Inter, system-ui, sans-serif',
};

export default function EconomicCalendar() {
  const today = new Date().toISOString().slice(0, 10);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, fontFamily: 'Inter, system-ui, sans-serif' }}>Economic Calendar</h1>

      <div style={{ ...CARD, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} style={NAV_BTN}>◀</button>
          <span style={{ padding: '6px 14px', fontSize: 12, color: TEXT_SECONDARY, fontFamily: "'JetBrains Mono', monospace", background: '#0a0a0a', borderRadius: 12 }}>{from} → {to}</span>
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
        <div style={{ display: 'grid', gridTemplateColumns: '8px 70px 36px 1fr 80px 80px 80px', gap: 12, padding: '0 4px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
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

      <div>
        <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>Macro Charts (FRED)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {FRED_SERIES.map(s => <FredChart key={s} series={s} />)}
        </div>
      </div>
    </div>
  );
}