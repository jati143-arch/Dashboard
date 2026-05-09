import { useQuery } from '@tanstack/react-query';
import { screenerApi } from '../../api/client.js';

const SIGNAL_COLORS = {
  BUY:  { bg: 'rgba(0,220,100,0.15)', color: '#00dc64', border: 'rgba(0,220,100,0.4)' },
  SELL: { bg: 'rgba(255,80,60,0.15)', color: '#ff503c', border: 'rgba(255,80,60,0.4)' },
  HOLD: { bg: 'rgba(120,120,120,0.15)', color: '#aaa', border: 'rgba(150,150,150,0.4)' },
};

export default function SignalsPanel({ symbol }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['screener-signals', symbol],
    queryFn: () => screenerApi.signals(symbol),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) return (
    <div style={{ padding: 20, color: 'var(--text-dim)', textAlign: 'center' }}>
      <div className="spinner" style={{ width: 20, height: 20, margin: '0 auto 10px' }} />
      Analyzing {symbol}...
    </div>
  );

  if (isError || !data) return (
    <div style={{ padding: 20, color: 'var(--text-dim)', textAlign: 'center' }}>
      Unable to generate signals
    </div>
  );

  const sigStyle = SIGNAL_COLORS[data.signal] || SIGNAL_COLORS.HOLD;

  return (
    <div style={{ padding: 16, background: 'var(--bg-surface)', borderRadius: 8, margin: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          padding: '8px 16px',
          borderRadius: 6,
          background: sigStyle.bg,
          border: `1px solid ${sigStyle.border}`,
          color: sigStyle.color,
          fontWeight: 700,
          fontSize: 16,
          textTransform: 'uppercase',
        }}>
          {data.signal}
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Confidence</div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.confidence}%</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 6 }}>Entry Price</div>
        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--accent)' }}>
          ₹{data.entryPrice}
        </div>
      </div>

      {data.targets && Object.keys(data.targets).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 6 }}>Price Targets</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(data.targets).map(([k, v]) => (
              <div key={k} style={{ flex: 1, padding: 8, background: 'var(--bg-card)', borderRadius: 4, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>T{k.slice(1)}</div>
                <div style={{ fontWeight: 600, color: 'var(--green)' }}>₹{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.stopLoss && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Stop Loss</div>
          <div style={{ fontWeight: 600, color: 'var(--red)' }}>₹{data.stopLoss}</div>
        </div>
      )}

      {data.reasons && data.reasons.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 6 }}>Analysis</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.reasons.map((r, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                • {r}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>RSI (14)</div>
          <div style={{ fontWeight: 600, color: data.rsi < 30 ? 'var(--green)' : data.rsi > 70 ? 'var(--red)' : 'var(--text-primary)' }}>
            {data.rsi || '—'}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>SMA 20</div>
          <div style={{ fontWeight: 600 }}>{data.sma20 || '—'}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>SMA 50</div>
          <div style={{ fontWeight: 600 }}>{data.sma50 || '—'}</div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', marginTop: 12 }}>
        AI-powered signal • Data from Yahoo Finance
      </div>
    </div>
  );
}