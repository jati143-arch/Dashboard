import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, createSeriesMarkers, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import { signalsApi, searchApi, chartApi } from '../../api/client.js';
import { speakSignal } from '../../utils/speakSignal.js';
import { toTvSymbol, tvTimezone } from '../../utils/tvSymbol.js';

// ── Signal colour palette ─────────────────────────────────────────────────────
const SIG_STYLE = {
  'STRONG BUY':  { bg: 'rgba(0,255,136,0.15)', color: '#00ff88', border: 'rgba(0,255,136,0.4)' },
  'BUY':         { bg: 'rgba(0,220,100,0.12)',  color: '#00dc64', border: 'rgba(0,220,100,0.35)' },
  'WEAK BUY':    { bg: 'rgba(80,200,120,0.1)',  color: '#50c878', border: 'rgba(80,200,120,0.3)' },
  'NEUTRAL':     { bg: 'rgba(120,120,120,0.1)', color: '#aaa',    border: 'rgba(150,150,150,0.3)' },
  'WEAK SELL':   { bg: 'rgba(255,120,80,0.1)',  color: '#ff7850', border: 'rgba(255,120,80,0.3)' },
  'SELL':        { bg: 'rgba(255,80,60,0.12)',  color: '#ff503c', border: 'rgba(255,80,60,0.35)' },
  'STRONG SELL': { bg: 'rgba(255,51,85,0.15)',  color: '#ff3355', border: 'rgba(255,51,85,0.4)' },
};

// ── Client-side indicator math (mirrors server signals.js / backtest.js) ──────

function indEMA(closes, period) {
  const k = 2 / (period + 1);
  const out = Array(closes.length).fill(null);
  let seed = 0, count = 0;
  for (let i = 0; i < closes.length; i++) {
    if (closes[i] == null) continue;
    seed += closes[i]; count++;
    if (count === period) {
      out[i] = seed / period;
      for (let j = i + 1; j < closes.length; j++) {
        if (closes[j] == null) { out[j] = null; continue; }
        out[j] = closes[j] * k + out[j - 1] * (1 - k);
      }
      break;
    }
  }
  return out;
}

function indSMA(closes, period) {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    return closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}

function indBB(closes, period, stdDev) {
  const sma = indSMA(closes, period);
  return closes.map((_, i) => {
    if (i < period - 1 || sma[i] == null) return { upper: null, mid: null, lower: null };
    const slice = closes.slice(i - period + 1, i + 1);
    const variance = slice.reduce((s, v) => s + (v - sma[i]) ** 2, 0) / period;
    const sd = Math.sqrt(variance) * stdDev;
    return { upper: sma[i] + sd, mid: sma[i], lower: sma[i] - sd };
  });
}

function indRSI(closes, period) {
  const out = Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function indMACD(closes, fast, slow, sigPeriod) {
  const emaFast = indEMA(closes, fast);
  const emaSlow = indEMA(closes, slow);
  const macd = closes.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null,
  );
  const start = macd.findIndex(v => v !== null);
  if (start < 0) return { macd, signal: macd.map(() => null), histogram: macd.map(() => null) };
  const sigSlice = indEMA(macd.slice(start), sigPeriod);
  const signal = [...Array(start).fill(null), ...sigSlice];
  const histogram = macd.map((v, i) => v != null && signal[i] != null ? v - signal[i] : null);
  return { macd, signal, histogram };
}

function indATR(candles, period) {
  const tr = candles.map((c, i) => {
    const prev = i > 0 ? candles[i - 1].close : c.close;
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
  });
  const out = Array(tr.length).fill(null);
  if (tr.length < period) return out;
  out[period - 1] = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < tr.length; i++) {
    out[i] = (out[i - 1] * (period - 1) + tr[i]) / period;
  }
  return out;
}

// Convert signalStartDate (YYYY-MM-DD string) to the chart's time format
function signalDateToChartTime(dateStr, sampleTime) {
  if (typeof sampleTime === 'number') {
    // Intraday: unix seconds
    return Math.floor(new Date(dateStr + 'T00:00:00Z').getTime() / 1000);
  }
  return dateStr; // Daily/weekly: already a date string
}

function fmtNum(v, dec = 2) { return v != null ? Number(v).toFixed(dec) : '—'; }
function fmtVol(v) {
  if (v == null) return '—';
  if (v >= 1e7) return (v / 1e7).toFixed(1) + 'Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(1) + 'L';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(v);
}

// ── Small helper components ──────────────────────────────────────────────────

function ScoreBar({ score, max = 8 }) {
  const pct = Math.round(((score + max) / (max * 2)) * 100);
  const color = score > 2 ? '#00ff88' : score < -2 ? '#ff3355' : '#ffd700';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
        {score > 0 ? '+' : ''}{score} / {max}
      </span>
    </div>
  );
}

function SectionToggle({ label, open, onToggle }) {
  return (
    <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 0', userSelect: 'none' }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{open ? '▼' : '▶'}</span>
    </div>
  );
}

// Indicator toggle pill: colored dot + label + optional period input
function IndToggle({ id, label, active, color, period, onToggle, onPeriod, extraPeriods }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: active ? 'rgba(255,255,255,0.06)' : 'none', border: `1px solid ${active ? color : 'var(--border)'}`, borderRadius: 4, padding: '2px 6px', cursor: 'pointer', userSelect: 'none' }}
      onClick={onToggle}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? color : 'var(--text-dim)', flexShrink: 0, display: 'inline-block' }} />
      <span style={{ fontSize: 10, color: active ? color : 'var(--text-dim)', fontWeight: active ? 600 : 400 }}>{label}</span>
      {active && onPeriod && (
        <input
          type="number" min={2} max={500}
          value={period}
          onChange={e => onPeriod(Math.max(2, Math.min(500, +e.target.value)))}
          onClick={e => e.stopPropagation()}
          style={{ width: 36, fontSize: 10, padding: '0 3px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-primary)', textAlign: 'center' }}
        />
      )}
      {active && extraPeriods && extraPeriods}
    </div>
  );
}

// ── Signal Panel (below chart) ───────────────────────────────────────────────

function SignalPanel({ symbol }) {
  const [open, setOpen] = useState(true);
  const [showReasons, setShowReasons] = useState(true);
  const [showSLTargets, setShowSLTargets] = useState(true);
  const [showIndicators, setShowIndicators] = useState(true);
  const [showSmartMoney, setShowSmartMoney] = useState(true);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['signals', symbol],
    queryFn: () => signalsApi.get(symbol),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const s = SIG_STYLE[data?.signal] || SIG_STYLE['NEUTRAL'];
  const hasLux = data?.lux && (data.lux.sfp || data.lux.bsl || data.lux.ssl || data.lux.bullOB || data.lux.bearOB);

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', cursor: 'pointer', userSelect: 'none' }}>
        <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>◈ Signal Analysis</span>
          {data && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
              {data.signal}
            </span>
          )}
          {isLoading && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Analysing…</span>}
          {isError && <span style={{ fontSize: 11, color: 'var(--red)' }}>Failed to load</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {data && (
            <button onClick={e => { e.stopPropagation(); speakSignal(data, symbol); }} title="Read signal aloud"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-dim)', padding: '2px 4px', lineHeight: 1 }}>🔊</button>
          )}
          <span onClick={() => setOpen(o => !o)} style={{ fontSize: 12, color: 'var(--text-dim)' }}>{open ? '▼' : '▲'}</span>
        </div>
      </div>

      {open && data && (
        <div style={{ padding: '0 16px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* LEFT */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--text-mono)', fontSize: 20, fontWeight: 700, color: s.color }}>{data.signal}</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Confidence: {data.confidence}</span>
            </div>
            <ScoreBar score={data.score} max={data.maxScore} />

            <div style={{ marginTop: 8 }}>
              <SectionToggle label="Reasons" open={showReasons} onToggle={() => setShowReasons(o => !o)} />
              {showReasons && (
                <div style={{ marginTop: 4 }}>
                  {data.reasons.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      <span style={{ color: data.isBuy ? '#00ff88' : '#ff3355', flexShrink: 0 }}>{data.isBuy ? '✓' : '✗'}</span>
                      <span>{r}</span>
                    </div>
                  ))}
                  {data.risks.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Risks / Counter</div>
                      {data.risks.slice(0, 2).map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          <span style={{ color: '#ffd700', flexShrink: 0 }}>⚠</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {hasLux && (
              <div style={{ marginTop: 10 }}>
                <SectionToggle label="◈ Smart Money" open={showSmartMoney} onToggle={() => setShowSmartMoney(o => !o)} />
                {showSmartMoney && (
                  <div style={{ marginTop: 4, padding: '6px 8px', background: 'var(--bg-base)', borderRadius: 5, fontSize: 11 }}>
                    {data.lux.sfp && <div style={{ color: data.lux.sfp === 'bullish' ? '#00ff88' : '#ff3355', marginBottom: 3 }}>SFP: {data.lux.sfp} — stop hunt detected</div>}
                    {data.lux.bsl && <div style={{ color: '#ff7850', marginBottom: 3 }}>BSL (equal highs): {data.lux.bsl}</div>}
                    {data.lux.ssl && <div style={{ color: '#00ccff', marginBottom: 3 }}>SSL (equal lows): {data.lux.ssl}</div>}
                    {data.lux.bullOB && <div style={{ color: '#00ff88', marginBottom: 3 }}>Bull OB: {data.lux.bullOB.bottom}–{data.lux.bullOB.top}</div>}
                    {data.lux.bearOB && <div style={{ color: '#ff3355' }}>Bear OB: {data.lux.bearOB.bottom}–{data.lux.bearOB.top}</div>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div>
            <SectionToggle label="SL & Targets" open={showSLTargets} onToggle={() => setShowSLTargets(o => !o)} />
            {showSLTargets && (
              <>
                {data.entryType && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8, marginTop: 4 }}>
                    <div style={{ background: 'var(--bg-base)', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Entry Type</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: data.entryType.includes('Breakout') || data.entryType.includes('Breakdown') || data.entryType.includes('Enter Now') ? '#00ff88' : data.entryType.includes('Market') ? '#aaa' : '#ffd700' }}>
                        {data.entryType}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Suggested Entry</div>
                      <div style={{ fontFamily: 'var(--text-mono)', fontSize: 13, fontWeight: 700, color: '#ffd700' }}>{data.suggestedEntry}</div>
                    </div>
                    <div style={{ background: 'var(--bg-base)', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Position Size</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: data.positionSize === 'Full' ? '#00ff88' : data.positionSize?.includes('75') ? '#00ccff' : '#ffd700' }}>
                        {data.positionSize}
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8, marginTop: 4 }}>
                  <div style={{ background: 'var(--bg-base)', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Current Price</div>
                    <div style={{ fontFamily: 'var(--text-mono)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{data.price}</div>
                  </div>
                  <div style={{ background: 'rgba(255,51,85,0.08)', border: '1px solid rgba(255,51,85,0.2)', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Stop Loss</div>
                    <div style={{ fontFamily: 'var(--text-mono)', fontSize: 14, fontWeight: 700, color: '#ff3355' }}>
                      {data.sl} <span style={{ fontSize: 10, opacity: 0.8 }}>({data.slPct}%)</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                  {data.targets.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 5, padding: '5px 10px' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.label}</span>
                      <span style={{ fontFamily: 'var(--text-mono)', fontSize: 12, fontWeight: 600, color: '#00ff88' }}>
                        {t.price} <span style={{ fontSize: 10, opacity: 0.8 }}>(+{t.pct}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <SectionToggle label="Indicators" open={showIndicators} onToggle={() => setShowIndicators(o => !o)} />
            {showIndicators && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 4 }}>
                {[
                  { label: 'EMA 9',  val: data.indicators.ema9  },
                  { label: 'EMA 20', val: data.indicators.ema20 },
                  { label: 'SMA 50', val: data.indicators.sma50 },
                  { label: 'RSI 14', val: data.indicators.rsi, color: data.indicators.rsi > 70 ? '#ff3355' : data.indicators.rsi < 30 ? '#ffd700' : '#00ff88' },
                  { label: 'ATR 14', val: data.indicators.atr  },
                  { label: 'Vol ×',  val: data.indicators.volRatio, decimals: 1 },
                ].map(({ label, val, color, decimals = 2 }) => (
                  <div key={label} style={{ background: 'var(--bg-base)', borderRadius: 5, padding: '5px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--text-mono)', fontSize: 11, fontWeight: 600, color: color || 'var(--text-primary)', marginTop: 2 }}>
                      {val != null ? Number(val).toFixed(decimals) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Timeframe options ─────────────────────────────────────────────────────────

const INTRADAY_OPTIONS = [
  { value: '1m',  label: '1m'  },
  { value: '5m',  label: '5m'  },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h',  label: '1h'  },
  { value: '2h',  label: '2h'  },
  { value: '4h',  label: '4h'  },
];

const CANDLE_OPTIONS = [
  { value: 'D', label: '1D' },
  { value: 'W', label: '1W' },
  { value: 'M', label: '1M' },
];

const DATE_ONLY_RANGES = new Set(['D', 'W', 'M']);

// ── Lightweight Charts fallback ───────────────────────────────────────────────

function LightweightChart({ symbol, entryPrice }) {
  const mainContainerRef = useRef(null);
  const rsiContainerRef  = useRef(null);
  const macdContainerRef = useRef(null);
  const mainChartRef     = useRef(null);
  const rsiChartRef      = useRef(null);
  const macdChartRef     = useRef(null);
  const candleSeriesRef  = useRef(null);

  const [range, setRange] = useState('D');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  const [ind, setInd] = useState({
    ema1: true, ema2: true, sma: true, bb: false, volume: true, rsi: false, macd: false,
  });
  const [per, setPer] = useState({
    ema1: 9, ema2: 20, sma: 50, bb: 20, bbStd: 2.0, rsi: 14,
    macdFast: 12, macdSlow: 26, macdSig: 9,
  });

  const [ohlcInfo, setOhlcInfo] = useState(null);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const { data: candles = [], isLoading, isError } = useQuery({
    queryKey: ['ohlcv', symbol, range],
    queryFn: () => chartApi.ohlcv(symbol, range),
    staleTime: 5 * 60_000,
  });

  const { data: sig } = useQuery({
    queryKey: ['signals', symbol],
    queryFn: () => signalsApi.get(symbol),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  // ── Main chart ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mainContainerRef.current;
    if (!el || !candles.length) return;

    if (mainChartRef.current) { mainChartRef.current.remove(); mainChartRef.current = null; }

    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { color: '#141414' }, textColor: '#c0c0c0' },
      grid: { vertLines: { color: '#1e1e1e' }, horzLines: { color: '#1e1e1e' } },
      timeScale: { borderColor: '#2a2a2a', timeVisible: !DATE_ONLY_RANGES.has(range) },
      rightPriceScale: { borderColor: '#2a2a2a' },
      crosshair: { mode: 1 },
    });
    mainChartRef.current = chart;

    const closes  = candles.map(c => c.close);
    const lastIdx = candles.length - 1;
    const lastCandle = candles[lastIdx];

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00ff88', downColor: '#ff3355',
      borderUpColor: '#00ff88', borderDownColor: '#ff3355',
      wickUpColor: '#00ff88', wickDownColor: '#ff3355',
    });
    candleSeries.setData(candles);
    candleSeriesRef.current = candleSeries;

    // Volume histogram — bottom 15% of main pane, hidden scale
    if (ind.volume) {
      const volSeries = chart.addSeries(HistogramSeries, {
        priceScaleId: 'vol',
        color: 'rgba(150,150,150,0.25)',
      });
      volSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
        visible: false,
      });
      volSeries.setData(candles.map(c => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(0,255,136,0.2)' : 'rgba(255,51,85,0.2)',
      })));
    }

    // EMA / SMA / BB lines
    if (ind.ema1) {
      const ema1 = indEMA(closes, per.ema1);
      const s = chart.addSeries(LineSeries, { color: '#00aaff', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: `EMA${per.ema1}` });
      s.setData(candles.map((c, i) => ema1[i] != null ? { time: c.time, value: ema1[i] } : null).filter(Boolean));
    }
    if (ind.ema2) {
      const ema2 = indEMA(closes, per.ema2);
      const s = chart.addSeries(LineSeries, { color: '#ff9500', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: `EMA${per.ema2}` });
      s.setData(candles.map((c, i) => ema2[i] != null ? { time: c.time, value: ema2[i] } : null).filter(Boolean));
    }
    if (ind.sma) {
      const sma = indSMA(closes, per.sma);
      const s = chart.addSeries(LineSeries, { color: '#cc88ff', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: `SMA${per.sma}` });
      s.setData(candles.map((c, i) => sma[i] != null ? { time: c.time, value: sma[i] } : null).filter(Boolean));
    }
    if (ind.bb) {
      const bb = indBB(closes, per.bb, per.bbStd);
      const opts = { lineWidth: 1, priceLineVisible: false, lastValueVisible: false };
      const upper = chart.addSeries(LineSeries, { ...opts, color: 'rgba(150,150,255,0.7)', title: 'BB+' });
      const mid   = chart.addSeries(LineSeries, { ...opts, color: 'rgba(150,150,255,0.4)', lineStyle: 1, title: '' });
      const lower = chart.addSeries(LineSeries, { ...opts, color: 'rgba(150,150,255,0.7)', title: 'BB-' });
      const toData = key => candles.map((c, i) => bb[i][key] != null ? { time: c.time, value: bb[i][key] } : null).filter(Boolean);
      upper.setData(toData('upper'));
      mid.setData(toData('mid'));
      lower.setData(toData('lower'));
    }

    // ── Signal marker + line ─────────────────────────────────────────────────
    if (sig) {
      // Arrow marker on the last candle (where signal is computed from)
      if (sig.signal !== 'NEUTRAL') {
        createSeriesMarkers(candleSeries, [{
          time: lastCandle.time,
          position: sig.isBuy ? 'belowBar' : 'aboveBar',
          color: sig.isBuy ? '#00ff88' : '#ff3355',
          shape: sig.isBuy ? 'arrowUp' : 'arrowDown',
          text: sig.entryType || sig.signal,
          size: 1,
        }]);
      }

      // Suggested entry line from signalStartDate → last candle
      if (sig.suggestedEntry && sig.signalStartDate && !entryPrice) {
        const sampleTime = candles[0]?.time;
        const startTime = signalDateToChartTime(sig.signalStartDate, sampleTime);
        // Find the first candle at or after startTime
        const startCandle = candles.find(c =>
          typeof c.time === 'number' ? c.time >= startTime : c.time >= sig.signalStartDate
        ) || lastCandle;
        if (startCandle.time !== lastCandle.time) {
          const entryLine = chart.addSeries(LineSeries, {
            color: '#ffd700', lineWidth: 2, priceLineVisible: false, lastValueVisible: true,
            title: `▶ ${sig.entryType}`,
          });
          entryLine.setData([
            { time: startCandle.time, value: sig.suggestedEntry },
            { time: lastCandle.time,  value: sig.suggestedEntry },
          ]);
        } else {
          // Signal just fired — draw as price line
          candleSeries.createPriceLine({ price: sig.suggestedEntry, color: '#ffd700', lineWidth: 2, lineStyle: 0, title: `▶ ${sig.entryType}` });
        }
      }

      // SL and targets
      if (entryPrice != null) {
        // User is in a position — show Trail SL + hard SL
        const atrArr = indATR(candles, 14);
        const lastATR = atrArr[lastIdx] || lastCandle.close * 0.02;
        const isLong = entryPrice < lastCandle.close;
        const trailSL = isLong
          ? +(lastCandle.close - 2 * lastATR).toFixed(2)
          : +(lastCandle.close + 2 * lastATR).toFixed(2);

        candleSeries.createPriceLine({ price: trailSL, color: '#ff9500', lineWidth: 2, lineStyle: 1, title: 'Trail SL' });
        if (sig.sl) candleSeries.createPriceLine({ price: sig.sl, color: '#ff3355', lineWidth: 1, lineStyle: 2, title: 'SL' });

        // Trade entry line
        candleSeries.createPriceLine({ price: entryPrice, color: '#00ccff', lineWidth: 2, lineStyle: 0, title: 'Your Entry' });
      } else {
        // Not in a trade — show SL + targets
        if (sig.sl) candleSeries.createPriceLine({ price: sig.sl, color: '#ff3355', lineWidth: 1, lineStyle: 2, title: `SL  −${sig.slPct}%` });
        (sig.targets || []).forEach(t => candleSeries.createPriceLine({ price: t.price, color: '#00ff88', lineWidth: 1, lineStyle: 2, title: t.label }));
      }
    } else if (entryPrice != null) {
      // No signal yet but we have an entry price
      candleSeries.createPriceLine({ price: entryPrice, color: '#00ccff', lineWidth: 2, lineStyle: 0, title: 'Your Entry' });
    }

    // ── OHLC crosshair subscription ─────────────────────────────────────────
    chart.subscribeCrosshairMove(param => {
      if (param.time && param.seriesData?.size) {
        const bar = param.seriesData.get(candleSeries);
        if (bar) {
          const prev = candles[candles.findIndex(c => c.time === param.time) - 1];
          const chg = prev ? (((bar.close - prev.close) / prev.close) * 100).toFixed(2) : null;
          setOhlcInfo({ open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume ?? 0, chg });
        }
      } else {
        setOhlcInfo(null);
      }
    });

    // ── Sync RSI / MACD sub-charts ───────────────────────────────────────────
    chart.timeScale().subscribeVisibleLogicalRangeChange(r => {
      if (!r) return;
      rsiChartRef.current?.timeScale().setVisibleLogicalRange(r);
      macdChartRef.current?.timeScale().setVisibleLogicalRange(r);
    });

    chart.timeScale().fitContent();

    return () => {
      mainChartRef.current?.remove();
      mainChartRef.current = null;
    };
  }, [candles, sig, entryPrice, ind, per]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── RSI sub-chart ───────────────────────────────────────────────────────────
  useEffect(() => {
    const el = rsiContainerRef.current;
    if (rsiChartRef.current) { rsiChartRef.current.remove(); rsiChartRef.current = null; }
    if (!ind.rsi || !el || !candles.length) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { color: '#141414' }, textColor: '#888' },
      grid: { vertLines: { color: '#1a1a1a' }, horzLines: { color: '#1a1a1a' } },
      timeScale: { visible: false, borderColor: '#2a2a2a' },
      rightPriceScale: { borderColor: '#2a2a2a', scaleMargins: { top: 0.1, bottom: 0.1 } },
      crosshair: { mode: 1 },
    });
    rsiChartRef.current = chart;

    const closes = candles.map(c => c.close);
    const rsiVals = indRSI(closes, per.rsi);
    const rsiSeries = chart.addSeries(LineSeries, { color: '#7b68ee', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, title: `RSI${per.rsi}` });
    rsiSeries.setData(candles.map((c, i) => rsiVals[i] != null ? { time: c.time, value: rsiVals[i] } : null).filter(Boolean));
    rsiSeries.createPriceLine({ price: 70, color: '#ff3355', lineWidth: 1, lineStyle: 2, title: 'OB' });
    rsiSeries.createPriceLine({ price: 30, color: '#00ff88', lineWidth: 1, lineStyle: 2, title: 'OS' });

    chart.timeScale().subscribeVisibleLogicalRangeChange(r => {
      if (!r) return;
      mainChartRef.current?.timeScale().setVisibleLogicalRange(r);
      macdChartRef.current?.timeScale().setVisibleLogicalRange(r);
    });

    return () => { rsiChartRef.current?.remove(); rsiChartRef.current = null; };
  }, [candles, ind.rsi, per.rsi]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── MACD sub-chart ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = macdContainerRef.current;
    if (macdChartRef.current) { macdChartRef.current.remove(); macdChartRef.current = null; }
    if (!ind.macd || !el || !candles.length) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { color: '#141414' }, textColor: '#888' },
      grid: { vertLines: { color: '#1a1a1a' }, horzLines: { color: '#1a1a1a' } },
      timeScale: { visible: false, borderColor: '#2a2a2a' },
      rightPriceScale: { borderColor: '#2a2a2a', scaleMargins: { top: 0.1, bottom: 0.1 } },
      crosshair: { mode: 1 },
    });
    macdChartRef.current = chart;

    const closes = candles.map(c => c.close);
    const { macd, signal: macdSig, histogram } = indMACD(closes, per.macdFast, per.macdSlow, per.macdSig);

    const macdLine = chart.addSeries(LineSeries, { color: '#00aaff', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: 'MACD' });
    macdLine.setData(candles.map((c, i) => macd[i] != null ? { time: c.time, value: macd[i] } : null).filter(Boolean));

    const sigLine = chart.addSeries(LineSeries, { color: '#ff9500', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: 'Signal' });
    sigLine.setData(candles.map((c, i) => macdSig[i] != null ? { time: c.time, value: macdSig[i] } : null).filter(Boolean));

    const histSeries = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false, title: '' });
    histSeries.setData(
      candles.map((c, i) => histogram[i] != null ? {
        time: c.time, value: histogram[i],
        color: histogram[i] >= 0 ? 'rgba(0,255,136,0.5)' : 'rgba(255,51,85,0.5)',
      } : null).filter(Boolean)
    );

    chart.timeScale().subscribeVisibleLogicalRangeChange(r => {
      if (!r) return;
      mainChartRef.current?.timeScale().setVisibleLogicalRange(r);
      rsiChartRef.current?.timeScale().setVisibleLogicalRange(r);
    });

    return () => { macdChartRef.current?.remove(); macdChartRef.current = null; };
  }, [candles, ind.macd, per.macdFast, per.macdSlow, per.macdSig]); // eslint-disable-line react-hooks/exhaustive-deps

  // OHLC display — use hovered bar or fall back to last candle
  const displayInfo = ohlcInfo || (candles.length ? {
    open: candles[candles.length - 1].open,
    high: candles[candles.length - 1].high,
    low: candles[candles.length - 1].low,
    close: candles[candles.length - 1].close,
    volume: candles[candles.length - 1].volume,
    chg: candles.length > 1
      ? (((candles[candles.length - 1].close - candles[candles.length - 2].close) / candles[candles.length - 2].close) * 100).toFixed(2)
      : null,
  } : null);

  function toggle(key) { setInd(p => ({ ...p, [key]: !p[key] })); }
  function period(key, val) { setPer(p => ({ ...p, [key]: val })); }

  function RangeBtn({ r, label }) {
    const active = range === r;
    return (
      <button onClick={() => setRange(r)} style={{
        background: active ? 'var(--accent-dim)' : 'none',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        padding: '2px 7px', borderRadius: 4, cursor: 'pointer', fontSize: 11,
      }}>{label || r}</button>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

      {/* ── Indicator toggle bar ─────────────────────────────────────────────── */}
      <div style={{ padding: '4px 10px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
        <IndToggle id="ema1" label={`EMA`} active={ind.ema1} color="#00aaff"
          onToggle={() => toggle('ema1')} period={per.ema1} onPeriod={v => period('ema1', v)} />
        <IndToggle id="ema2" label={`EMA`} active={ind.ema2} color="#ff9500"
          onToggle={() => toggle('ema2')} period={per.ema2} onPeriod={v => period('ema2', v)} />
        <IndToggle id="sma" label={`SMA`} active={ind.sma} color="#cc88ff"
          onToggle={() => toggle('sma')} period={per.sma} onPeriod={v => period('sma', v)} />
        <IndToggle id="bb" label="BB" active={ind.bb} color="rgba(150,150,255,0.8)"
          onToggle={() => toggle('bb')} period={per.bb} onPeriod={v => period('bb', v)}
          extraPeriods={ind.bb && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, color: 'var(--text-dim)' }}>
              ×<input type="number" min={0.5} max={5} step={0.5} value={per.bbStd}
                onChange={e => period('bbStd', +e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ width: 30, fontSize: 10, padding: '0 2px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-primary)', textAlign: 'center' }} />
            </span>
          )} />
        <IndToggle id="volume" label="Vol" active={ind.volume} color="rgba(150,150,150,0.7)"
          onToggle={() => toggle('volume')} />
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
        <IndToggle id="rsi" label="RSI" active={ind.rsi} color="#7b68ee"
          onToggle={() => toggle('rsi')} period={per.rsi} onPeriod={v => period('rsi', v)} />
        <IndToggle id="macd" label="MACD" active={ind.macd} color="#00aaff"
          onToggle={() => toggle('macd')}
          extraPeriods={ind.macd && (
            <span style={{ display: 'flex', gap: 2, alignItems: 'center', fontSize: 9, color: 'var(--text-dim)' }} onClick={e => e.stopPropagation()}>
              {[['macdFast', per.macdFast], ['macdSlow', per.macdSlow], ['macdSig', per.macdSig]].map(([k, v]) => (
                <input key={k} type="number" min={2} max={100} value={v}
                  onChange={e => period(k, Math.max(2, +e.target.value))}
                  style={{ width: 30, fontSize: 10, padding: '0 2px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-primary)', textAlign: 'center' }} />
              ))}
            </span>
          )} />
      </div>

      {/* ── Timeframe selector ───────────────────────────────────────────────── */}
      <div style={{ padding: '4px 10px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {isMobile ? (
          <select value={range} onChange={e => setRange(e.target.value)}
            style={{ fontSize: 11, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', padding: '2px 6px' }}>
            <optgroup label="Intraday">
              {INTRADAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
            <optgroup label="Candle Interval">
              {CANDLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          </select>
        ) : (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 2 }}>Intraday</span>
            {INTRADAY_OPTIONS.map(o => <RangeBtn key={o.value} r={o.value} label={o.label} />)}
            <span style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />
            {CANDLE_OPTIONS.map(o => <RangeBtn key={o.value} r={o.value} label={o.label} />)}
            <span style={{ fontSize: 9, color: 'var(--text-dim)', marginLeft: 4 }}>Yahoo Finance</span>
          </div>
        )}
      </div>

      {/* ── Main chart area ───────────────────────────────────────────────────── */}
      {isLoading && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Loading chart data…</div>}
      {isError   && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)',      fontSize: 13 }}>Failed to load chart data</div>}
      {!isLoading && !isError && candles.length === 0 && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>No chart data available</div>}

      {/* Chart + OHLC tooltip — flex column so chart div can use flex:1 for height */}
      <div style={{ flex: 1, minHeight: 0, display: candles.length > 0 && !isLoading && !isError ? 'flex' : 'none', flexDirection: 'column', position: 'relative' }}>
        {/* OHLC tooltip */}
        {displayInfo && (
          <div style={{
            position: 'absolute', top: 6, left: 6, zIndex: 10,
            background: 'rgba(0,0,0,0.72)', borderRadius: 4,
            padding: '3px 8px', pointerEvents: 'none',
            fontFamily: 'var(--text-mono)', fontSize: 11,
            display: 'flex', gap: 10, alignItems: 'center',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ color: 'var(--text-dim)' }}>O</span><span style={{ color: 'var(--text-primary)' }}>{fmtNum(displayInfo.open)}</span>
            <span style={{ color: 'var(--text-dim)' }}>H</span><span style={{ color: '#00ff88' }}>{fmtNum(displayInfo.high)}</span>
            <span style={{ color: 'var(--text-dim)' }}>L</span><span style={{ color: '#ff3355' }}>{fmtNum(displayInfo.low)}</span>
            <span style={{ color: 'var(--text-dim)' }}>C</span><span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{fmtNum(displayInfo.close)}</span>
            <span style={{ color: 'var(--text-dim)' }}>Vol</span><span style={{ color: 'var(--text-secondary)' }}>{fmtVol(displayInfo.volume)}</span>
            {displayInfo.chg != null && (
              <span style={{ color: +displayInfo.chg >= 0 ? '#00ff88' : '#ff3355', fontWeight: 600 }}>
                {+displayInfo.chg >= 0 ? '+' : ''}{displayInfo.chg}%
              </span>
            )}
          </div>
        )}
        {/* autoSize:true makes LW Charts observe this div's size automatically */}
        <div ref={mainContainerRef} style={{ flex: 1, minHeight: 0 }} />
      </div>

      {/* ── RSI sub-pane ─────────────────────────────────────────────────────── */}
      {ind.rsi && candles.length > 0 && (
        <div style={{ height: 110, borderTop: '1px solid var(--border)', position: 'relative', flexShrink: 0 }}>
          <span style={{ position: 'absolute', top: 3, left: 6, fontSize: 9, color: '#7b68ee', zIndex: 1, fontWeight: 600 }}>RSI {per.rsi}</span>
          <div ref={rsiContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}

      {/* ── MACD sub-pane ────────────────────────────────────────────────────── */}
      {ind.macd && candles.length > 0 && (
        <div style={{ height: 110, borderTop: '1px solid var(--border)', position: 'relative', flexShrink: 0 }}>
          <span style={{ position: 'absolute', top: 3, left: 6, fontSize: 9, color: '#00aaff', zIndex: 1, fontWeight: 600 }}>
            MACD {per.macdFast}/{per.macdSlow}/{per.macdSig}
          </span>
          <div ref={macdContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

let widgetSeq = 0;

export default function ChartModal({ symbol, entryPrice, onClose }) {
  const tvSymbol    = toTvSymbol(symbol);
  const containerId = useRef(`tv_chart_${++widgetSeq}`).current;
  const containerRef = useRef(null);
  const [chartMode, setChartMode] = useState('checking');

  useEffect(() => {
    const ticker = tvSymbol.includes(':') ? tvSymbol.split(':')[1] : tvSymbol;
    searchApi.tv(ticker)
      .then(results => {
        const found = results.some(r => r.tvSymbol?.toUpperCase() === tvSymbol.toUpperCase());
        setChartMode(found ? 'tv' : 'lightweight');
      })
      .catch(() => setChartMode('lightweight'));
  }, [tvSymbol]);

  useEffect(() => {
    if (chartMode !== 'tv') return;
    const el = containerRef.current;
    if (!el) return;

    function createWidget() {
      if (!window.TradingView) return;
      el.innerHTML = `<div id="${containerId}" style="height:100%"></div>`;
      new window.TradingView.widget({
        autosize:            true,
        symbol:              tvSymbol,
        interval:            'D',
        timezone:            tvTimezone(symbol),
        theme:               'dark',
        style:               '1',
        locale:              'en',
        enable_publishing:   false,
        withdateranges:      true,
        hide_side_toolbar:   false,
        allow_symbol_change: true,
        save_image:          false,
        container_id:        containerId,
        studies: ['RSI@tv-basicstudies', 'MAExp@tv-basicstudies', 'MACD@tv-basicstudies'],
        overrides: {
          'paneProperties.background':               '#141414',
          'paneProperties.backgroundType':           'solid',
          'paneProperties.vertGridProperties.color': '#1e1e1e',
          'paneProperties.horzGridProperties.color': '#1e1e1e',
        },
      });
    }

    if (window.TradingView) {
      createWidget();
    } else {
      const existing = document.getElementById('tv-script');
      if (!existing) {
        const script = document.createElement('script');
        script.id    = 'tv-script';
        script.src   = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = createWidget;
        document.head.appendChild(script);
      } else {
        existing.addEventListener('load', createWidget, { once: true });
        if (window.TradingView) createWidget();
      }
    }

    return () => { if (el) el.innerHTML = ''; };
  }, [chartMode, tvSymbol, containerId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const modeBadge = {
    checking:    { bg: 'var(--bg-base)',              color: 'var(--text-dim)',    label: 'Checking…'    },
    tv:          { bg: 'rgba(0,255,136,0.12)',         color: 'var(--green)',       label: 'TradingView'  },
    lightweight: { bg: 'rgba(255,215,0,0.12)',         color: 'var(--yellow)',      label: 'Yahoo Charts' },
  }[chartMode];

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>{symbol}</span>
          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: modeBadge.bg, color: modeBadge.color }}>
            {modeBadge.label}
          </span>
          <a
            href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 10, color: 'var(--text-dim)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap' }}
            title="Open in TradingView"
          >↗ TV</a>
          {entryPrice != null && (
            <span style={{ fontSize: 11, background: 'rgba(0,255,136,0.12)', color: 'var(--green)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 4, padding: '2px 8px', fontFamily: 'var(--text-mono)', whiteSpace: 'nowrap' }}>
              Entry @ {entryPrice}
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 6, padding: '4px 10px', fontSize: 13, flexShrink: 0 }}>✕</button>
      </div>

      {/* Chart area */}
      {chartMode === 'checking' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
          Checking chart availability…
        </div>
      )}
      {chartMode === 'tv' && (
        <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
      )}
      {chartMode === 'lightweight' && (
        <LightweightChart symbol={symbol} entryPrice={entryPrice} />
      )}

      {/* Signal analysis panel */}
      <SignalPanel symbol={symbol} />
    </div>
  );
}
