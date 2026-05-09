import { useQuery } from '@tanstack/react-query';
import { fundamentalsApi } from '../../api/client.js';

const REC_COLORS = {
  'strong buy': 'var(--green)', buy: 'var(--green)',
  hold: 'var(--yellow)', underperform: 'var(--red)', sell: 'var(--red)',
};

function FRow({ label, value, color }) {
  if (value == null) return null;
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
      <span style={{ color: 'var(--text-dim)', minWidth: 140 }}>{label}</span>
      <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 600, color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function FSection({ title, children }) {
  return (
    <div style={{ minWidth: 180 }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>{title}</div>
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
    <div style={{ padding: '14px 20px', color: 'var(--text-dim)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="spinner" style={{ width: 14, height: 14 }} />
      Loading fundamentals…
    </div>
  );
  if (isError || !data) return (
    <div style={{ padding: '14px 20px', color: 'var(--text-dim)', fontSize: 12 }}>
      Fundamentals unavailable
    </div>
  );

  const recColor = data.recommendation ? (REC_COLORS[data.recommendation.toLowerCase()] || 'var(--text-secondary)') : null;
  const pct = v => v != null ? `${v}%` : null;
  const x   = v => v != null ? `${v}×` : null;

  return (
    <div style={{ padding: '14px 20px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 28, flexWrap: 'wrap', fontSize: 12 }}>
      <FSection title="Valuation">
        <FRow label="P/E (TTM)"       value={data.peRatio} />
        <FRow label="Forward P/E"     value={data.forwardPE} />
        <FRow label="P/B"             value={data.pbRatio} />
        <FRow label="EV/EBITDA"       value={x(data.evEbitda)} />
        <FRow label="Market Cap"      value={data.marketCap} />
        <FRow label="EPS"             value={data.eps} />
      </FSection>
      <FSection title="Profitability">
        <FRow label="ROE"             value={pct(data.roe)}            color={data.roe >= 15 ? 'var(--green)' : data.roe < 0 ? 'var(--red)' : null} />
        <FRow label="ROA"             value={pct(data.roa)} />
        <FRow label="Profit Margin"   value={pct(data.profitMargin)} />
        <FRow label="Operating Margin" value={pct(data.operatingMargin)} />
        <FRow label="Revenue Growth"  value={pct(data.revenueGrowth)}  color={data.revenueGrowth > 0 ? 'var(--green)' : 'var(--red)'} />
        <FRow label="Earnings Growth" value={pct(data.earningsGrowth)} color={data.earningsGrowth > 0 ? 'var(--green)' : 'var(--red)'} />
      </FSection>
      <FSection title="Financial Health">
        <FRow label="Debt / Equity"   value={data.debtToEquity}        color={data.debtToEquity > 2 ? 'var(--red)' : null} />
        <FRow label="Current Ratio"   value={data.currentRatio}        color={data.currentRatio < 1 ? 'var(--red)' : 'var(--green)'} />
        <FRow label="Quick Ratio"     value={data.quickRatio} />
        <FRow label="Total Debt"      value={data.totalDebt} />
        <FRow label="Total Cash"      value={data.totalCash} />
        <FRow label="Free Cash Flow"  value={data.freeCashFlow} />
      </FSection>
      <FSection title="Market Data">
        <FRow label="52wk High"       value={data.week52High} color="var(--green)" />
        <FRow label="52wk Low"        value={data.week52Low}  color="var(--red)" />
        {data.dividendYield != null && (
          <FRow label="Dividend Yield" value={pct(data.dividendYield)} color="var(--green)" />
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
      <div style={{ fontSize: 10, color: 'var(--text-dim)', alignSelf: 'flex-end', marginLeft: 'auto' }}>
        Yahoo Finance · Cached 1h
      </div>
    </div>
  );
}

export function QuarterlyPanel({ symbol }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['fundamentals-qtly', symbol],
    queryFn: () => fundamentalsApi.quarterly(symbol),
    staleTime: 4 * 60 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) return (
    <div style={{ padding: '14px 20px', color: 'var(--text-dim)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="spinner" style={{ width: 14, height: 14 }} />
      Loading quarterly data…
    </div>
  );
  if (isError || !data?.quarters?.length) return (
    <div style={{ padding: '14px 20px', color: 'var(--text-dim)', fontSize: 12 }}>
      Quarterly data unavailable
    </div>
  );

  const HEADERS = ['Quarter', 'Revenue', 'Net Income', 'Gross Profit', 'EBITDA', 'Basic EPS', 'Diluted EPS'];

  return (
    <div style={{ padding: '14px 20px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
      <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
        Quarterly Results · last {data.quarters.length} quarters
      </div>
      <table style={{ fontSize: 12, borderCollapse: 'collapse', minWidth: 600 }}>
        <thead>
          <tr>
            {HEADERS.map((h, i) => (
              <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '4px 12px', color: 'var(--text-dim)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.quarters.map(q => (
            <tr key={q.date} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '5px 12px', fontFamily: 'var(--text-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{q.date}</td>
              {[q.revenue, q.netIncome, q.grossProfit, q.ebitda, q.basicEPS, q.dilutedEPS].map((v, i) => (
                <td key={i} style={{ padding: '5px 12px', fontFamily: 'var(--text-mono)', fontWeight: 600, textAlign: 'right', color: v == null ? 'var(--text-dim)' : 'var(--text-primary)' }}>{v ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>Yahoo Finance · Cached 4h</div>
    </div>
  );
}
