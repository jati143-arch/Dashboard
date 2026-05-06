import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statsApi, riskApi } from '../api/client.js';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';
import PnlBadge from '../components/shared/PnlBadge.jsx';
import PortfolioChart from '../components/performance/PortfolioChart.jsx';
import PnlHeatmap from '../components/performance/PnlHeatmap.jsx';
import CurrencyToggle from '../components/shared/CurrencyToggle.jsx';
import RiskMetrics from '../components/performance/RiskMetrics.jsx';
import ReturnDistribution from '../components/performance/ReturnDistribution.jsx';
import SectorExposure from '../components/performance/SectorExposure.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { CUR_SYMBOL } from '../utils/currency.js';

const PERIODS = ['daily', 'weekly', 'monthly', 'all'];

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--text-mono)', color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label, sym }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, color: val >= 0 ? 'var(--green)' : 'var(--red)' }}>
        {val >= 0 ? '+' : ''}{sym}{Math.abs(val).toFixed(2)}
      </div>
    </div>
  );
}

export default function Performance() {
  const [period, setPeriod] = useState('monthly');
  const [chartType, setChartType] = useState('bar');
  const [tab, setTab] = useState('overview');
  const { currency } = useCurrency();
  const sym = CUR_SYMBOL[currency] || '$';

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['stats-summary', period],
    queryFn: () => statsApi.summary(period),
  });

  const { data: series = [], isLoading: seriesLoading } = useQuery({
    queryKey: ['stats-series'],
    queryFn: () => statsApi.pnlSeries(),
  });

  const { data: byPattern = [], isLoading: patternLoading } = useQuery({
    queryKey: ['stats-by-pattern'],
    queryFn: () => statsApi.byPattern(),
  });

  const { data: riskData, isLoading: riskLoading } = useQuery({
    queryKey: ['risk-metrics'],
    queryFn: () => riskApi.metrics(),
    enabled: tab === 'risk',
  });

  const { data: sectorData = [], isLoading: sectorLoading } = useQuery({
    queryKey: ['sector-breakdown'],
    queryFn: () => statsApi.sectorBreakdown(),
    enabled: tab === 'sectors',
  });

  const isLoading = sumLoading || seriesLoading || patternLoading;

  if (isLoading) return <LoadingSpinner text="Loading stats..." />;

  const chartData = series.map(d => ({ ...d, pnl: Math.round(d.pnl * 100) / 100 }));

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {['overview', 'sectors', 'risk'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '9px 20px', border: 'none', borderBottom: t === tab ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer',
              color: t === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: t === tab ? 700 : 400, fontSize: 13, textTransform: 'capitalize',
            }}>
            {t === 'overview' ? 'Overview' : t === 'sectors' ? 'Sectors' : 'Risk Metrics'}
          </button>
        ))}
      </div>

      {tab === 'sectors' && (
        <div className="card">
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Sector Exposure
          </div>
          {sectorLoading ? <LoadingSpinner text="Loading sector data…" /> : <SectorExposure data={sectorData} />}
        </div>
      )}

      {tab === 'risk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {riskLoading ? <LoadingSpinner text="Calculating risk metrics…" /> : (
            <>
              <RiskMetrics data={riskData} />
              {riskData && !riskData.empty && <ReturnDistribution dailyPnl={riskData.dailyPnl} />}
            </>
          )}
        </div>
      )}

      {tab === 'overview' && <>
      <PortfolioChart />
      <PnlHeatmap />
      {/* Period toggle + currency */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                background: period === p ? 'var(--accent)' : 'transparent',
                color: period === p ? '#000' : 'var(--text-secondary)',
                border: period === p ? 'none' : '1px solid var(--border)',
                fontWeight: period === p ? 700 : 400,
                borderRadius: 'var(--radius)',
                padding: '5px 14px',
                cursor: 'pointer',
                fontSize: 12,
                textTransform: 'capitalize',
              }}
            >{p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}</button>
          ))}
        </div>
        <CurrencyToggle />
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Total Trades" value={summary?.total_trades ?? '—'} />
        <StatCard
          label="Win Rate"
          value={summary?.total_trades ? `${summary.win_rate}%` : '—'}
          color={summary?.win_rate >= 50 ? 'var(--green)' : 'var(--red)'}
        />
        <StatCard
          label="Total P&L"
          value={summary?.total_pnl != null
            ? `${summary.total_pnl >= 0 ? '+' : ''}${sym}${Math.abs(summary.total_pnl).toFixed(2)}`
            : '—'}
          color={summary?.total_pnl >= 0 ? 'var(--green)' : 'var(--red)'}
        />
        <StatCard
          label="Avg Winner"
          value={summary?.avg_winner != null ? `+${sym}${summary.avg_winner.toFixed(2)}` : '—'}
          color="var(--green)"
        />
        <StatCard
          label="Avg Loser"
          value={summary?.avg_loser != null ? `${sym}${summary.avg_loser.toFixed(2)}` : '—'}
          color="var(--red)"
        />
        <StatCard
          label="Best Trade"
          value={summary?.best_trade != null ? `+${sym}${summary.best_trade.toFixed(2)}` : '—'}
          color="var(--green)"
        />
        <StatCard
          label="Worst Trade"
          value={summary?.worst_trade != null ? `${sym}${summary.worst_trade.toFixed(2)}` : '—'}
          color="var(--red)"
        />
      </div>

      {/* P&L Chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            P&L by Day
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['bar', 'line'].map(t => (
              <button key={t} onClick={() => setChartType(t)} className={chartType === t ? 'btn-primary' : 'btn-ghost'} style={{ padding: '3px 10px', fontSize: 11 }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="empty-state">No trade data to chart yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ left: 10, right: 10, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${sym}${v}`} />
                <Tooltip content={<CustomTooltip sym={sym} />} />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Bar dataKey="pnl" fill="var(--accent)" radius={[3,3,0,0]}
                  label={false}
                  isAnimationActive={false}
                />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ left: 10, right: 10, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${sym}${v}`} />
                <Tooltip content={<CustomTooltip sym={sym} />} />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Line dataKey="pnl" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Pattern stats table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Performance by Pattern
          </span>
        </div>
        {byPattern.length === 0 ? (
          <div className="empty-state">Tag trades with patterns to see stats here.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Pattern</th>
                <th>Trades</th>
                <th>Win Rate</th>
                <th>Total P&L</th>
                <th>Avg P&L</th>
                <th>Avg Winner</th>
                <th>Avg Loser</th>
              </tr>
            </thead>
            <tbody>
              {byPattern.map(p => (
                <tr key={p.pattern_tag}>
                  <td style={{ fontWeight: 600 }}>{p.pattern_tag}</td>
                  <td className="mono">{p.total_trades}</td>
                  <td>
                    <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, color: p.win_rate >= 50 ? 'var(--green)' : 'var(--red)' }}>
                      {p.win_rate}%
                    </span>
                  </td>
                  <td><PnlBadge value={p.total_pnl} /></td>
                  <td><PnlBadge value={p.avg_pnl} /></td>
                  <td><PnlBadge value={p.avg_winner} /></td>
                  <td><PnlBadge value={p.avg_loser} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </>}
    </div>
  );
}
