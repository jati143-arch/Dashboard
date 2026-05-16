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

const CARD = {
  background: '#111111',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 24,
  padding: 28,
};

const TEXT_DIM = '#52525b';
const TEXT_SECONDARY = '#71717a';
const TEXT_PRIMARY = '#ffffff';
const GREEN = '#22ff88';
const RED = '#ff4444';
const CYAN = '#00d4ff';

const PILL_BTN = {
  padding: '10px 24px',
  borderRadius: 9999,
  border: '1px solid rgba(255,255,255,0.06)',
  background: '#111111',
  color: TEXT_SECONDARY,
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontWeight: 500,
};

const PILL_BTN_ACTIVE = {
  ...PILL_BTN,
  background: '#ffffff',
  color: '#000000',
  border: '1px solid #ffffff',
};

const STAT_COLOR = v => v > 0 ? GREEN : v < 0 ? RED : TEXT_SECONDARY;

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
    <div style={{ animation: 'fadeSlideUp 0.45s ease both' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 6, fontFamily: 'Inter, system-ui, sans-serif' }}>Strategy Backtester</div>
        <div style={{ fontSize: 13, color: TEXT_SECONDARY, fontFamily: 'Inter, system-ui, sans-serif' }}>Test strategies against historical data · Results are historical, not a guarantee</div>
      </div>

      <div style={CARD}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>Symbol</label>
            <TickerInput
              value={symbol}
              onChange={setSymbol}
              onSelect={(sym) => setSymbol(sym)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>Strategy</label>
            <select value={form.strategy} onChange={e => set('strategy', e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, color: TEXT_PRIMARY, fontSize: 13 }}>
              {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>Timeframe</label>
            <select value={form.timeframe} onChange={e => { set('timeframe', e.target.value); setResult(null); }} style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, color: TEXT_PRIMARY, fontSize: 13 }}>
              {TIMEFRAMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {!isIntraday && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>From</label>
                <input type="date" value={form.from} onChange={e => set('from', e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, color: TEXT_PRIMARY, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>To</label>
                <input type="date" value={form.to} onChange={e => set('to', e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, color: TEXT_PRIMARY, fontSize: 13 }} />
              </div>
            </>
          )}
        </div>

        {isIntraday && tfInfo?.note && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#1a1200', border: '1px solid #3a2a00', borderRadius: 12, fontSize: 13, color: '#ccaa44', fontFamily: 'Inter, system-ui, sans-serif' }}>
            ⚠ {tfInfo.note} — date pickers are disabled for intraday timeframes
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            style={{ ...PILL_BTN_ACTIVE, opacity: (isPending || !symbol.trim()) ? 0.5 : 1 }}
            onClick={() => mutate()}
            disabled={isPending || !symbol.trim()}
          >
            {isPending ? '⟳ Running…' : '▶ Run Backtest'}
          </button>
          <div style={{ fontSize: 13, color: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif' }}>
            {STRATEGIES.find(s => s.value === form.strategy)?.desc}
          </div>
        </div>
        {error && (
          <div style={{ marginTop: 12, color: RED, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}>
            {error.response?.data?.error || error.message}
          </div>
        )}
      </div>

      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Win Rate',      value: `${stats.winRate}%`,         color: stats.winRate >= 50 ? GREEN : RED },
              { label: 'Total Trades',  value: stats.totalTrades,            color: TEXT_PRIMARY },
              { label: 'Wins / Losses', value: `${stats.wins} / ${stats.losses}`, color: TEXT_PRIMARY },
              { label: 'Avg Win',       value: `+${stats.avgWinPct}%`,      color: GREEN },
              { label: 'Avg Loss',      value: `${stats.avgLossPct}%`,      color: RED },
              { label: 'Profit Factor', value: stats.profitFactor ?? '—',   color: (stats.profitFactor ?? 0) >= 1.5 ? GREEN : RED },
              { label: 'Max Drawdown',  value: `-${stats.maxDrawdownPct}%`, color: RED },
              { label: 'Final Equity',  value: `${stats.finalEquity}`,      color: STAT_COLOR(stats.finalEquity - 100) },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ ...CARD, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>{label}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 24, color }}>{value}</div>
              </div>
            ))}
          </div>

          {curve.length > 1 && (
            <div style={{ ...CARD, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
                Equity Curve (₹100 starting capital)
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={curve} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                  <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 10 }} tickFormatter={d => d.slice(0, 10).slice(5)} />
                  <YAxis tick={{ fill: '#666', fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                    labelStyle={{ color: '#666' }}
                    formatter={v => [`${v.toFixed(1)}`, 'Equity']}
                  />
                  <ReferenceLine y={100} stroke="#333" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="value" stroke={CYAN} dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {trades.length > 0 && (
            <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Inter, system-ui, sans-serif' }}>
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
                        <td style={{ color: TEXT_DIM, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</td>
                        <td style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{t.entryDate}</td>
                        <td style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{t.exitDate}</td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{t.entryPrice}</td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{t.exitPrice}</td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", color: t.pnl >= 0 ? GREEN : RED }}>
                          {t.pnl >= 0 ? '+' : ''}{t.pnl}
                        </td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", color: t.pnlPct >= 0 ? GREEN : RED }}>
                          {t.pnlPct >= 0 ? '+' : ''}{t.pnlPct}%
                        </td>
                        <td>
                          <span style={{ fontSize: 10, padding: '4px 10px', borderRadius: 9999,
                            background: t.win ? 'rgba(34,255,136,0.12)' : 'rgba(255,68,68,0.12)',
                            color: t.win ? GREEN : RED, fontWeight: 600,
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
        <div style={{ ...CARD, textAlign: 'center', padding: '64px 32px', color: TEXT_DIM }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⊕</div>
          <div style={{ fontSize: 15, fontFamily: 'Inter, system-ui, sans-serif', color: TEXT_SECONDARY }}>Enter a symbol, select a strategy and timeframe, then click Run Backtest</div>
          <div style={{ fontSize: 13, marginTop: 8, fontFamily: 'Inter, system-ui, sans-serif' }}>Supports NSE (.NS), US stocks, crypto · 8 strategies available</div>
        </div>
      )}
    </div>
  );
}