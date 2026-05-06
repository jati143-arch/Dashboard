import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../api/client.js';
import EventRow from '../components/calendar/EventRow.jsx';
import FredChart from '../components/calendar/FredChart.jsx';

const COUNTRIES = ['All', 'US', 'IN', 'EU', 'GB', 'JP', 'CN'];
const FRED_SERIES = ['FEDFUNDS', 'DGS10', 'CPIAUCSL', 'DEXINUS'];

function addDays(d, n) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

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

  // Group by date
  const grouped = {};
  for (const e of events) {
    const d = (e.time || e.date || '').slice(0, 10);
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(e);
  }
  const days = Object.keys(grouped).sort();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Economic Calendar</h1>

      {/* Filters */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setWeekStart(addDays(weekStart, -7))}
            style={{ padding: '5px 10px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-primary)' }}>◀</button>
          <span style={{ padding: '5px 12px', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--text-mono)' }}>{from} → {to}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))}
            style={{ padding: '5px 10px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-primary)' }}>▶</button>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {COUNTRIES.map(c => (
            <button key={c} onClick={() => setCountry(c)}
              style={{ padding: '5px 10px', background: c === country ? 'var(--accent)' : 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: c === country ? '#fff' : 'var(--text-secondary)', fontSize: 12 }}>
              {c}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {['All', 'High', 'Medium'].map(imp => (
            <button key={imp} onClick={() => setImpact(imp)}
              style={{ padding: '5px 10px', background: imp === impact ? 'var(--accent)' : 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: imp === impact ? '#fff' : 'var(--text-secondary)', fontSize: 12 }}>
              {imp === 'High' ? '🔴' : imp === 'Medium' ? '🟡' : ''} {imp}
            </button>
          ))}
        </div>
      </div>

      {/* Events */}
      <div className="card" style={{ padding: '16px 20px' }}>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '8px 70px 36px 1fr 80px 80px 80px', gap: 12, padding: '0 4px 8px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
          {['', 'Date', '', 'Event', 'Prev', 'Est', 'Actual'].map(h => (
            <span key={h} style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, textAlign: h === 'Prev' || h === 'Est' || h === 'Actual' ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>

        {isLoading && <div style={{ color: 'var(--text-dim)', padding: '30px 0', textAlign: 'center', fontSize: 13 }}>Loading…</div>}
        {data?.missing && (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px 0', fontSize: 13 }}>
            Add <code style={{ color: 'var(--accent)' }}>FINNHUB_API_KEY</code> to enable economic events.
          </div>
        )}
        {!isLoading && !data?.missing && days.length === 0 && (
          <div style={{ color: 'var(--text-dim)', padding: '30px 0', textAlign: 'center', fontSize: 13 }}>No events for this week.</div>
        )}

        {days.map(d => (
          <div key={d} style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', padding: '10px 4px 4px', letterSpacing: '0.06em' }}>
              {new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            {grouped[d].map((e, i) => <EventRow key={i} event={e} />)}
          </div>
        ))}
      </div>

      {/* FRED Macro Charts */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 600 }}>Macro Charts (FRED)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
          {FRED_SERIES.map(s => <FredChart key={s} series={s} />)}
        </div>
      </div>
    </div>
  );
}
