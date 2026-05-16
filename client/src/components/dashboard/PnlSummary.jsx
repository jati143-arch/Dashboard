import { useCurrency } from '../../context/CurrencyContext.jsx';
import { CUR_SYMBOL, convert } from '../../utils/currency.js';
import CurrencyToggle from '../shared/CurrencyToggle.jsx';
import { useCountUp } from '../../hooks/useCountUp.js';

function CountedValue({ value, sym, decimals = 0, colorClass, glowDelay = 1.2 }) {
  const counted = useCountUp(value != null ? Math.abs(value) : 0, 1200, decimals);
  if (value == null || value === 0) return <div className="text-3xl font-light text-[var(--color-text-secondary)] font-mono">—</div>;
  return (
    <div
      className={`text-4xl font-light font-mono tabular-nums tracking-tighter ${colorClass}`}
      style={{ animation: `numberGlow 1.8s ease ${glowDelay}s 1` }}
    >
      {value >= 0 ? '+' : '-'}{sym}{counted.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </div>
  );
}

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
  const overall = realizedDisplay != null ? realizedDisplay + (unrealizedPnl || 0) : null;

  const pnlColor = (v) => v > 0 ? 'text-[var(--color-green)]' : v < 0 ? 'text-[var(--color-red)]' : 'text-[var(--color-text-secondary)]';

  const countedWinRate = useCountUp(overallTotal > 0 ? overallWinRate : 0, 1200, 0);
  const countedTradesLen = useCountUp(trades.length, 800, 0);

  return (
    <div className="mb-6">
      <div className="flex justify-end mb-4">
        <CurrencyToggle />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card-glass text-center" style={{ animation: 'glowPulse 2s ease 1.4s 1' }}>
          <div className="text-[10px] tracking-[3px] uppercase text-[var(--color-text-dim)] mb-2 font-mono">REALIZED P&L</div>
          {realizedDisplay == null ? (
            <div className="text-3xl font-light text-[var(--color-text-secondary)] font-mono">—</div>
          ) : (
            <CountedValue value={realizedDisplay} sym={sym} colorClass={pnlColor(realizedDisplay)} glowDelay={1.3} />
          )}
          <div className="text-[10px] text-[var(--color-text-dim)] mt-2">all closed trades</div>
        </div>

        <div className="card-glass text-center" style={{ animation: 'glowPulse 2s ease 1.6s 1' }}>
          <div className="text-[10px] tracking-[3px] uppercase text-[var(--color-text-dim)] mb-2 font-mono">UNREALIZED P&L</div>
          {openNonMfCount === 0 ? (
            <div className="text-3xl font-light text-[var(--color-text-secondary)] font-mono">—</div>
          ) : (
            <CountedValue value={unrealizedPnl} sym={sym} colorClass={pnlColor(unrealizedPnl)} glowDelay={1.5} />
          )}
          <div className="text-[10px] text-[var(--color-text-dim)] mt-2">{openNonMfCount} open position{openNonMfCount !== 1 ? 's' : ''}</div>
        </div>

        <div className="card-glass text-center" style={{ borderLeft: '3px solid var(--color-yellow)', animation: 'glowPulse 2s ease 1.8s 1' }}>
          <div className="text-[10px] tracking-[3px] uppercase text-[var(--color-text-dim)] mb-2 font-mono">TODAY'S GAIN</div>
          {beforeMarketOpen || openNonMfCount === 0 ? (
            <div className="text-3xl font-light text-[var(--color-text-secondary)] font-mono">—</div>
          ) : (
            <CountedValue value={todaysGain} sym={sym} colorClass={pnlColor(todaysGain)} glowDelay={1.7} />
          )}
          <div className="text-[10px] text-[var(--color-text-dim)] mt-2">today's session</div>
        </div>

        <div className="card-glass text-center">
          <div className="text-[10px] tracking-[3px] uppercase text-[var(--color-text-dim)] mb-2 font-mono">TRADES TODAY</div>
          <div className="text-4xl font-light font-mono text-white tabular-nums tracking-tighter">
            {countedTradesLen}
          </div>
          <div className="text-[10px] text-[var(--color-text-dim)] mt-2">closed today</div>
        </div>

        <div className="card-glass text-center">
          <div className="text-[10px] tracking-[3px] uppercase text-[var(--color-text-dim)] mb-2 font-mono">WIN RATE</div>
          <div className={`text-4xl font-light font-mono tabular-nums tracking-tighter ${overallWinRate >= 50 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
            {overallTotal > 0 ? `${countedWinRate}%` : '—'}
          </div>
          <div className="text-[10px] text-[var(--color-text-dim)] mt-2">all closed trades</div>
        </div>

        <div className="card-glass text-center" style={{ borderLeft: '3px solid var(--color-accent-secondary)', animation: 'glowPulse 2s ease 2s 1' }}>
          <div className="text-[10px] tracking-[3px] uppercase text-[var(--color-text-dim)] mb-2 font-mono">OVERALL P&L</div>
          {overall != null ? (
            overall === 0 ? (
              <div className="text-3xl font-light font-mono text-[var(--color-text-secondary)]">—</div>
            ) : (
              <CountedValue value={overall} sym={sym} colorClass={pnlColor(overall)} glowDelay={1.9} />
            )
          ) : (
            <div className="text-3xl font-light font-mono text-[var(--color-text-secondary)]">—</div>
          )}
          <div className="text-[10px] text-[var(--color-text-dim)] mt-2">realized + unrealized</div>
        </div>
      </div>
    </div>
  );
}
