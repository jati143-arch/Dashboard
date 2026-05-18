import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ExternalLink } from 'lucide-react';

const api = axios.create({ baseURL: '/api' });

const CATEGORIES = [
  { id: 'market', label: 'India Market' },
  { id: 'global', label: 'Global' },
  { id: 'symbol', label: 'My Portfolio' },
];

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function sentimentColor(title) {
  const t = title.toLowerCase();
  if (/surges|jumps|gains|up|bullish|rally|record|high|growth|profit|beats|positive|rise/.test(t)) return 'var(--color-green)';
  if (/falls|drops|down|bearish|crash|loss|miss|decline|low|negative|slump|sell/.test(t)) return 'var(--color-red)';
  return 'var(--color-text-secondary)';
}

export default function SmartNewsFeed({ symbols = [] }) {
  const [cat, setCat] = useState('market');

  const { data, isLoading } = useQuery({
    queryKey: ['news-feed', cat, symbols.join(',')],
    queryFn: () => api.get('/news-feed', { params: cat === 'symbol' ? { category: cat, symbol: symbols[0] } : { category: cat } }).then(r => r.data),
    staleTime: 10 * 60_000,
    refetchInterval: 15 * 60_000,
  });

  const articles = data?.articles || [];

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
          Market News
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {CATEGORIES.filter(c => c.id !== 'symbol' || symbols.length > 0).map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} style={{
              padding: '4px 12px', borderRadius: 9999, fontSize: 11, border: 'none', cursor: 'pointer',
              background: cat === c.id ? 'var(--color-accent)' : 'rgba(255,255,255,0.06)',
              color: cat === c.id ? '#000' : 'var(--color-text-secondary)',
              fontWeight: cat === c.id ? 700 : 400,
            }}>{c.label}</button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 90, background: 'var(--color-bg-card)', borderRadius: 12, border: '1px solid var(--color-border)', animation: 'pulse-dot 1.5s ease infinite' }} />
          ))}
        </div>
      )}

      {!isLoading && articles.length === 0 && (
        <div style={{ padding: '16px 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
          No news found. Add a NewsAPI key in Settings for better results.
        </div>
      )}

      {!isLoading && articles.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {articles.slice(0, 9).map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block', textDecoration: 'none',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 12, padding: '12px 14px',
                transition: 'border-color 0.2s, transform 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-bright)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor(a.title), flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{a.source}</span>
                </div>
                <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{timeAgo(a.publishedAt)}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.4, marginBottom: 4 }}>
                {a.title?.replace(/\s*-\s*.*$/, '') || ''}
              </div>
              {a.description && (
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {a.description}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
