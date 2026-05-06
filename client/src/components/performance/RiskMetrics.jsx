function MetricCard({ label, value, sub, color, tooltip }) {
  return (
    <div className="card" title={tooltip} style={{ padding: '14px 16px', textAlign: 'center', cursor: tooltip ? 'help' : 'default' }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--text-mono)', color: color || 'var(--text-primary)' }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ratingColor(v, good, bad) {
  if (v == null) return undefined;
  if (v >= good) return 'var(--green)';
  if (v <= bad)  return 'var(--red)';
  return '#f59e0b';
}

export default function RiskMetrics({ data }) {
  if (!data || data.empty) {
    return <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px 0', fontSize: 13 }}>No closed trades found. Risk metrics need closed trades with P&L data.</div>;
  }

  const {
    sharpe, sortino, maxDrawdown, maxDrawdownDuration, var95,
    profitFactor, expectancy, avgHoldingHours, bestWinStreak,
    worstLoseStreak, calmar, winRate, tradeCount, totalPnl,
  } = data;

  const fmt = (v, d = 2) => v == null ? null : Number(v).toFixed(d);
  const fmtCur = (v) => v == null ? null : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
      <MetricCard label="Total Trades" value={tradeCount} sub="closed" />
      <MetricCard label="Win Rate" value={winRate != null ? `${winRate}%` : null} color={ratingColor(winRate, 55, 40)} tooltip="% of closed trades that were profitable" />
      <MetricCard label="Total P&L" value={fmtCur(totalPnl)} color={totalPnl >= 0 ? 'var(--green)' : 'var(--red)'} />
      <MetricCard label="Sharpe Ratio" value={fmt(sharpe)} color={ratingColor(sharpe, 1.5, 0.5)} sub="annualised" tooltip="Return per unit of risk. >1.5 is good, >2 is excellent" />
      <MetricCard label="Sortino Ratio" value={fmt(sortino)} color={ratingColor(sortino, 2, 0.5)} sub="annualised" tooltip="Like Sharpe but only penalises downside volatility" />
      <MetricCard label="Max Drawdown" value={maxDrawdown != null ? `₹${maxDrawdown.toLocaleString()}` : null} color={maxDrawdown > 0 ? 'var(--red)' : undefined} sub="peak to trough" />
      <MetricCard label="DD Duration" value={maxDrawdownDuration != null ? `${maxDrawdownDuration}d` : null} sub="trading days" tooltip="Days from peak to recovery" />
      <MetricCard label="VaR 95%" value={var95 != null ? `₹${var95.toLocaleString()}` : null} color="var(--red)" tooltip="Worst daily P&L at 95% confidence" />
      <MetricCard label="Profit Factor" value={fmt(profitFactor)} color={ratingColor(profitFactor, 1.5, 1)} tooltip="Gross wins ÷ gross losses. >1.5 is good" />
      <MetricCard label="Expectancy" value={fmtCur(expectancy)} sub="per trade" color={expectancy >= 0 ? 'var(--green)' : 'var(--red)'} tooltip="(win_rate × avg_win) − (loss_rate × avg_loss)" />
      <MetricCard label="Avg Hold Time" value={avgHoldingHours != null ? (avgHoldingHours < 24 ? `${avgHoldingHours}h` : `${(avgHoldingHours / 24).toFixed(1)}d`) : null} />
      <MetricCard label="Calmar Ratio" value={fmt(calmar)} color={ratingColor(calmar, 1, 0.5)} tooltip="Annualised return ÷ max drawdown" />
      <MetricCard label="Best Streak" value={bestWinStreak != null ? `${bestWinStreak}W` : null} color="var(--green)" />
      <MetricCard label="Worst Streak" value={worstLoseStreak != null ? `${worstLoseStreak}L` : null} color="var(--red)" />
    </div>
  );
}
