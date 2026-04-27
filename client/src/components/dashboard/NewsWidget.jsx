import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { newsApi } from '../../api/client.js';

export default function NewsWidget({ symbols }) {
  const [open, setOpen] = useState(false);
  const enabled = symbols && symbols.length > 0;

  const { data: news = [], isLoading } = useQuery({
    queryKey: ['news', (symbols || []).join(',')],
    queryFn: () => newsApi.get(symbols),
    enabled,
    refetchInterval: 5 * 60_000,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: open ? 12 : 0 }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ◎ Portfolio News
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        isLoading ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading news…</div>
        ) : !enabled ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No open positions to show news for.</div>
        ) : news.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No recent news found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {news.map((item, i) => (
              <div key={i} style={{ borderBottom: i < news.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: 10 }}>
                <div style={{ marginBottom: 3 }}>
                  <span className="badge badge-stock" style={{ fontSize: 9, marginRight: 6 }}>{item.symbol}</span>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--text-primary)', fontSize: 13, textDecoration: 'none', lineHeight: 1.4 }}
                  >
                    {item.title}
                  </a>
                </div>
                {item.pubDate && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {new Date(item.pubDate).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
