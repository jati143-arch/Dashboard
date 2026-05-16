function MetricCard({ label, value, sub, color, tooltip }) {
  return (
    <div title={tooltip} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: '18px 20px', textAlign: 'center', cursor: tooltip ? 'help' : 'default', background: '#111111' }}>
      <div style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: color || '#ffffff' }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#71717a', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function ratingColor(v, good, bad) {
  if (v == null) return undefined;
  if (v >= good) return '#22ff88';
  if (v <= bad)  return '#ff4444';
  return '#f59e0b';
}

export default function RiskMetrics({ data }) {
  if (!data || data.empty) {
    return <div style={{ textAlign: 'center', color: '#52525b', padding: '48px 0', fontSize: 14, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24 }}>No closed trades found. Risk metrics need closed trades with P&L data.</div>;
  }

  const {
    sharpe, sortino, maxDrawdown, maxDrawdownDuration, var95,
    profitFactor, expectancy, avgHoldingHours, bestWinStreak,
    worstLoseStreak, calmar, winRate, tradeCount, totalPnl,
  } = data;

  const fmt = (v, d = 2) => v == null ? null : Number(v).toFixed(d);
  const fmtCur = (v) => v == null ? null : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
      <MetricCard label="Total Trades" value={tradeCount} sub="closed" />
      <MetricCard label="Win Rate" value={winRate != null ? `${winRate}%` : null} color={ratingColor(winRate, 55, 40)} tooltip="% of closed trades that were profitable" />
      <MetricCard label="Total P&L" value={fmtCur(totalPnl)} color={totalPnl >= 0 ? '#22ff88' : '#ff4444'} />
      <MetricCard label="Sharpe Ratio" value={fmt(sharpe)} color={ratingColor(sharpe, 1.5, 0.5)} sub="annualised" tooltip="Return per unit of risk. >1.5 is good, >2 is excellent" />
      <MetricCard label="Sortino Ratio" value={fmt(sortino)} color={ratingColor(sortino, 2, 0.5)} sub="annualised" tooltip="Like Sharpe but only penalises downside volatility" />
      <MetricCard label="Max Drawdown" value={maxDrawdown != null ? `₹${maxDrawdown.toLocaleString()}` : null} color={maxDrawdown > 0 ? '#ff4444' : undefined} sub="peak to trough" />
      <MetricCard label="DD Duration" value={maxDrawdownDuration != null ? `${maxDrawdownDuration}d` : null} sub="trading days" tooltip="Days from peak to recovery" />
      <MetricCard label="VaR 95%" value={var95 != null ? `₹${var95.toLocaleString()}` : null} color="#ff4444" tooltip="Worst daily P&L at 95% confidence" />
      <MetricCard label="Profit Factor" value={fmt(profitFactor)} color={ratingColor(profitFactor, 1.5, 1)} tooltip="Gross wins ÷ gross losses. >1.5 is good" />
      <MetricCard label="Expectancy" value={fmtCur(expectancy)} sub="per trade" color={expectancy >= 0 ? '#22ff88' : '#ff4444'} tooltip="(win_rate × avg_win) − (loss_rate × avg_loss)" />
      <MetricCard label="Avg Hold Time" value={avgHoldingHours != null ? (avgHoldingHours < 24 ? `${avgHoldingHours}h` : `${(avgHoldingHours / 24).toFixed(1)}d`) : null} />
      <MetricCard label="Calmar Ratio" value={fmt(calmar)} color={ratingColor(calmar, 1, 0.5)} tooltip="Annualised return ÷ max drawdown" />
      <MetricCard label="Best Streak" value={bestWinStreak != null ? `${bestWinStreak}W` : null} color="#22ff88" />
      <MetricCard label="Worst Streak" value={worstLoseStreak != null ? `${worstLoseStreak}L` : null} color="#ff4444" />
    </div>
  );
}