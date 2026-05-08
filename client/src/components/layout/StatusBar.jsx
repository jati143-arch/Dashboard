import { useState, useEffect } from 'react';

function getNSEStatus() {
  const now = new Date();
  // IST = UTC + 5:30
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  const day  = ist.getUTCDay(); // 0=Sun, 6=Sat
  const hour = ist.getUTCHours();
  const min  = ist.getUTCMinutes();
  const mins = hour * 60 + min;

  if (day === 0 || day === 6) return { open: false, label: 'NSE CLOSED (Weekend)' };
  if (mins >= 9 * 60 + 15 && mins < 15 * 60 + 30) return { open: true,  label: 'NSE OPEN' };
  if (mins >= 15 * 60 + 30 && mins < 16 * 60)      return { open: false, label: 'NSE POST-MARKET' };
  if (mins >= 9 * 60 && mins < 9 * 60 + 15)        return { open: false, label: 'NSE PRE-OPEN' };
  return { open: false, label: 'NSE CLOSED' };
}

function getISTTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getISTDate() {
  return new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function StatusBar() {
  const [time, setTime]     = useState(getISTTime);
  const [status, setStatus] = useState(getNSEStatus);

  useEffect(() => {
    const id = setInterval(() => {
      setTime(getISTTime());
      setStatus(getNSEStatus());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="status-bar">
      <span>
        <span className={`status-bar-dot${status.open ? '' : ' closed'}`} />
        {status.label}
      </span>
      <span className="status-bar-sep">|</span>
      <span style={{ color: 'var(--text-dim)' }}>{getISTDate()}</span>
      <span className="status-bar-sep">|</span>
      <span style={{ letterSpacing: '0.04em' }}>{time} IST</span>
      <span className="status-bar-sep">|</span>
      <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.02em' }}>
        ⚡ Trading Dashboard
      </span>
    </div>
  );
}
