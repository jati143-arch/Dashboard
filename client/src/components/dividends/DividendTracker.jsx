import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tradesApi, pythonDataApi } from '../../api/client.js';

const CARD = { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '12px 14px' };

function DividendRow({ symbol, avgCost, quantity }) {
  const { data, isLoading } = useQuery({
    queryKey: ['yf-dividends', symbol],
    queryFn: () => pythonDataApi.yfDividends(symbol),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: !!symbol,
  });

  const { data: calData } = useQuery({
    queryKey: ['yf-calendar', symbol],
    queryFn: () => pythonDataApi.yfCalendar(symbol),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: !!symbol,
  });

  if (isLoading) return (
    <div style={{ ...CARD, marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{symbol} — Loading…</div>
    </div>
  );

  const dividends = data?.dividends || [];
  const lastYear = dividends.filter(d => {
    const y = new Date(d.date).getFullYear();
    return y === new Date().getFullYear() - 1 || y === new Date().getFullYear();
  });
  const annualDiv = lastYear.reduce((a, d) => a + d.amount, 0);
  const yoc = avgCost > 0 ? (annualDiv / avgCost) * 100 : null;
  const divIncome = annualDiv * (quantity || 1);
  const nextExDiv = calData?.ex_dividend_date || null;
  const nextDivAmount = calData?.dividend_rate ? calData.dividend_rate / 4 : null;

  if (dividends.length === 0) return null;

  return (
    <div style={{ ...CARD, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{symbol}</div>
          {nextExDiv && (
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Ex-div: {nextExDiv}
              {nextDivAmount ? ` · Est. $${nextDivAmount.toFixed(3)}/share` : ''}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          {yoc != null && (
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-green)' }}>
              {yoc.toFixed(2)}% YOC
            </div>
          )}
          {divIncome > 0 && (
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 1 }}>
              ~${divIncome.toFixed(2)}/yr income
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {dividends.slice(0, 8).map((d, i) => (
          <div key={i} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-base)', borderRadius: 6, padding: '2px 6px' }}>
            {d.date}: ${d.amount?.toFixed(4)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DividendTracker() {
  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades'],
    queryFn: () => tradesApi.list({ status: 'open' }),
    staleTime: 5 * 60 * 1000,
  });

  // Only show symbols that pay dividends (non-Indian, non-crypto)
  const positions = trades
    .filter(t => t.status === 'open' && t.symbol && !t.symbol.endsWith('.NS') && !t.symbol.endsWith('.BO'))
    .reduce((acc, t) => {
      const key = t.symbol;
      if (!acc[key]) acc[key] = { symbol: key, quantity: 0, totalCost: 0 };
      acc[key].quantity += t.quantity || 0;
      acc[key].totalCost += (t.entry_price || 0) * (t.quantity || 0);
      return acc;
    }, {});

  const posArr = Object.values(positions).map(p => ({
    ...p,
    avgCost: p.quantity > 0 ? p.totalCost / p.quantity : 0,
  }));

  if (isLoading) return <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, padding: 20 }}>Loading positions…</div>;

  if (posArr.length === 0) return (
    <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '40px 0', fontSize: 13, border: '1px dashed var(--color-border)', borderRadius: 16 }}>
      No open US/global positions found. Add positions in the Trade Log to track dividends.
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
        Showing dividend history &amp; yield-on-cost for open positions. Only symbols that pay dividends appear.
      </div>
      {posArr.map(p => (
        <DividendRow key={p.symbol} symbol={p.symbol} avgCost={p.avgCost} quantity={p.quantity} />
      ))}
    </div>
  );
}
