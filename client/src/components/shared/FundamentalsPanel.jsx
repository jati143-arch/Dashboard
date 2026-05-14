import { useQuery } from '@tanstack/react-query';
import { fundamentalsApi, screenerApi } from '../../api/client.js';

const REC_COLORS = {
  'strong buy': 'var(--color-green)', buy: 'var(--color-green)',
  hold: 'var(--color-yellow)', underperform: 'var(--color-red)', sell: 'var(--color-red)',
};

function FRow({ label, value, color }) {
  if (value == null) return null;
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
      <span style={{ color: 'var(--color-text-dim)', minWidth: 140 }}>{label}</span>
      <span style={{ fontFamily: 'var(--color-text-mono)', fontWeight: 600, color: color || 'var(--color-text-primary)' }}>{value}</span>
    </div>
  );
}

function FSection({ title, children }) {
  return (
    <div style={{ minWidth: 180 }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--color-text-dim)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>{title}</div>
      {children}
    </div>
  );
}

export function FundamentalsPanel({ symbol }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['fundamentals-inv', symbol],
    queryFn: () => fundamentalsApi.get(symbol),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) return (
    <div style={{ padding: '14px 20px', color: 'var(--color-text-dim)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="spinner" style={{ width: 14, height: 14 }} />
      Loading fundamentals…
    </div>
  );
  if (isError || !data) return (
    <div style={{ padding: '14px 20px', color: 'var(--color-text-dim)', fontSize: 12 }}>
      Fundamentals unavailable
    </div>
  );

  const recColor = data.recommendation ? (REC_COLORS[data.recommendation.toLowerCase()] || 'var(--color-text-secondary)') : null;
  const pct = v => v != null ? `${v}%` : null;
  const x   = v => v != null ? `${v}×` : null;

  return (
    <div style={{ padding: '14px 20px', background: 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 28, flexWrap: 'wrap', fontSize: 12 }}>
      <FSection title="Valuation">
        <FRow label="P/E (TTM)"       value={data.peRatio} />
        <FRow label="Forward P/E"     value={data.forwardPE} />
        <FRow label="P/B"             value={data.pbRatio} />
        <FRow label="EV/EBITDA"       value={x(data.evEbitda)} />
        <FRow label="Market Cap"      value={data.marketCap} />
        <FRow label="EPS"             value={data.eps} />
      </FSection>
      <FSection title="Profitability">
        <FRow label="ROE"             value={pct(data.roe)}            color={data.roe >= 15 ? 'var(--color-green)' : data.roe < 0 ? 'var(--color-red)' : null} />
        <FRow label="ROA"             value={pct(data.roa)} />
        <FRow label="Profit Margin"   value={pct(data.profitMargin)} />
        <FRow label="Operating Margin" value={pct(data.operatingMargin)} />
        <FRow label="Revenue Growth"  value={pct(data.revenueGrowth)}  color={data.revenueGrowth > 0 ? 'var(--color-green)' : 'var(--color-red)'} />
        <FRow label="Earnings Growth" value={pct(data.earningsGrowth)} color={data.earningsGrowth > 0 ? 'var(--color-green)' : 'var(--color-red)'} />
      </FSection>
      <FSection title="Financial Health">
        <FRow label="Debt / Equity"   value={data.debtToEquity}        color={data.debtToEquity > 2 ? 'var(--color-red)' : null} />
        <FRow label="Current Ratio"   value={data.currentRatio}        color={data.currentRatio < 1 ? 'var(--color-red)' : 'var(--color-green)'} />
        <FRow label="Quick Ratio"     value={data.quickRatio} />
        <FRow label="Total Debt"      value={data.totalDebt} />
        <FRow label="Total Cash"      value={data.totalCash} />
        <FRow label="Free Cash Flow"  value={data.freeCashFlow} />
      </FSection>
      <FSection title="Market Data">
        <FRow label="52wk High"       value={data.week52High} color="var(--color-green)" />
        <FRow label="52wk Low"        value={data.week52Low}  color="var(--color-red)" />
        {data.dividendYield != null && (
          <FRow label="Dividend Yield" value={pct(data.dividendYield)} color="var(--color-green)" />
        )}
        <FRow label="Avg Volume"      value={data.avgVolume} />
        <FRow label="Book Value"      value={data.bookValue} />
      </FSection>
      {(data.recommendation || data.targetPrice) && (
        <FSection title="Analyst">
          {data.recommendation && (
            <FRow label="Consensus" value={data.recommendation.toUpperCase()} color={recColor} />
          )}
          <FRow label="Analysts"      value={data.numberOfAnalysts} />
          <FRow label="Target (avg)"  value={data.targetPrice} />
          <FRow label="Target (high)" value={data.targetHigh} />
          <FRow label="Target (low)"  value={data.targetLow} />
          <FRow label="Beta"          value={data.beta} />
        </FSection>
      )}
      <div style={{ fontSize: 10, color: 'var(--color-text-dim)', alignSelf: 'flex-end', marginLeft: 'auto' }}>
        Yahoo Finance · Cached 1h
      </div>
    </div>
  );
}

// Screener Quarterly P&L Panel
export function ScreenerQuarterlyPanel({ symbol }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['screener-quarterly', symbol],
    queryFn: () => screenerApi.quarterly(symbol),
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) return (
    <div style={{ padding: '14px 20px', color: 'var(--color-text-dim)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="spinner" style={{ width: 14, height: 14 }} />
      Loading quarterly P&L…
    </div>
  );
  if (isError || !data?.quarters?.length) return (
    <div style={{ padding: '14px 20px', color: 'var(--color-text-dim)', fontSize: 12 }}>
      Quarterly P&L unavailable{data?.message ? `: ${data.message}` : ''}
      <button onClick={() => refetch()} style={{ marginLeft: 10, background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>↻ Retry</button>
    </div>
  );

  const HEADERS = ['Quarter', 'Revenue', 'Op. Income', 'Net Income', 'Gross Profit', 'EBITDA', 'EPS'];

  return (
    <div style={{ padding: '14px 20px', background: 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border)', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
          Quarterly P&L · last {data.quarters.length} quarters
        </div>
        <button onClick={() => refetch()} style={{ background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>
          ↻ Refresh
        </button>
      </div>
      <table style={{ fontSize: 12, borderCollapse: 'collapse', minWidth: 600 }}>
        <thead>
          <tr>
            {HEADERS.map((h, i) => (
              <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '4px 12px', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.quarters.map(q => (
            <tr key={q.date} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '5px 12px', fontFamily: 'var(--color-text-mono)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{q.date}</td>
              {[q.revenue, q.operatingIncome, q.netIncome, q.grossProfit, q.ebitda, q.basicEPS].map((v, i) => (
                <td key={i} style={{ padding: '5px 12px', fontFamily: 'var(--color-text-mono)', fontWeight: 600, textAlign: 'right', color: v == null ? 'var(--color-text-dim)' : 'var(--color-text-primary)' }}>{v != null ? v?.toLocaleString() : '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginTop: 8 }}>Screener.in · Cached 6h</div>
    </div>
  );
}

// Screener Balance Sheet Panel
export function ScreenerBalanceSheetPanel({ symbol }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['screener-balance-sheet', symbol],
    queryFn: () => screenerApi.balanceSheet(symbol),
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) return (
    <div style={{ padding: '14px 20px', color: 'var(--color-text-dim)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="spinner" style={{ width: 14, height: 14 }} />
      Loading balance sheet…
    </div>
  );
  if (isError || !data?.balanceSheets?.length) return (
    <div style={{ padding: '14px 20px', color: 'var(--color-text-dim)', fontSize: 12 }}>
      Balance sheet unavailable{data?.message ? `: ${data.message}` : ''}
      <button onClick={() => refetch()} style={{ marginLeft: 10, background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>↻ Retry</button>
    </div>
  );

  const HEADERS = ['Year', 'Equity', 'Total Assets', 'Net Debt', 'Total Debt', 'Cash', 'Fixed Assets', 'Current Assets'];

  return (
    <div style={{ padding: '14px 20px', background: 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border)', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
          Balance Sheet · last {data.balanceSheets.length} years
        </div>
        <button onClick={() => refetch()} style={{ background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>
          ↻ Refresh
        </button>
      </div>
      <table style={{ fontSize: 12, borderCollapse: 'collapse', minWidth: 700 }}>
        <thead>
          <tr>
            {HEADERS.map((h, i) => (
              <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '4px 10px', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.balanceSheets.map(a => (
            <tr key={a.date} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '5px 10px', fontFamily: 'var(--color-text-mono)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{a.date}</td>
{[a.equity, a.totalAssets, a.netDebt, a.totalDebt, a.totalCash, a.fixedAssets, a.currentAssets].map((v, i) => (
                 <td key={i} style={{ padding: '5px 10px', fontFamily: 'var(--color-text-mono)', fontWeight: 600, textAlign: 'right', color: v == null ? 'var(--color-text-dim)' : 'var(--color-text-primary)' }}>{v != null ? v?.toLocaleString() : '—'}</td>
               ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginTop: 8 }}>Screener.in · Cached 6h</div>
    </div>
  );
}

// Screener Cash Flow Panel
export function ScreenerCashFlowPanel({ symbol }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['screener-cash-flow', symbol],
    queryFn: () => screenerApi.cashFlow(symbol),
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) return (
    <div style={{ padding: '14px 20px', color: 'var(--color-text-dim)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="spinner" style={{ width: 14, height: 14 }} />
      Loading cash flow…
    </div>
  );
  if (isError || !data?.cashFlows?.length) return (
    <div style={{ padding: '14px 20px', color: 'var(--color-text-dim)', fontSize: 12 }}>
      Cash flow unavailable{data?.message ? `: ${data.message}` : ''}
      <button onClick={() => refetch()} style={{ marginLeft: 10, background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>↻ Retry</button>
    </div>
  );

  const HEADERS = ['Year', 'Operating CF', 'Investing CF', 'Financing CF', 'Free Cash Flow', 'Capex'];

  return (
    <div style={{ padding: '14px 20px', background: 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border)', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
          Cash Flow · last {data.cashFlows.length} years
        </div>
        <button onClick={() => refetch()} style={{ background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>
          ↻ Refresh
        </button>
      </div>
      <table style={{ fontSize: 12, borderCollapse: 'collapse', minWidth: 600 }}>
        <thead>
          <tr>
            {HEADERS.map((h, i) => (
              <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '4px 10px', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.cashFlows.map(a => (
            <tr key={a.date} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '5px 10px', fontFamily: 'var(--color-text-mono)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{a.date}</td>
{[a.operating, a.investing, a.financing, a.freeCashFlow, a.capex].map((v, i) => (
                 <td key={i} style={{ padding: '5px 10px', fontFamily: 'var(--color-text-mono)', fontWeight: 600, textAlign: 'right', color: v == null ? 'var(--color-text-dim)' : 'var(--color-text-primary)' }}>{v != null ? v?.toLocaleString() : '—'}</td>
               ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginTop: 8 }}>Screener.in · Cached 6h</div>
    </div>
  );
}

// Screener Annual P&L Panel
export function ScreenerAnnualPanel({ symbol }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['screener-annual', symbol],
    queryFn: () => screenerApi.annual(symbol),
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) return (
    <div style={{ padding: '14px 20px', color: 'var(--color-text-dim)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="spinner" style={{ width: 14, height: 14 }} />
      Loading annual P&L…
    </div>
  );
  if (isError || !data?.annuals?.length) return (
    <div style={{ padding: '14px 20px', color: 'var(--color-text-dim)', fontSize: 12 }}>
      Annual P&L unavailable{data?.message ? `: ${data.message}` : ''}
      <button onClick={() => refetch()} style={{ marginLeft: 10, background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>↻ Retry</button>
    </div>
  );

  const HEADERS = ['Year', 'Revenue', 'Op. Income', 'Net Income', 'EPS', 'DPS'];

  return (
    <div style={{ padding: '14px 20px', background: 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border)', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
          Annual P&L · last {data.annuals.length} years
        </div>
        <button onClick={() => refetch()} style={{ background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>
          ↻ Refresh
        </button>
      </div>
      <table style={{ fontSize: 12, borderCollapse: 'collapse', minWidth: 500 }}>
        <thead>
          <tr>
            {HEADERS.map((h, i) => (
              <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '4px 10px', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.annuals.map(a => (
            <tr key={a.date} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '5px 10px', fontFamily: 'var(--color-text-mono)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{a.date}</td>
{[a.revenue, a.operatingIncome, a.netIncome, a.basicEPS, a.dividendPerShare].map((v, i) => (
                 <td key={i} style={{ padding: '5px 10px', fontFamily: 'var(--color-text-mono)', fontWeight: 600, textAlign: 'right', color: v == null ? 'var(--color-text-dim)' : 'var(--color-text-primary)' }}>{v != null ? v?.toLocaleString() : '—'}</td>
               ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginTop: 8 }}>Screener.in · Cached 6h</div>
    </div>
  );
}
