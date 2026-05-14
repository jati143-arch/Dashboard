import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../../api/client.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function colorForPnl(pnl, maxAbs) {
  if (pnl === null || pnl === undefined) return '#1e1e1e';
  if (pnl === 0) return '#1e1e1e';
  const intensity = Math.min(1, Math.abs(pnl) / (maxAbs * 0.5 + 1));
  if (pnl > 0) {
    const g = Math.round(120 + intensity * 135);
    return `rgb(30, ${g}, 60)`;
  }
  const r = Math.round(120 + intensity * 135);
  return `rgb(${r}, 30, 40)`;
}

export default function PnlHeatmap() {
  const today = new Date().toISOString().slice(0, 10);

  const { data: series = [], isLoading } = useQuery({
    queryKey: ['pnl-series-heatmap'],
    queryFn: () => statsApi.pnlSeries('2000-01-01', today),
    staleTime: 5 * 60 * 1000,
  });

  const { cells, weeks, monthLabels, maxAbs } = useMemo(() => {
    const map = new Map(series.map(r => [r.date, { pnl: r.pnl, trades: r.trades }]));

    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 52 * 7 + 1);
    start.setDate(start.getDate() - start.getDay());

    const allDays = [];
    const cur = new Date(start);
    while (cur <= end) {
      const dateStr = cur.toISOString().slice(0, 10);
      const d = map.get(dateStr);
      allDays.push({ date: dateStr, pnl: d ? d.pnl : null, trades: d ? d.trades : 0 });
      cur.setDate(cur.getDate() + 1);
    }

    const mx = series.reduce((acc, r) => Math.max(acc, Math.abs(r.pnl || 0)), 0);

    const cols = [];
    for (let i = 0; i < allDays.length; i += 7) {
      cols.push(allDays.slice(i, i + 7));
    }

    const labels = [];
    let lastMonth = -1;
    cols.forEach((week, wi) => {
      const firstDay = new Date(week[0].date + 'T00:00:00');
      const m = firstDay.getMonth();
      if (m !== lastMonth) {
        labels.push({ col: wi, label: MONTHS[m] });
        lastMonth = m;
      }
    });

    return { cells: cols, weeks: cols.length, monthLabels: labels, maxAbs: mx };
  }, [series]);

  if (isLoading) {
    return (
      <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, marginBottom: 24, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', background: '#111111', padding: '20px 24px' }}>
        Loading heatmap…
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, marginBottom: 24, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: 13, background: '#111111', padding: '20px 24px' }}>
        No trade data for heatmap
      </div>
    );
  }

  const cellSize = 14;
  const gap = 3;

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, marginBottom: 24, padding: '20px 24px', background: '#111111', overflowX: 'auto' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', marginBottom: 16 }}>P&L Calendar</div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap, paddingTop: 20 }}>
          {DAYS.map((day, i) => (
            <div key={day} style={{ height: cellSize, fontSize: 9, color: '#52525b', lineHeight: `${cellSize}px`, width: 24, textAlign: 'right' }}>
              {i % 2 === 1 ? day.slice(0, 1) : ''}
            </div>
          ))}
        </div>

        <div>
          <div style={{ display: 'flex', gap, marginBottom: 6, position: 'relative', height: 16 }}>
            {monthLabels.map(({ col, label }) => (
              <div
                key={`${col}-${label}`}
                style={{
                  position: 'absolute',
                  left: col * (cellSize + gap),
                  fontSize: 10,
                  color: '#52525b',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap }}>
            {cells.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap }}>
                {week.map((day, di) => {
                  const bg = colorForPnl(day.pnl, maxAbs);
                  const tipPnl = day.pnl != null ? `₹${day.pnl >= 0 ? '+' : ''}${day.pnl.toFixed(0)}` : 'No trades';
                  const tip = `${day.date}\n${tipPnl}${day.trades ? ` (${day.trades} trade${day.trades !== 1 ? 's' : ''})` : ''}`;
                  return (
                    <div
                      key={di}
                      title={tip}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: 3,
                        background: bg,
                        cursor: 'default',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: 20, gap: 5, marginLeft: 14 }}>
          <div style={{ fontSize: 9, color: '#52525b', marginBottom: 2 }}>Less</div>
          {[0.1, 0.3, 0.6, 1.0].map(i => (
            <div key={i} style={{ width: cellSize, height: cellSize, borderRadius: 3, background: colorForPnl(i * maxAbs, maxAbs) }} />
          ))}
          <div style={{ fontSize: 9, color: '#52525b', marginTop: 2 }}>More</div>
        </div>
      </div>
    </div>
  );
}