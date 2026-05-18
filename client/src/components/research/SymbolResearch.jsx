import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pythonDataApi } from '../../api/client.js';
import CandlestickChart from '../chart/CandlestickChart.jsx';
import { TrendingUp, TrendingDown, ExternalLink, RefreshCw } from 'lucide-react';

function StatRow({ label, value, format = 'text' }) {
  if (value == null || value === '') return null;
  let display = value;
  if (format === 'pct' && typeof value === 'number') display = `${(value * 100).toFixed(2)}%`;
  else if (format === 'large' && typeof value === 'number') {
    if (value >= 1e12) display = `${(value / 1e12).toFixed(2)}T`;
    else if (value >= 1e9) display = `${(value / 1e9).toFixed(2)}B`;
    else if (value >= 1e6) display = `${(value / 1e6).toFixed(2)}M`;
    else display = value.toLocaleString();
  } else if (format === 'num' && typeof value === 'number') {
    display = value.toFixed(2);
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{display}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function SymbolResearch({ symbol, onClose }) {
  const [tab, setTab] = useState('overview');

  const { data: infoResult, isLoading: infoLoading } = useQuery({
    queryKey: ['yf-info', symbol],
    queryFn: () => pythonDataApi.yfInfo(symbol),
    staleTime: 10 * 60_000,
  });

  const { data: calResult } = useQuery({
    queryKey: ['yf-calendar', symbol],
    queryFn: () => pythonDataApi.yfCalendar(symbol),
    staleTime: 60 * 60_000,
  });

  const { data: divResult } = useQuery({
    queryKey: ['yf-dividends', symbol],
    queryFn: () => pythonDataApi.yfDividends(symbol),
    staleTime: 60 * 60_000,
    enabled: tab === 'dividends',
  });

  const info = infoResult?.success ? infoResult.data : null;
  const cal = calResult?.success ? calResult.data : null;
  const divs = divResult?.success ? divResult.data : [];

  const tabs = ['overview', 'chart', 'dividends'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      {info && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>{info.shortName || symbol}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {symbol} · {info.exchange} · {info.sector}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {info.currentPrice && (
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                  {info.currency === 'INR' ? '₹' : '$'}{info.currentPrice.toLocaleString()}
                </div>
              )}
              {info.fiftyTwoWeekHigh && (
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  52W: {info.fiftyTwoWeekLow?.toLocaleString()} – {info.fiftyTwoWeekHigh?.toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* 52-week range bar */}
          {info.fiftyTwoWeekHigh && info.fiftyTwoWeekLow && info.currentPrice && (() => {
            const range = info.fiftyTwoWeekHigh - info.fiftyTwoWeekLow;
            const pct = Math.max(0, Math.min(100, ((info.currentPrice - info.fiftyTwoWeekLow) / range) * 100));
            return (
              <div style={{ marginTop: 12, position: 'relative' }}>
                <div style={{ height: 4, borderRadius: 9999, background: 'var(--color-border)', overflow: 'visible' }}>
                  <div style={{ position: 'absolute', left: `${pct}%`, top: -4, transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', background: 'var(--color-accent)', border: '2px solid var(--color-bg-card)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 9, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>52W Low {info.fiftyTwoWeekLow?.toLocaleString()}</span>
                  <span style={{ fontSize: 9, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>52W High {info.fiftyTwoWeekHigh?.toLocaleString()}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '5px 14px', borderRadius: 9999, fontSize: 12, border: 'none', cursor: 'pointer',
            background: tab === t ? 'var(--color-accent)' : 'transparent',
            color: tab === t ? '#000' : 'var(--color-text-secondary)',
            fontWeight: tab === t ? 700 : 400, textTransform: 'capitalize',
          }}>{t}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div>
          {infoLoading && <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-secondary)', fontSize: 13 }}>Loading…</div>}
          {info && (
            <>
              <Section title="Valuation">
                <StatRow label="Market Cap" value={info.marketCap} format="large" />
                <StatRow label="P/E (Trailing)" value={info.trailingPE} format="num" />
                <StatRow label="P/E (Forward)" value={info.forwardPE} format="num" />
                <StatRow label="Price / Book" value={info.priceToBook} format="num" />
                <StatRow label="EPS (Trailing)" value={info.trailingEps} format="num" />
                <StatRow label="EPS (Forward)" value={info.forwardEps} format="num" />
                <StatRow label="Dividend Yield" value={info.dividendYield} format="pct" />
                <StatRow label="Beta" value={info.beta} format="num" />
              </Section>

              <Section title="Profitability">
                <StatRow label="Profit Margins" value={info.profitMargins} format="pct" />
                <StatRow label="Gross Margins" value={info.grossMargins} format="pct" />
                <StatRow label="Return on Equity" value={info.returnOnEquity} format="pct" />
                <StatRow label="Return on Assets" value={info.returnOnAssets} format="pct" />
                <StatRow label="Revenue Growth" value={info.revenueGrowth} format="pct" />
                <StatRow label="Earnings Growth" value={info.earningsGrowth} format="pct" />
                <StatRow label="Debt / Equity" value={info.debtToEquity} format="num" />
              </Section>

              {cal && (
                <Section title="Upcoming Events">
                  {cal.earningsDate && (
                    <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: '#fbbf24', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 3 }}>EARNINGS DATE</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 600 }}>{cal.earningsDate}</div>
                      {cal.epsEstimate && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>EPS Estimate: {cal.epsEstimate}</div>}
                    </div>
                  )}
                  {cal.exDividendDate && (
                    <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10 }}>
                      <div style={{ fontSize: 10, color: 'var(--color-green)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 3 }}>EX-DIVIDEND DATE</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 600 }}>{cal.exDividendDate}</div>
                    </div>
                  )}
                </Section>
              )}

              {info.longBusinessSummary && (
                <Section title="About">
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7, margin: 0 }}>
                    {info.longBusinessSummary.slice(0, 500)}{info.longBusinessSummary.length > 500 ? '…' : ''}
                  </p>
                  {info.website && (
                    <a href={info.website} target="_blank" rel="noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8,
                      fontSize: 11, color: 'var(--color-accent)', textDecoration: 'none',
                    }}>
                      <ExternalLink size={11} /> {info.website.replace('https://', '')}
                    </a>
                  )}
                </Section>
              )}
            </>
          )}
        </div>
      )}

      {/* Chart Tab */}
      {tab === 'chart' && (
        <CandlestickChart symbol={symbol} height={360} showIndicators={true} />
      )}

      {/* Dividends Tab */}
      {tab === 'dividends' && (
        <div>
          {divs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-secondary)', fontSize: 13 }}>
              No dividend history for {symbol}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{divs.length} dividend payments</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Total: {divResult?.currency === 'INR' ? '₹' : '$'}{divs.reduce((s, d) => s + d.amount, 0).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...divs].reverse().slice(0, 20).map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-bg-base)', borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{d.date}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-green)', fontFamily: 'var(--font-mono)' }}>
                      {divResult?.currency === 'INR' ? '₹' : '$'}{d.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
