import { useState, useEffect } from 'react';

function getNSEStatus() {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  const day  = ist.getUTCDay();
  const hour = ist.getUTCHours();
  const min  = ist.getUTCMinutes();
  const mins = hour * 60 + min;
  if (day === 0 || day === 6) return { open: false, label: 'NSE CLOSED (Weekend)' };
  if (mins >= 9 * 60 + 15 && mins < 15 * 60 + 30) return { open: true,  label: 'NSE OPEN' };
  if (mins >= 15 * 60 + 30 && mins < 16 * 60)      return { open: false, label: 'NSE POST-MARKET' };
  if (mins >= 9 * 60 && mins < 9 * 60 + 15)        return { open: false, label: 'NSE PRE-OPEN' };
  return { open: false, label: 'NSE CLOSED' };
}

export default function StatusBar() {
  const [time, setTime]     = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }));
  const [status, setStatus] = useState(getNSEStatus);

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
      setStatus(getNSEStatus());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="status-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', borderRight: '1px solid var(--color-border)', flexShrink: 0 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: status.open ? 'var(--color-green)' : 'var(--color-text-dim)',
          display: 'inline-block',
          animation: status.open ? 'pulse-dot 2.5s ease-in-out infinite' : 'none',
        }} />
        <span style={{ color: status.open ? 'var(--color-green)' : 'var(--color-text-secondary)', letterSpacing: '0.06em', fontSize: 10, fontWeight: 600 }}>{status.label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, padding: '0 12px', color: 'var(--color-text-dim)', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{time} IST</span>
      </div>
    </div>
  );
}
