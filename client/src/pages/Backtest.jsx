import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { backtestApi } from '../api/client.js';
import TickerInput from '../components/trades/TickerInput.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

const today = () => new Date().toISOString().slice(0, 10);
const twoYearsAgo = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 2); return d.toISOString().slice(0, 10); };

const STRATEGIES = [
  { value: 'ema_cross',    label: 'EMA 9/20 Crossover',       desc: 'Buy when 9 EMA crosses above 20 EMA, sell on cross below' },
  { value: 'rsi_pullback', label: 'RSI Pullback in Uptrend',   desc: 'Buy RSI bounce above 45 when price is above 50 SMA' },
  { value: 'breakout_vol', label: 'Breakout + Volume',         desc: 'Buy 20-bar high breakout with volume > 1.5× average' },
  { value: 'macd_cross',   label: 'MACD Crossover',            desc: 'Buy when MACD line crosses above signal, sell on cross below' },
  { value: 'bb_squeeze',   label: 'Bollinger Band Squeeze',    desc: 'Buy when price breaks above upper BB, sell below middle' },
  { value: 'sma200_trend', label: '200 SMA Trend Filter',      desc: 'Buy 9/20 EMA crossover only when above 200 SMA' },
  { value: 'vwap_reclaim',       label: 'VWAP Reclaim',                        desc: 'Buy when price crosses above VWAP, sell on cross below' },
  { value: 'composite_signal',  label: 'Composite: EMA + RSI + MACD + Vol',   desc: 'Buy when composite score ≥ 3, exit on score ≤ -2 or ATR stop loss' },
];

const TIMEFRAMES = [
  { value: '5m',  label: '5 Min',    note: 'Yahoo Finance: last 60 days only' },
  { value: '15m', label: '15 Min',   note: 'Yahoo Finance: last 60 days only' },
  { value: '30m', label: '30 Min',   note: 'Yahoo Finance: last 60 days only' },
  { value: '1h',  label: '1 Hour',   note: 'Yahoo Finance: last 365 days only' },
  { value: '1d',  label: 'Daily',    note: '' },
  { value: '1wk', label: 'Weekly',   note: '' },
];

const INTRADAY = ['5m', '15m', '30m', '1h'];

const STAT_COLOR = v => v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text-secondary)';

export default function Backtest() {
  const [symbol, setSymbol] = useState('');
  const [form, setForm] = useState({
    strategy: 'ema_cross',
    timeframe: '1d',
    from: twoYearsAgo(),
    to: today(),
  });
  const [result, setResult] = useState(null);

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => backtestApi.run(symbol.trim().toUpperCase(), form.strategy, form.from, form.to, form.timeframe),
    onSuccess: data => setResult(data),
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const isIntraday = INTRADAY.includes(form.timeframe);
  const tfInfo = TIMEFRAMES.find(t => t.value === form.timeframe);
  const stats = result?.stats;
  const trades = result?.trades ?? [];
  const curve  = result?.equityCurve ?? [];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Strategy Backtester</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Test strategies against historical data · Results are historical, not a guarantee</div>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div>
            <label>Symbol</label>
            <TickerInput
              value={symbol}
              onChange={setSymbol}
              onSelect={(sym) => setSymbol(sym)}
            />
          </div>
          <div>
            <label>Strategy</label>
            <select value={form.strategy} onChange={e => set('strategy', e.target.value)}>
              {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label>Timeframe</label>
            <select value={form.timeframe} onChange={e => { set('timeframe', e.target.value); setResult(null); }}>
              {TIMEFRAMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {!isIntraday && (
            <>
              <div>
                <label>From</label>
                <input type="date" value={form.from} onChange={e => set('from', e.target.value)} />
              </div>
              <div>
                <label>To</label>
                <input type="date" value={form.to} onChange={e => set('to', e.target.value)} />
              </div>
            </>
          )}
        </div>

        {isIntraday && tfInfo?.note && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#1a1200', border: '1px solid #3a2a00', borderRadius: 6, fontSize: 12, color: '#ccaa44' }}>
            ⚠ {tfInfo.note} — date pickers are disabled for intraday timeframes
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn-primary"
            onClick={() => mutate()}
            disabled={isPending || !symbol.trim()}
            style={{ padding: '8px 24px' }}
          >
            {isPending ? '⟳ Running…' : '▶ Run Backtest'}
          </button>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {STRATEGIES.find(s => s.value === form.strategy)?.desc}
          </div>
        </div>
        {error && (
          <div style={{ marginTop: 10, color: 'var(--red)', fontSize: 12 }}>
            {error.response?.data?.error || error.message}
          </div>
        )}
      </div>

      {stats && (
        <>
          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Win Rate',      value: `${stats.winRate}%`,         color: stats.winRate >= 50 ? 'var(--green)' : 'var(--red)' },
              { label: 'Total Trades',  value: stats.totalTrades,            color: 'var(--text-primary)' },
              { label: 'Wins / Losses', value: `${stats.wins} / ${stats.losses}`, color: 'var(--text-primary)' },
              { label: 'Avg Win',       value: `+${stats.avgWinPct}%`,      color: 'var(--green)' },
              { label: 'Avg Loss',      value: `${stats.avgLossPct}%`,      color: 'var(--red)' },
              { label: 'Profit Factor', value: stats.profitFactor ?? '—',   color: (stats.profitFactor ?? 0) >= 1.5 ? 'var(--green)' : 'var(--red)' },
              { label: 'Max Drawdown',  value: `-${stats.maxDrawdownPct}%`, color: 'var(--red)' },
              { label: 'Final Equity',  value: `${stats.finalEquity}`,      color: STAT_COLOR(stats.finalEquity - 100) },
            ].map(({ label, value, color }) => (
              <div key={label} className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 20, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Equity curve */}
          {curve.length > 1 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Equity Curve (₹100 starting capital)
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={curve} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                  <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={d => d.slice(0, 10).slice(5)} />
                  <YAxis tick={{ fill: '#888', fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6 }}
                    labelStyle={{ color: '#888' }}
                    formatter={v => [`${v.toFixed(1)}`, 'Equity']}
                  />
                  <ReferenceLine y={100} stroke="#444" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="value" stroke="#00aaff" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Trade list */}
          {trades.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Trade List ({trades.length} trades)
                </span>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: 340, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Entry</th>
                      <th>Exit</th>
                      <th>Entry Price</th>
                      <th>Exit Price</th>
                      <th>P&L</th>
                      <th>P&L %</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>{i + 1}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{t.entryDate}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{t.exitDate}</td>
                        <td className="mono">{t.entryPrice}</td>
                        <td className="mono">{t.exitPrice}</td>
                        <td className="mono" style={{ color: t.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {t.pnl >= 0 ? '+' : ''}{t.pnl}
                        </td>
                        <td className="mono" style={{ color: t.pnlPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {t.pnlPct >= 0 ? '+' : ''}{t.pnlPct}%
                        </td>
                        <td>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3,
                            background: t.win ? '#00ff8822' : '#ff335522',
                            color: t.win ? 'var(--green)' : 'var(--red)',
                          }}>{t.win ? 'WIN' : 'LOSS'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!stats && !isPending && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⊕</div>
          <div style={{ fontSize: 14 }}>Enter a symbol, select a strategy and timeframe, then click Run Backtest</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Supports NSE (.NS), US stocks, crypto · 8 strategies available</div>
        </div>
      )}
    </div>
  );
}
