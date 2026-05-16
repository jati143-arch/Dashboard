import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { screenerApi } from '../api/client.js';
import { useChart } from '../context/ChartContext.jsx';

export default function Screener() {
  const [query, setQuery] = useState('tech stocks');
  const { openChart } = useChart();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['screener', query],
    queryFn: () => screenerApi.screen(query),
    enabled: false,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) refetch();
  };

  const suggestions = [
    'tech stocks',
    'bank stocks',
    'pharma stocks',
    'FMCG stocks',
    'mid cap',
    'large cap',
    'small cap',
  ];

  return (
    <div style={{ animation: 'fadeSlideUp 0.45s ease both' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}>🔍 AI Stock Screener</div>
        <div style={{ fontSize: 12, color: '#52525b', fontFamily: "'Inter', system-ui, sans-serif" }}>
          Search stocks using natural language
        </div>
      </div>

      <form onSubmit={handleSearch} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., tech stocks, bank stocks, mid cap..."
            style={{
              flex: 1,
              padding: '12px 18px',
              fontSize: 14,
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 24,
              color: '#ffffff',
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '12px 24px',
              background: '#ffffff',
              border: 'none',
              borderRadius: 9999,
              color: '#050505',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Search
          </button>
        </div>
      </form>

      {/* Pill suggestion buttons */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#52525b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>Try:</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => { setQuery(s); }}
              style={{
                padding: '8px 16px',
                fontSize: 12,
                background: '#111111',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 9999,
                color: '#71717a',
                cursor: 'pointer',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 500,
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div style={{
          textAlign: 'center',
          padding: 48,
          color: '#52525b',
          fontSize: 13,
          background: '#111111',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 24,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          <div style={{
            width: 28,
            height: 28,
            margin: '0 auto 14px',
            border: '2px solid rgba(255,255,255,0.06)',
            borderTopColor: '#22ff88',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          Searching...
        </div>
      )}

      {data && !isLoading && (
        <div>
          <div style={{
            marginBottom: 16,
            fontSize: 13,
            color: '#71717a',
            padding: '12px 18px',
            background: '#111111',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 24,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            {data.message}
          </div>

          {data.results && data.results.length > 0 && (
            <div style={{
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 24,
              overflow: 'hidden',
              borderLeft: '3px solid #22ff88',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Symbol</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Name</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Sector</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid rgba(255,255,255,0.06)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map(s => (
                    <tr key={s.symbol}>
                      <td style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 700,
                            color: '#22ff88',
                            cursor: 'pointer',
                          }}
                          onClick={() => openChart(s.symbol, null)}
                        >
                          {s.symbol.replace('.NS', '')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 24px', color: '#71717a', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{s.name}</td>
                      <td style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{
                          fontSize: 10,
                          padding: '4px 10px',
                          background: '#1a1a1a',
                          color: '#71717a',
                          borderRadius: 9999,
                          fontWeight: 600,
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}>{s.sector}</span>
                      </td>
                      <td style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <button
                          onClick={() => openChart(s.symbol, null)}
                          style={{
                            padding: '6px 14px',
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 9999,
                            color: '#71717a',
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: "'Inter', system-ui, sans-serif",
                          }}
                        >
                          Chart
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}