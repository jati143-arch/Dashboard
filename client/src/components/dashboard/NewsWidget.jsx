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
    <div style={{
      marginTop: 16,
      background: 'rgba(20,20,25,0.6)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 24,
      padding: 28,
    }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: open ? 16 : 0,
        }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#52525b',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          ◎ Portfolio News
        </span>
        <span style={{
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 9999,
          padding: '2px 8px',
          fontSize: 11,
          color: '#71717a',
        }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {open && (
        isLoading ? (
          <div style={{ color: '#52525b', fontSize: 13 }}>Loading news…</div>
        ) : !enabled ? (
          <div style={{ color: '#52525b', fontSize: 13 }}>No open positions to show news for.</div>
        ) : news.length === 0 ? (
          <div style={{ color: '#52525b', fontSize: 13 }}>No recent news found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {news.map((item, i) => (
              <div
                key={i}
                style={{
                  borderBottom: i < news.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  paddingBottom: 12,
                }}
              >
                <div style={{ marginBottom: 4 }}>
                  <span style={{
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    background: 'rgba(0,212,255,0.1)',
                    color: '#00d4ff',
                    borderRadius: 9999,
                    padding: '2px 8px',
                    marginRight: 8,
                  }}>
                    {item.symbol}
                  </span>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#ffffff',
                      fontSize: 13,
                      textDecoration: 'none',
                      lineHeight: 1.4,
                    }}
                  >
                    {item.title}
                  </a>
                </div>
                {item.pubDate && (
                  <div style={{ fontSize: 11, color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>
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