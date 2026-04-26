import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { backtestApi } from '../api/client.js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

const today = () => new Date().toISOString().slice(0, 10);
const twoYearsAgo = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 2); return d.toISOString().slice(0, 10); };

const STRATEGIES = [
  { value: 'ema_cross',      label: 'EMA 9/20 Crossover',     desc: 'Buy when 9 EMA crosses above 20 EMA, sell on cross below' },
  { value: 'rsi_pullback',   label: 'RSI Pullback in Uptrend', desc: 'Buy RSI bounce above 45 when price is above 50 SMA' },
  { value: 'breakout_vol',   label: 'Breakout + Volume',       desc: 'Buy 20-bar high breakout with volume > 1.5× average' },
];

const STAT_COLOR = v => v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text-secondary)';

export default function Backtest() {
  const [form, setForm] = useState({
    symbol: '', strategy: 'ema_cross',
    from: twoYearsAgo(), to: today(),
  });
  const [result, setResult] = useState(null);

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => backtestApi.run(form.symbol.trim().toUpperCase(), form.strategy, form.from, form.to),
    onSuccess: data => setResult(data),
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

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
            <input
              type="text"
              value={form.symbol}
              onChange={e => set('symbol', e.target.value)}
              placeholder="e.g. RELIANCE.NS or AAPL"
              style={{ textTransform: 'uppercase' }}
            />
          </div>
          <div>
            <label>Strategy</label>
            <select value={form.strategy} onChange={e => set('strategy', e.target.value)}>
              {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label>From</label>
            <input type="date" value={form.from} onChange={e => set('from', e.target.value)} />
          </div>
          <div>
            <label>To</label>
            <input type="date" value={form.to} onChange={e => set('to', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn-primary"
            onClick={() => mutate()}
            disabled={isPending || !form.symbol.trim()}
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
              { label: 'Win Rate',       value: `${stats.winRate}%`,        color: stats.winRate >= 50 ? 'var(--green)' : 'var(--red)' },
              { label: 'Total Trades',   value: stats.totalTrades,           color: 'var(--text-primary)' },
              { label: 'Wins / Losses',  value: `${stats.wins} / ${stats.losses}`, color: 'var(--text-primary)' },
              { label: 'Avg Win',        value: `+${stats.avgWinPct}%`,     color: 'var(--green)' },
              { label: 'Avg Loss',       value: `${stats.avgLossPct}%`,     color: 'var(--red)' },
              { label: 'Profit Factor',  value: stats.profitFactor ?? '—',  color: (stats.profitFactor ?? 0) >= 1.5 ? 'var(--green)' : 'var(--red)' },
              { label: 'Max Drawdown',   value: `-${stats.maxDrawdownPct}%`, color: 'var(--red)' },
              { label: 'Final Equity',   value: `${stats.finalEquity}`,     color: STAT_COLOR(stats.finalEquity - 100) },
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
                  <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
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
                      <th>Entry Date</th>
                      <th>Exit Date</th>
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
          <div style={{ fontSize: 14 }}>Enter a symbol, select a strategy, and click Run Backtest</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Supports NSE (.NS), US stocks, crypto</div>
        </div>
      )}
    </div>
  );
}
