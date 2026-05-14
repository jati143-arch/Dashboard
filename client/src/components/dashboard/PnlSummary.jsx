import { useCurrency } from '../../context/CurrencyContext.jsx';
import { CUR_SYMBOL, convert } from '../../utils/currency.js';
import CurrencyToggle from '../shared/CurrencyToggle.jsx';

export default function PnlSummary({
  trades, openTrades, allTimePnl, unrealizedPnl, todaysGain,
  openNonMfCount, beforeMarketOpen, overallWins = 0, overallLosses = 0,
  overallWinRate = 0, overallTotal = 0,
}) {
  const { currency, rates } = useCurrency();
  const sym = CUR_SYMBOL[currency] || '₹';

  const nonMfOpen = (openTrades || []).filter(t => t.instrument_type !== 'mutual_fund');
  const portfolioNative = nonMfOpen.length > 0 && nonMfOpen.every(t =>
    t.symbol?.endsWith('.NS') || t.symbol?.endsWith('.BO') ||
    t.symbol?.startsWith('NSE:') || t.symbol?.startsWith('BSE:'),
  ) ? 'INR' : 'USD';

  const realizedDisplay = allTimePnl != null ? convert(allTimePnl, portfolioNative, currency, rates) : null;

  const pnlColor = (v) => v > 0 ? 'text-[var(--color-green)]' : v < 0 ? 'text-[var(--color-red)]' : 'text-[var(--color-text-secondary)]';

  function fmtVal(val) {
    if (val == null || val === 0) return '—';
    return `${val >= 0 ? '+' : ''}${sym}${Math.abs(val).toFixed(0)}`;
  }

  const overall = realizedDisplay != null ? realizedDisplay + (unrealizedPnl || 0) : null;

  return (
    <div className="mb-6">
      <div className="flex justify-end mb-4">
        <CurrencyToggle />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card text-center">
          <div className="text-[10px] tracking-[3px] uppercase text-[var(--color-text-dim)] mb-2 font-mono">REALIZED P&L</div>
          {realizedDisplay == null ? (
            <div className="text-3xl font-light text-[var(--color-text-secondary)] font-mono">—</div>
          ) : (
            <div className={`text-4xl font-light font-mono ${pnlColor(realizedDisplay)} tabular-nums tracking-tighter`}>
              {fmtVal(realizedDisplay)}
            </div>
          )}
          <div className="text-[10px] text-[var(--color-text-dim)] mt-2">all closed trades</div>
        </div>

        <div className="card text-center">
          <div className="text-[10px] tracking-[3px] uppercase text-[var(--color-text-dim)] mb-2 font-mono">UNREALIZED P&L</div>
          {openNonMfCount === 0 ? (
            <div className="text-3xl font-light text-[var(--color-text-secondary)] font-mono">—</div>
          ) : (
            <div className={`text-4xl font-light font-mono ${pnlColor(unrealizedPnl)} tabular-nums tracking-tighter`}>
              {unrealizedPnl >= 0 ? '+' : ''}{sym}{Math.abs(unrealizedPnl).toFixed(0)}
            </div>
          )}
          <div className="text-[10px] text-[var(--color-text-dim)] mt-2">{openNonMfCount} open position{openNonMfCount !== 1 ? 's' : ''}</div>
        </div>

        <div className="card text-center border-l-2 border-[var(--color-yellow)]">
          <div className="text-[10px] tracking-[3px] uppercase text-[var(--color-text-dim)] mb-2 font-mono">TODAY'S GAIN</div>
          {beforeMarketOpen ? (
            <div className="text-3xl font-light text-[var(--color-text-secondary)] font-mono">—</div>
          ) : openNonMfCount === 0 ? (
            <div className="text-3xl font-light text-[var(--color-text-secondary)] font-mono">—</div>
          ) : (
            <div className={`text-4xl font-light font-mono ${pnlColor(todaysGain)} tabular-nums tracking-tighter`}>
              {todaysGain >= 0 ? '+' : ''}{sym}{Math.abs(todaysGain).toFixed(0)}
            </div>
          )}
          <div className="text-[10px] text-[var(--color-text-dim)] mt-2">today's session</div>
        </div>

        <div className="card text-center">
          <div className="text-[10px] tracking-[3px] uppercase text-[var(--color-text-dim)] mb-2 font-mono">TRADES TODAY</div>
          <div className="text-4xl font-light font-mono text-white tabular-nums tracking-tighter">{trades.length}</div>
          <div className="text-[10px] text-[var(--color-text-dim)] mt-2">closed today</div>
        </div>

        <div className="card text-center">
          <div className="text-[10px] tracking-[3px] uppercase text-[var(--color-text-dim)] mb-2 font-mono">WIN RATE</div>
          <div className={`text-4xl font-light font-mono tabular-nums tracking-tighter ${overallWinRate >= 50 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
            {overallTotal > 0 ? `${overallWinRate}%` : '—'}
          </div>
          <div className="text-[10px] text-[var(--color-text-dim)] mt-2">all closed trades</div>
        </div>

        <div className="card text-center border-l-2 border-[var(--color-accent-secondary)]">
          <div className="text-[10px] tracking-[3px] uppercase text-[var(--color-text-dim)] mb-2 font-mono">OVERALL P&L</div>
          {overall != null ? (
            <div className={`text-4xl font-light font-mono tabular-nums tracking-tighter ${pnlColor(overall)}`}>
              {overall === 0 ? '—' : fmtVal(overall)}
            </div>
          ) : (
            <div className="text-3xl font-light font-mono text-[var(--color-text-secondary)]">—</div>
          )}
          <div className="text-[10px] text-[var(--color-text-dim)] mt-2">realized + unrealized</div>
        </div>
      </div>
    </div>
  );
}