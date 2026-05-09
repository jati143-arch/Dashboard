import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { screenerApi } from '../../api/client.js';

export default function AISignalPanel({ symbol }) {
  const [expanded, setExpanded] = useState(false);
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['screener-ai-analyze', symbol],
    queryFn: () => screenerApi.aiAnalyze(symbol),
    staleTime: 15 * 60 * 1000, // 15 min
    retry: 1,
  });

  const extractSignal = (text) => {
    if (!text) return null;
    if (text.toLowerCase().includes('buy')) return 'BUY';
    if (text.toLowerCase().includes('sell')) return 'SELL';
    return 'HOLD';
  };

  const signal = data?.aiAnalysis ? extractSignal(data.aiAnalysis) : null;
  const sigColor = signal === 'BUY' ? 'var(--green)' : signal === 'SELL' ? 'var(--red)' : 'var(--text-dim)';

  return (
    <div style={{ padding: 12, background: 'var(--bg-card)', borderRadius: 8, margin: '8px 12px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          onClick={() => refetch()}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11 }}
        >
          ↻ Refresh
        </button>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 11, textAlign: 'center', padding: 8 }}>
          <div className="spinner" style={{ width: 14, height: 14, margin: '0 auto 6px' }} />
          AI analyzing {symbol}...
        </div>
      ) : data?.aiAnalysis ? (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {data.aiAnalysis.slice(0, 500)}
          </div>
          
          {data?.vob?.zones?.length > 0 && (
            <div style={{ marginTop: 10, padding: 8, background: 'rgba(0,180,216,0.1)', borderRadius: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--accent)', marginBottom: 4 }}>📊 VOB Zones Found: {data.vob.zones.length}</div>
              {data.vob.zones.map((z, i) => (
                <div key={i} style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                  Bull OB: ₹{z.bottom?.toFixed(2)} - ₹{z.top?.toFixed(2)}
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8, textAlign: 'center' }}>
            Powered by Groq AI • VOB Strategy
          </div>
        </div>
      ) : (
        <div style={{ color: 'var(--text-dim)', fontSize: 11, textAlign: 'center' }}>
          Click refresh to get AI analysis
        </div>
      )}
    </div>
  );
}