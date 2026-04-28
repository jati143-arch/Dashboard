function nativeCs(symbol, instrumentType) {
  if (instrumentType !== 'crypto' && (symbol.endsWith('.NS') || symbol.endsWith('.BO'))) return '₹';
  return '$';
}

function fmtPnl(value, cs) {
  if (value === 0) return '—';
  return `${value > 0 ? '+' : ''}${cs}${Math.abs(value).toFixed(2)}`;
}

const labelStyle = {
  fontSize: 11,
  color: 'var(--text-dim)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 8,
};

export default function PnlSummary({ trades, allTimePnl, unrealizedPnl, todaysGain, openNonMfCount, beforeMarketOpen }) {
  const wins = trades.filter(t => t.pnl_dollar > 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0;

  // Group closed trades by native currency
  const inrTrades = trades.filter(t => nativeCs(t.symbol, t.instrument_type) === '₹');
  const usdTrades = trades.filter(t => nativeCs(t.symbol, t.instrument_type) === '$');
  const inrTotal = inrTrades.reduce((s, t) => s + (t.pnl_dollar || 0), 0);
  const usdTotal = usdTrades.reduce((s, t) => s + (t.pnl_dollar || 0), 0);
  const isMixed = inrTrades.length > 0 && usdTrades.length > 0;
  const singleCs = inrTrades.length > 0 && usdTrades.length === 0 ? '₹' : '$';
  const singleTotal = singleCs === '₹' ? inrTotal : usdTotal;

  const pnlColor = (c) => c > 0 ? 'var(--green)' : c < 0 ? 'var(--red)' : 'var(--text-secondary)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>

      {/* Realized P&L — today's closed trades; blank before market open */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={labelStyle}>Realized P&L</div>
        {beforeMarketOpen ? (
          <>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--text-secondary)' }}>—</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>Market closed</div>
          </>
        ) : trades.length === 0 ? (
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--text-secondary)' }}>—</div>
        ) : isMixed ? (
          <div style={{ fontFamily: 'var(--text-mono)', fontWeight: 700 }}>
            <div style={{ fontSize: 18, color: pnlColor(inrTotal) }}>{fmtPnl(inrTotal, '₹')}</div>
            <div style={{ fontSize: 18, color: pnlColor(usdTotal) }}>{fmtPnl(usdTotal, '$')}</div>
          </div>
        ) : (
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: pnlColor(singleTotal) }}>
            {fmtPnl(singleTotal, singleCs)}
          </div>
        )}
      </div>

      {/* Unrealized P&L — live open positions */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={labelStyle}>Unrealized P&L</div>
        {openNonMfCount === 0 ? (
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--text-secondary)' }}>—</div>
        ) : (
          <>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--text-mono)', color: pnlColor(unrealizedPnl) }}>
              {unrealizedPnl >= 0 ? '+' : ''}₹{Math.abs(unrealizedPnl).toFixed(0)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
              {openNonMfCount} open position{openNonMfCount !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>

      {/* Today's Gain — daily session gain on open positions */}
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
              {todaysGain >= 0 ? '+' : ''}₹{Math.abs(todaysGain).toFixed(0)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>today's session</div>
          </>
        )}
      </div>

      {/* Trade count */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={labelStyle}>Trades</div>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--text-primary)' }}>{trades.length}</div>
      </div>

      {/* Win Rate */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={labelStyle}>Win Rate</div>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--text-mono)', color: winRate >= 50 ? 'var(--green)' : 'var(--red)' }}>
          {trades.length ? `${winRate}%` : '—'}
        </div>
      </div>

      {/* Wins / Losses */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={labelStyle}>Wins / Losses</div>
        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--text-mono)', color: 'var(--text-primary)', marginTop: 4 }}>
          <span style={{ color: 'var(--green)' }}>{wins}</span>
          <span style={{ color: 'var(--text-dim)', margin: '0 6px' }}>/</span>
          <span style={{ color: 'var(--red)' }}>{trades.length - wins}</span>
        </div>
      </div>

      {/* Overall P&L — realized + unrealized combined */}
      {allTimePnl != null && (() => {
        const overall = (allTimePnl || 0) + (unrealizedPnl || 0);
        return (
          <div className="card" style={{ textAlign: 'center', borderLeft: '2px solid var(--accent)' }}>
            <div style={labelStyle}>Overall P&L</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--text-mono)', color: pnlColor(overall) }}>
              {overall > 0 ? '+' : ''}{overall === 0 ? '—' : `${singleCs}${Math.abs(overall).toFixed(2)}`}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>realized + unrealized</div>
          </div>
        );
      })()}
    </div>
  );
}
