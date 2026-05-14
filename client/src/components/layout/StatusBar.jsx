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
  const [date, setDate]     = useState(() => new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
      setStatus(getNSEStatus());
      setDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      height: 40,
      background: 'rgba(5,5,5,0.8)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
      gap: 20,
      fontSize: 11,
      fontFamily: 'var(--font-mono)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: status.open ? 'var(--color-green)' : 'var(--color-text-dim)', display: 'inline-block', animation: status.open ? 'pulse-dot 2.5s ease-in-out infinite' : 'none' }} />
        <span style={{ color: status.open ? 'var(--color-green)' : 'var(--color-text-secondary)' }}>{status.label}</span>
      </div>
      <span style={{ color: 'rgba(255,255,255,0.08)' }}>|</span>
      <span style={{ color: 'var(--color-text-secondary)' }}>{date}</span>
      <span style={{ color: 'rgba(255,255,255,0.08)' }}>|</span>
      <span style={{ letterSpacing: '0.04em' }}>{time}</span>
      <span style={{ color: 'rgba(255,255,255,0.08)' }}>|</span>
      <span style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.02em' }}>NEXUS TRADING DASHBOARD</span>
    </div>
  );
}