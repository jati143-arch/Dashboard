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

    // Build 52-week grid ending today
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 52 * 7 + 1);
    // align start to Sunday
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

    // Group into weeks (columns)
    const cols = [];
    for (let i = 0; i < allDays.length; i += 7) {
      cols.push(allDays.slice(i, i + 7));
    }

    // Month labels: find first week where the month changes
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
      <div className="card" style={{ marginBottom: 24, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
        Loading heatmap…
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 24, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
        No trade data for heatmap
      </div>
    );
  }

  const cellSize = 13;
  const gap = 2;

  return (
    <div className="card" style={{ marginBottom: 24, overflowX: 'auto' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>P&L Calendar</div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap, paddingTop: 18 }}>
          {DAYS.map((day, i) => (
            <div key={day} style={{ height: cellSize, fontSize: 9, color: 'var(--text-dim)', lineHeight: `${cellSize}px`, width: 22, textAlign: 'right' }}>
              {i % 2 === 1 ? day.slice(0, 1) : ''}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div>
          {/* Month labels */}
          <div style={{ display: 'flex', gap, marginBottom: 4, position: 'relative', height: 16 }}>
            {monthLabels.map(({ col, label }) => (
              <div
                key={`${col}-${label}`}
                style={{
                  position: 'absolute',
                  left: col * (cellSize + gap),
                  fontSize: 10,
                  color: 'var(--text-dim)',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Week columns */}
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
                        borderRadius: 2,
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

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: 18, gap: 4, marginLeft: 12 }}>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 2 }}>Less</div>
          {[0.1, 0.3, 0.6, 1.0].map(i => (
            <div key={i} style={{ width: cellSize, height: cellSize, borderRadius: 2, background: colorForPnl(i * maxAbs, maxAbs) }} />
          ))}
          <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>More</div>
        </div>
      </div>
    </div>
  );
}
