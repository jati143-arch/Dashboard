import { useCurrency } from '../../context/CurrencyContext.jsx';
import { CUR_SYMBOL, convert } from '../../utils/currency.js';
import CurrencyToggle from '../shared/CurrencyToggle.jsx';

const labelStyle = {
  fontSize: 11,
  color: 'var(--text-dim)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 8,
};

export default function PnlSummary({
  trades,           // today's closed non-MF trades (Trades Today tile)
  openTrades,       // all open trades (portfolio currency detection)
  allTimePnl,       // all-time realized P&L in portfolio native currency
  unrealizedPnl,    // already in display currency (from DailyDashboard)
  todaysGain,       // already in display currency (from DailyDashboard)
  openNonMfCount,
  beforeMarketOpen,
  overallWins = 0,
  overallLosses = 0,
  overallWinRate = 0,
  overallTotal = 0,
}) {
  const { currency, rates } = useCurrency();
  const sym = CUR_SYMBOL[currency] || '₹';

  // Detect portfolio native currency from open positions
  const nonMfOpen = (openTrades || []).filter(t => t.instrument_type !== 'mutual_fund');
  const portfolioNative = nonMfOpen.length > 0 && nonMfOpen.every(t =>
    t.symbol?.endsWith('.NS') || t.symbol?.endsWith('.BO'),
  ) ? 'INR' : 'USD';

  // Convert all-time realized P&L to selected display currency
  const realizedDisplay = allTimePnl != null
    ? convert(allTimePnl, portfolioNative, currency, rates)
    : null;

  // Today's trade stats (for Trades / Win Rate / Wins/Losses tiles)
  const wins = trades.filter(t => t.pnl_dollar > 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0;

  const pnlColor = (v) => v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text-secondary)';

  function fmtVal(val) {
    if (val == null || val === 0) return '—';
    return `${val >= 0 ? '+' : ''}${sym}${Math.abs(val).toFixed(2)}`;
  }

  return (
    <div>
      {/* Currency toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <CurrencyToggle />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>

        {/* Realized P&L — ALL-TIME closed trades */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={labelStyle}>Realized P&L</div>
          {realizedDisplay == null ? (
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--text-secondary)' }}>—</div>
          ) : (
            <>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--text-mono)', color: pnlColor(realizedDisplay) }}>
                {fmtVal(realizedDisplay)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>all closed trades</div>
            </>
          )}
        </div>

        {/* Unrealized P&L — live open positions, already in display currency */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={labelStyle}>Unrealized P&L</div>
          {openNonMfCount === 0 ? (
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--text-secondary)' }}>—</div>
          ) : (
            <>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--text-mono)', color: pnlColor(unrealizedPnl) }}>
                {unrealizedPnl >= 0 ? '+' : ''}{sym}{Math.abs(unrealizedPnl).toFixed(0)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                {openNonMfCount} open position{openNonMfCount !== 1 ? 's' : ''}
              </div>
            </>
          )}
        </div>

        {/* Today's Gain — price change on open positions, already in display currency */}
        <div className="card" style={{ textAlign: 'center', borderLeft: '2px solid var(--yellow)' }}>
          <div style={labelStyle}>Today's Gain</div>
          {beforeMarketOpen ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--text-secondary)' }}>—</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>Market closed</div>
            </>
          ) : openNonMfCount === 0 || todaysGain == null ? (
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--text-secondary)' }}>—</div>
          ) : (
            <>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--text-mono)', color: pnlColor(todaysGain) }}>
                {todaysGain >= 0 ? '+' : ''}{sym}{Math.abs(todaysGain).toFixed(0)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>today's session</div>
            </>
          )}
        </div>

        {/* Trades Today */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={labelStyle}>Trades Today</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--text-primary)' }}>{trades.length}</div>
        </div>

        {/* Win Rate — overall fully closed trades */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={labelStyle}>Win Rate</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: overallWinRate >= 50 ? 'var(--green)' : 'var(--red)' }}>
            {overallTotal > 0 ? `${overallWinRate}%` : '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>all closed trades</div>
        </div>

        {/* Wins / Losses — overall fully closed trades */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={labelStyle}>Wins / Losses</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--text-primary)', marginTop: 4 }}>
            <span style={{ color: 'var(--green)' }}>{overallWins}</span>
            <span style={{ color: 'var(--text-dim)', margin: '0 6px' }}>/</span>
            <span style={{ color: 'var(--red)' }}>{overallLosses}</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>all closed trades</div>
        </div>

        {/* Overall P&L — all-time realized + current unrealized, both in display currency */}
        {realizedDisplay != null && (
          <div className="card" style={{ textAlign: 'center', borderLeft: '2px solid var(--accent)' }}>
            <div style={labelStyle}>Overall P&L</div>
            {(() => {
              const overall = realizedDisplay + (unrealizedPnl || 0);
              return (
                <>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--text-mono)', color: pnlColor(overall) }}>
                    {overall === 0 ? '—' : `${overall >= 0 ? '+' : ''}${sym}${Math.abs(overall).toFixed(2)}`}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>realized + unrealized</div>
                </>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
