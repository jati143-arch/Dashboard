import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { useQuery } from '@tanstack/react-query';
import { pythonDataApi } from '../../api/client.js';

const TIMEFRAMES = [
  { label: '1D', period: '1d',  interval: '5m',  isIntraday: true },
  { label: '1W', period: '5d',  interval: '15m', isIntraday: true },
  { label: '1M', period: '1mo', interval: '1d',  isIntraday: false },
  { label: '3M', period: '3mo', interval: '1d',  isIntraday: false },
  { label: '1Y', period: '1y',  interval: '1wk', isIntraday: false },
  { label: '5Y', period: '5y',  interval: '1mo', isIntraday: false },
];

// Calculate EMA
function calcEMA(data, period) {
  const k = 2 / (period + 1);
  const result = [];
  let ema = data[0]?.close;
  for (const bar of data) {
    ema = bar.close * k + ema * (1 - k);
    result.push({ time: bar.time, value: parseFloat(ema.toFixed(4)) });
  }
  return result;
}

// Calculate RSI(14)
function calcRSI(data, period = 14) {
  if (data.length < period + 1) return [];
  const result = [];
  let avgGain = 0, avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) avgGain += diff / period;
    else avgLoss += Math.abs(diff) / period;
  }

  for (let i = period; i < data.length; i++) {
    if (i > period) {
      const diff = data[i].close - data[i - 1].close;
      avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ time: data[i].time, value: parseFloat((100 - 100 / (1 + rs)).toFixed(2)) });
  }
  return result;
}

export default function CandlestickChart({ symbol, height = 420, showIndicators = true }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const rsiContainerRef = useRef(null);
  const rsiChartRef = useRef(null);
  const [tf, setTf] = useState(TIMEFRAMES[0]);
  const [indicators, setIndicators] = useState({ ema9: true, ema20: false, rsi: true });

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['yf-chart', symbol, tf.period, tf.interval],
    queryFn: () => tf.isIntraday
      ? pythonDataApi.yfIntraday(symbol, tf.interval)
      : pythonDataApi.yfHistory(symbol, tf.period, tf.interval),
    staleTime: tf.isIntraday ? 60_000 : 5 * 60_000,
    retry: 1,
  });

  const candles = result?.success ? result.data : [];

  // Main chart
  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const bg = isDark ? '#0d0f14' : '#ffffff';
    const textColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: { background: { type: ColorType.Solid, color: bg }, textColor },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor },
      timeScale: { borderColor, timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });
    candleSeries.setData(candles);

    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      color: isDark ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.2)',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volSeries.setData(candles.map(c => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
    })));

    if (indicators.ema9) {
      const e9 = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, priceLineVisible: false });
      e9.setData(calcEMA(candles, 9));
    }
    if (indicators.ema20) {
      const e20 = chart.addLineSeries({ color: '#8b5cf6', lineWidth: 1, priceLineVisible: false });
      e20.setData(calcEMA(candles, 20));
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, [candles, indicators, height]);

  // RSI sub-chart
  useEffect(() => {
    if (!rsiContainerRef.current || !showIndicators || !indicators.rsi || candles.length < 15) return;

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const bg = isDark ? '#0d0f14' : '#ffffff';
    const textColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';

    if (rsiChartRef.current) { rsiChartRef.current.remove(); rsiChartRef.current = null; }

    const rsiChart = createChart(rsiContainerRef.current, {
      width: rsiContainerRef.current.clientWidth,
      height: 100,
      layout: { background: { type: ColorType.Solid, color: bg }, textColor },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      rightPriceScale: { borderColor, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor, timeVisible: true, secondsVisible: false, visible: false },
      crosshair: { mode: CrosshairMode.Normal },
    });
    rsiChartRef.current = rsiChart;

    const rsiSeries = rsiChart.addLineSeries({ color: '#06b6d4', lineWidth: 1.5, priceLineVisible: false });
    rsiSeries.setData(calcRSI(candles));

    // Overbought/oversold lines
    const ob = rsiChart.addLineSeries({ color: 'rgba(239,68,68,0.5)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    const os = rsiChart.addLineSeries({ color: 'rgba(34,197,94,0.5)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    const rsiData = calcRSI(candles);
    if (rsiData.length > 0) {
      ob.setData(rsiData.map(d => ({ time: d.time, value: 70 })));
      os.setData(rsiData.map(d => ({ time: d.time, value: 30 })));
    }

    rsiChart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (rsiContainerRef.current) rsiChart.applyOptions({ width: rsiContainerRef.current.clientWidth });
    });
    ro.observe(rsiContainerRef.current);

    return () => { ro.disconnect(); rsiChart.remove(); rsiChartRef.current = null; };
  }, [candles, indicators.rsi, showIndicators]);

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const borderClr = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  const textClr = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        marginBottom: 8, paddingBottom: 8,
        borderBottom: `1px solid ${borderClr}`,
      }}>
        {/* Timeframe pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TIMEFRAMES.map(t => (
            <button key={t.label} onClick={() => setTf(t)} style={{
              padding: '4px 10px', borderRadius: 9999, fontSize: 11, cursor: 'pointer', border: 'none',
              background: tf.label === t.label ? 'var(--color-accent)' : 'rgba(255,255,255,0.06)',
              color: tf.label === t.label ? '#000' : textClr,
              fontWeight: tf.label === t.label ? 700 : 400,
            }}>{t.label}</button>
          ))}
        </div>

        {showIndicators && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            {[['ema9', 'EMA9', '#f59e0b'], ['ema20', 'EMA20', '#8b5cf6'], ['rsi', 'RSI', '#06b6d4']].map(([key, label, color]) => (
              <button key={key} onClick={() => setIndicators(prev => ({ ...prev, [key]: !prev[key] }))} style={{
                padding: '4px 10px', borderRadius: 9999, fontSize: 11, cursor: 'pointer',
                border: `1px solid ${indicators[key] ? color : 'transparent'}`,
                background: indicators[key] ? `${color}22` : 'rgba(255,255,255,0.04)',
                color: indicators[key] ? color : textClr,
              }}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Chart container */}
      {isLoading && (
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textClr, fontSize: 13 }}>
          Loading chart…
        </div>
      )}
      {error && !isLoading && (
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red)', fontSize: 13 }}>
          Chart data unavailable
        </div>
      )}
      {!isLoading && !error && candles.length === 0 && (
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textClr, fontSize: 13 }}>
          No data for {symbol}
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', display: candles.length > 0 ? 'block' : 'none' }} />
      {showIndicators && indicators.rsi && candles.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#06b6d4', padding: '4px 0 2px', fontFamily: 'var(--font-mono)' }}>RSI (14)</div>
          <div ref={rsiContainerRef} style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
}
