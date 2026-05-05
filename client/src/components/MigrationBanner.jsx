import { useState, useEffect } from 'react';

export default function MigrationBanner() {
  const [status, setStatus]   = useState(null); // null=loading, {hasSQLiteData,tradeCount}
  const [migrating, setMig]   = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState(null);
  const [dismissed, setDism]  = useState(() => localStorage.getItem('migrationDismissed') === '1');

  useEffect(() => {
    if (dismissed) return;
    fetch('/api/migrate/status', { credentials: 'include' })
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ hasSQLiteData: false }));
  }, [dismissed]);

  if (dismissed || !status || !status.hasSQLiteData) return null;
  if (done) return null;

  const dismiss = () => { localStorage.setItem('migrationDismissed', '1'); setDism(true); };

  const migrate = async () => {
    setMig(true);
    setError(null);
    try {
      const r = await fetch('/api/migrate/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await r.json();
      if (data.ok) {
        setDone(true);
        localStorage.setItem('migrationDismissed', '1');
      } else if (data.skipped) {
        setError('Google Drive already has data. Your old data is safe — no action needed.');
        setTimeout(dismiss, 4000);
      } else {
        setError(data.error || 'Migration failed');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setMig(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#1a1a2e', border: '1px solid var(--amber, #f59e0b)',
      borderRadius: 12, padding: '16px 20px', zIndex: 9999,
      maxWidth: 480, width: 'calc(100% - 48px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#f59e0b', marginBottom: 6 }}>
        📦 You have existing trade data
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary, #aaa)', marginBottom: 12, lineHeight: 1.5 }}>
        Found <strong style={{ color: '#fff' }}>{status.tradeCount} trades</strong> in your local database.
        Move them to Google Drive so they follow you everywhere.
      </div>
      {error && (
        <div style={{ fontSize: 12, color: '#ff4466', marginBottom: 10 }}>{error}</div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={migrate}
          disabled={migrating}
          style={{
            flex: 1, padding: '9px 16px', borderRadius: 8, border: 'none',
            background: '#f59e0b', color: '#000', fontWeight: 700, fontSize: 13,
            cursor: migrating ? 'not-allowed' : 'pointer', opacity: migrating ? 0.7 : 1,
          }}
        >
          {migrating ? 'Migrating…' : 'Move to Google Drive'}
        </button>
        <button
          onClick={dismiss}
          style={{
            padding: '9px 14px', borderRadius: 8, border: '1px solid #333',
            background: 'transparent', color: 'var(--text-secondary, #aaa)',
            fontSize: 13, cursor: 'pointer',
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
