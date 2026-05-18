import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Static upcoming IPOs (refreshed periodically — no reliable free API exists for India)
// The server route scrapes NSE/BSE or uses a cached list
function timeToDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Closed';
  if (diff === 0) return 'Last Day';
  if (diff === 1) return '1 day left';
  return `${diff} days left`;
}

export default function IpoTracker() {
  const { data: ipos = [], isLoading } = useQuery({
    queryKey: ['ipos'],
    queryFn: () => api.get('/nse/ipos').then(r => r.data),
    staleTime: 6 * 60 * 60 * 1000,
  });

  if (isLoading) return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20 }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Upcoming IPOs</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
        Upcoming IPOs (India)
      </div>

      {ipos.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '16px 0' }}>
          No upcoming IPOs data available.
        </div>
      ) : ipos[0]?.isFallback ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '16px 0' }}>
          NSE IPO data temporarily unavailable. Check <a href="https://www.nseindia.com/market-data/all-upcoming-issues-ipo" target="_blank" rel="noreferrer" style={{ color: 'var(--color-green)' }}>NSE website</a>.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ipos.map((ipo, i) => {
            const daysLeft = timeToDate(ipo.closeDate);
            const urgent = daysLeft === 'Last Day';
            return (
              <div key={i} style={{
                padding: '12px 14px',
                background: 'var(--color-bg-base)',
                border: `1px solid ${urgent ? 'rgba(239,68,68,0.3)' : 'var(--color-border)'}`,
                borderRadius: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}>{ipo.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {ipo.type} · {ipo.exchange}
                    </div>
                  </div>
                  {daysLeft && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      background: urgent ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.1)',
                      color: urgent ? 'var(--color-red)' : 'var(--color-green)',
                      border: `1px solid ${urgent ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.2)'}`,
                      whiteSpace: 'nowrap',
                    }}>{daysLeft}</span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6 }}>
                  {[
                    ['Price Band', ipo.priceBand],
                    ['Open Date', ipo.openDate],
                    ['Close Date', ipo.closeDate],
                    ['Lot Size', ipo.lotSize ? `${ipo.lotSize} shares` : null],
                    ['GMP', ipo.gmp ? `₹${ipo.gmp}` : null],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: 9, color: 'var(--color-text-secondary)', marginBottom: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
