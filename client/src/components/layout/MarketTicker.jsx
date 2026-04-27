import { useQuery } from '@tanstack/react-query';
import { pricesApi } from '../../api/client.js';

const INDICES = [
  { sym: '^NSEI',    label: 'NIFTY 50'   },
  { sym: '^BSESN',   label: 'SENSEX'     },
  { sym: '^NSEBANK', label: 'BANK NIFTY' },
  { sym: '^GSPC',    label: 'S&P 500'    },
  { sym: '^IXIC',    label: 'NASDAQ'     },
  { sym: '^DJI',     label: 'DOW'        },
  { sym: 'GC=F',     label: 'GOLD'       },
  { sym: 'CL=F',     label: 'CRUDE OIL'  },
  { sym: 'USDINR=X', label: 'USD/INR'    },
];

const SYMS = INDICES.map(i => i.sym);

function fmt(price) {
  if (price >= 10000) return price.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  if (price >= 100)   return price.toFixed(2);
  return price.toFixed(4);
}

export default function MarketTicker() {
  const { data: prices = {} } = useQuery({
    queryKey: ['prices', SYMS],
    queryFn: () => pricesApi.get(SYMS),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const items = INDICES.map(({ sym, label }) => {
    const p = prices[sym];
    return { label, price: p?.price, change: p?.change, changePct: p?.changePercent };
  });

  // Duplicate for seamless loop
  const both = [...items, ...items];

  return (
    <div style={{
      height: 32,
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      overflow: 'hidden',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
    }}>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-inner {
          display: flex;
          animation: ticker-scroll 50s linear infinite;
          white-space: nowrap;
          will-change: transform;
        }
        .ticker-inner:hover { animation-play-state: paused; }
      `}</style>
      <div className="ticker-inner">
        {both.map(({ label, price, change, changePct }, i) => {
          const up = change == null ? null : change >= 0;
          const color = up === null ? 'var(--text-dim)' : up ? 'var(--green)' : 'var(--red)';
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 20px', borderRight: '1px solid var(--border)', fontSize: 11 }}>
              <span style={{ color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em' }}>{label}</span>
              <span style={{ fontFamily: 'var(--text-mono)', color: 'var(--text-primary)' }}>
                {price != null ? fmt(price) : '—'}
              </span>
              {changePct != null && (
                <span style={{ fontFamily: 'var(--text-mono)', color, fontSize: 10 }}>
                  {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
