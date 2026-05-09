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
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🔍 AI Stock Screener</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Search stocks using natural language
        </div>
      </div>

      <form onSubmit={handleSearch} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., tech stocks, bank stocks, mid cap..."
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: 14,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text-primary)',
            }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>
            Search
          </button>
        </div>
      </form>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>Try:</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => { setQuery(s); }}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
          <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 12px' }} />
          Searching...
        </div>
      )}

      {data && !isLoading && (
        <div>
          <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-dim)' }}>
            {data.message}
          </div>

          {data.results && data.results.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Name</th>
                    <th>Sector</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map(s => (
                    <tr key={s.symbol}>
                      <td>
                        <span
                          style={{ fontWeight: 700, color: 'var(--accent)', cursor: 'pointer' }}
                          onClick={() => openChart(s.symbol, null)}
                        >
                          {s.symbol.replace('.NS', '')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{s.name}</td>
                      <td><span className="badge badge-stock">{s.sector}</span></td>
                      <td>
                        <button
                          className="btn-ghost"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => openChart(s.symbol, null)}
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