import { useQuery } from '@tanstack/react-query';
import { cryptoLiveApi } from '../../api/client.js';
import { TrendingUp, TrendingDown } from 'lucide-react';

function CoinCard({ coin }) {
  const pos = coin.changePct >= 0;
  return (
    <div style={{
      background: 'var(--color-bg-base)',
      border: `1px solid ${pos ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
      borderRadius: 12,
      padding: '10px 14px',
      minWidth: 120,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)' }}>{coin.symbol}</span>
        {pos ? <TrendingUp size={11} color="var(--color-green)" /> : <TrendingDown size={11} color="var(--color-red)" />}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
        ${coin.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: coin.price > 1 ? 2 : 6 })}
      </div>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: pos ? 'var(--color-green)' : 'var(--color-red)', marginTop: 2 }}>
        {pos ? '+' : ''}{coin.changePct?.toFixed(2)}%
      </div>
    </div>
  );
}

function PerpRow({ perp, spotPrice }) {
  const basis = spotPrice != null ? ((perp.price - spotPrice) / spotPrice) * 100 : null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{perp.symbol}-PERP</span>
      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
        ${perp.price?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
      </span>
      {basis != null && (
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: basis >= 0 ? 'var(--color-green)' : 'var(--color-red)', minWidth: 60, textAlign: 'right' }}>
          {basis >= 0 ? '+' : ''}{basis.toFixed(3)}% basis
        </span>
      )}
    </div>
  );
}

export default function CryptoPrices() {
  const { data, isLoading } = useQuery({
    queryKey: ['crypto-live'],
    queryFn: cryptoLiveApi.prices,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (isLoading) return <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Loading…</div>;

  const spot = data?.spot || [];
  const perps = data?.perps || [];

  const spotMap = {};
  spot.forEach(c => { spotMap[c.symbol] = c.price; });

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {spot.map(c => <CoinCard key={c.symbol} coin={c} />)}
      </div>

      {perps.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Hyperliquid Perps
          </div>
          {perps.map(p => (
            <PerpRow key={p.symbol} perp={p} spotPrice={spotMap[p.symbol]} />
          ))}
        </div>
      )}
    </div>
  );
}
