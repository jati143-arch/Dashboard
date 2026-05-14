import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { screenerApi } from '../../api/client.js';

export default function AISignalPanel({ symbol }) {
  const [expanded, setExpanded] = useState(false);
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['screener-ai-analyze', symbol],
    queryFn: () => screenerApi.aiAnalyze(symbol),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  const extractSignal = (text) => {
    if (!text) return null;
    if (text.toLowerCase().includes('buy')) return 'BUY';
    if (text.toLowerCase().includes('sell')) return 'SELL';
    return 'HOLD';
  };

  const signal = data?.aiAnalysis ? extractSignal(data.aiAnalysis) : null;
  const sigColor = signal === 'BUY' ? 'var(--color-green)' : signal === 'SELL' ? 'var(--color-red)' : 'var(--color-text-dim)';

  return (
    <div style={{ padding: 12, background: 'var(--color-bg-card)', borderRadius: 8, margin: '8px 12px', border: '1px solid var(--color-border)' }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: expanded ? 8 : 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>{expanded ? '▼' : '▶'}</span>
          <span style={{ fontSize: 14 }}>🤖</span>
          <span style={{ fontWeight: 700, fontSize: 12 }}>AI Power Signal</span>
          {signal && (
            <span style={{ 
              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
              background: signal === 'BUY' ? 'rgba(0,220,100,0.2)' : signal === 'SELL' ? 'rgba(255,80,60,0.2)' : 'rgba(120,120,120,0.2)',
              color: sigColor
            }}>
              {signal}
            </span>
          )}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); refetch(); }}
          style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 11 }}
        >
          ↻
        </button>
      </div>

      {expanded && (
        <>
          {isLoading ? (
            <div style={{ color: 'var(--color-text-dim)', fontSize: 11, textAlign: 'center', padding: 8 }}>
              <div className="spinner" style={{ width: 14, height: 14, margin: '0 auto 6px' }} />
              AI analyzing {symbol}...
            </div>
          ) : data?.aiAnalysis ? (
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {data.aiAnalysis.slice(0, 500)}
              </div>
              
              {data?.vob?.zones?.length > 0 && (
                <div style={{ marginTop: 10, padding: 8, background: 'rgba(0,180,216,0.1)', borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: 'var(--color-accent)', marginBottom: 4 }}>📊 VOB Zones Found: {data.vob.zones.length}</div>
                  {data.vob.zones.map((z, i) => (
                    <div key={i} style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
                      Bull OB: ₹{z.bottom?.toFixed(2)} - ₹{z.top?.toFixed(2)}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginTop: 8, textAlign: 'center' }}>
                Powered by Groq AI • VOB Strategy
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-dim)', fontSize: 11, textAlign: 'center' }}>
              Click ↻ to get AI analysis
            </div>
          )}
        </>
      )}
    </div>
  );
}