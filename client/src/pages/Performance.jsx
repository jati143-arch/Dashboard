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
    <div style={{
      padding: '20px 16px',
      background: '#111111',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 24,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 10,
        color: '#52525b',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom: 10,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 600,
      }}>{label}</div>
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        color: color || '#ffffff',
      }}>{value}</div>
      {sub && (
        <div style={{
          fontSize: 11,
          color: '#71717a',
          marginTop: 6,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>{sub}</div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label, sym }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div style={{
      background: '#111111',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16,
      padding: '10px 14px',
    }}>
      <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4, fontFamily: "'Inter', system-ui, sans-serif" }}>{label}</div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        color: val >= 0 ? '#22ff88' : '#ff4444',
      }}>
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
    <div style={{ animation: 'fadeSlideUp 0.45s ease both' }}>
      {/* Pill tab bar */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 28,
        padding: 4,
        background: '#0a0a0a',
        borderRadius: '9999px',
        border: '1px solid rgba(255,255,255,0.06)',
        width: 'fit-content',
      }}>
        {['overview', 'sectors', 'risk'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '9999px',
              background: tab === t ? '#ffffff' : 'transparent',
              cursor: 'pointer',
              color: tab === t ? '#050505' : '#71717a',
              fontWeight: tab === t ? 700 : 400,
              fontSize: 13,
              textTransform: 'capitalize',
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {t === 'overview' ? 'Overview' : t === 'sectors' ? 'Sectors' : 'Risk Metrics'}
          </button>
        ))}
      </div>

      {tab === 'sectors' && (
        <div style={{
          padding: 28,
          background: '#111111',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 24,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#52525b',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 16,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
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
      {/* Period toggle + currency - pill style */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: '#0a0a0a',
          borderRadius: '9999px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                background: period === p ? '#22ff88' : 'transparent',
                color: period === p ? '#050505' : '#71717a',
                border: 'none',
                fontWeight: period === p ? 700 : 400,
                borderRadius: '9999px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 12,
                textTransform: 'capitalize',
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: 'background 0.15s, color 0.15s',
              }}
            >{p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}</button>
          ))}
        </div>
        <CurrencyToggle />
      </div>

      {/* Summary cards - large mono stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        marginBottom: 28,
      }}>
        <StatCard label="Total Trades" value={summary?.total_trades ?? '—'} />
        <StatCard
          label="Win Rate"
          value={summary?.total_trades ? `${summary.win_rate}%` : '—'}
          color={summary?.win_rate >= 50 ? '#22ff88' : '#ff4444'}
        />
        <StatCard
          label="Total P&L"
          value={summary?.total_pnl != null
            ? `${summary.total_pnl >= 0 ? '+' : ''}${sym}${Math.abs(summary.total_pnl).toFixed(2)}`
            : '—'}
          color={summary?.total_pnl >= 0 ? '#22ff88' : '#ff4444'}
        />
        <StatCard
          label="Avg Winner"
          value={summary?.avg_winner != null ? `+${sym}${summary.avg_winner.toFixed(2)}` : '—'}
          color="#22ff88"
        />
        <StatCard
          label="Avg Loser"
          value={summary?.avg_loser != null ? `${sym}${summary.avg_loser.toFixed(2)}` : '—'}
          color="#ff4444"
        />
        <StatCard
          label="Best Trade"
          value={summary?.best_trade != null ? `+${sym}${summary.best_trade.toFixed(2)}` : '—'}
          color="#22ff88"
        />
        <StatCard
          label="Worst Trade"
          value={summary?.worst_trade != null ? `${sym}${summary.worst_trade.toFixed(2)}` : '—'}
          color="#ff4444"
        />
      </div>

      {/* P&L Chart */}
      <div style={{
        padding: 28,
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 24,
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#52525b',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            P&L by Day
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['bar', 'line'].map(t => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                style={{
                  padding: '6px 14px',
                  border: 'none',
                  borderRadius: '9999px',
                  background: chartType === t ? '#ffffff' : 'transparent',
                  color: chartType === t ? '#050505' : '#71717a',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: chartType === t ? 600 : 400,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#52525b', fontSize: 13 }}>No trade data to chart yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ left: 10, right: 10, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${sym}${v}`} />
                <Tooltip content={<CustomTooltip sym={sym} />} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" />
                <Bar dataKey="pnl" fill="#22ff88" radius={[3,3,0,0]}
                  label={false}
                  isAnimationActive={false}
                />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ left: 10, right: 10, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${sym}${v}`} />
                <Tooltip content={<CustomTooltip sym={sym} />} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" />
                <Line dataKey="pnl" stroke="#22ff88" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Pattern stats table */}
      <div style={{
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 24,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#52525b',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            Performance by Pattern
          </span>
        </div>
        {byPattern.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#52525b', fontSize: 13 }}>Tag trades with patterns to see stats here.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Pattern</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Trades</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Win Rate</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Total P&L</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Avg P&L</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Avg Winner</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', system-ui, sans-serif", borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Avg Loser</th>
              </tr>
            </thead>
            <tbody>
              {byPattern.map(p => (
                <tr key={p.pattern_tag}>
                  <td style={{ padding: '12px 24px', fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif", color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{p.pattern_tag}</td>
                  <td style={{ padding: '12px 24px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{p.total_trades}</td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      color: p.win_rate >= 50 ? '#22ff88' : '#ff4444',
                    }}>
                      {p.win_rate}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}><PnlBadge value={p.total_pnl} /></td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}><PnlBadge value={p.avg_pnl} /></td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}><PnlBadge value={p.avg_winner} /></td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}><PnlBadge value={p.avg_loser} /></td>
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