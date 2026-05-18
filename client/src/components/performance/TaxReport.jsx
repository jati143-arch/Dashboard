import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tradesApi } from '../../api/client.js';

const FY_START_MONTH = 3; // April (0-indexed) — India financial year starts Apr 1

function getFY(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();
  return month >= FY_START_MONTH ? `FY${year}-${(year + 1) % 100}` : `FY${year - 1}-${year % 100}`;
}

function isLTCG(entryDate, exitDate) {
  const entry = new Date(entryDate);
  const exit = new Date(exitDate);
  const diff = (exit - entry) / (1000 * 60 * 60 * 24);
  return diff >= 365;
}

function exportCSV(rows, filename) {
  const headers = ['Symbol', 'Buy Date', 'Sell Date', 'Qty', 'Buy Price', 'Sell Price', 'P&L', 'Type', 'Tax (est.)'];
  const lines = [headers.join(','), ...rows.map(r => [
    r.symbol, r.entry_date, r.exit_date, r.qty,
    r.entry_price, r.exit_price, r.pnl.toFixed(2),
    r.type, r.tax.toFixed(2),
  ].join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function TaxReport() {
  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades-all'],
    queryFn: () => tradesApi.list({ status: 'closed' }),
    staleTime: 5 * 60_000,
  });

  const { fyGroups, summary } = useMemo(() => {
    const rows = trades
      .filter(t => t.exit_date && t.pnl != null && t.instrument_type !== 'mutual_fund')
      .map(t => {
        const lt = isLTCG(t.date, t.exit_date);
        const pnl = parseFloat(t.pnl) || 0;
        const type = lt ? 'LTCG' : 'STCG';
        // India tax: STCG @ 15%, LTCG @ 10% above ₹1L (we show estimate per trade)
        const taxRate = lt ? 0.10 : 0.15;
        const tax = pnl > 0 ? pnl * taxRate : 0;
        return { ...t, qty: t.remaining_size ?? t.size, pnl, type, lt, tax, fy: getFY(t.exit_date) };
      });

    const groups = {};
    for (const r of rows) {
      if (!groups[r.fy]) groups[r.fy] = [];
      groups[r.fy].push(r);
    }

    const totalStcg = rows.filter(r => !r.lt && r.pnl > 0).reduce((s, r) => s + r.pnl, 0);
    const totalLtcg = rows.filter(r => r.lt && r.pnl > 0).reduce((s, r) => s + r.pnl, 0);
    const stcgLoss = rows.filter(r => !r.lt && r.pnl < 0).reduce((s, r) => s + r.pnl, 0);
    const ltcgLoss = rows.filter(r => r.lt && r.pnl < 0).reduce((s, r) => s + r.pnl, 0);
    const ltcgExempt = 100000; // ₹1L exemption
    const ltcgTaxable = Math.max(0, totalLtcg - ltcgExempt);

    return {
      fyGroups: groups,
      summary: {
        totalStcg, totalLtcg, stcgLoss, ltcgLoss,
        stcgTax: Math.max(0, totalStcg) * 0.15,
        ltcgTax: ltcgTaxable * 0.10,
        ltcgExempt,
      },
    };
  }, [trades]);

  if (isLoading) return <div style={{ padding: 24, color: 'var(--color-text-secondary)', fontSize: 13 }}>Loading tax data…</div>;
  if (trades.length === 0) return <div style={{ padding: 24, color: 'var(--color-text-secondary)', fontSize: 13 }}>No closed trades found.</div>;

  const fys = Object.keys(fyGroups).sort().reverse();

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'STCG Profits', value: summary.totalStcg, color: 'var(--color-green)' },
          { label: 'STCG Losses', value: summary.stcgLoss, color: 'var(--color-red)' },
          { label: 'STCG Tax (15%)', value: summary.stcgTax, color: '#fbbf24' },
          { label: 'LTCG Profits', value: summary.totalLtcg, color: 'var(--color-green)' },
          { label: 'LTCG Exempt', value: -summary.ltcgExempt, color: 'var(--color-text-secondary)' },
          { label: 'LTCG Tax (10%)', value: summary.ltcgTax, color: '#fbbf24' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: c.color }}>
              ₹{Math.abs(c.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, marginBottom: 24, fontSize: 12, color: 'var(--color-text-secondary)' }}>
        ⚠ Estimates only — STCG @ 15%, LTCG @ 10% above ₹1L exemption (India FY Apr-Mar). Consult your CA for actual filing.
      </div>

      {/* Per-FY breakdown */}
      {fys.map(fy => {
        const rows = fyGroups[fy];
        const gains = rows.filter(r => r.pnl > 0);
        const losses = rows.filter(r => r.pnl <= 0);
        return (
          <div key={fy} style={{ marginBottom: 24, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>{fy}</span>
                <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>{rows.length} trades</span>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--color-green)', fontFamily: 'var(--font-mono)' }}>
                  Gains: ₹{gains.reduce((s, r) => s + r.pnl, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-red)', fontFamily: 'var(--font-mono)' }}>
                  Losses: ₹{Math.abs(losses.reduce((s, r) => s + r.pnl, 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <button onClick={() => exportCSV(rows, `tax-${fy}.csv`)} style={{
                  padding: '5px 12px', background: 'var(--color-accent)', border: 'none',
                  borderRadius: 8, color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>
                  Export CSV
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-base)' }}>
                    {['Symbol', 'Buy Date', 'Sell Date', 'Qty', 'Buy ₹', 'Sell ₹', 'P&L', 'Type', 'Tax Est.'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{r.symbol}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{r.date}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{r.exit_date}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{r.qty}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{r.entry_price}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{r.exit_price}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: r.pnl >= 0 ? 'var(--color-green)' : 'var(--color-red)', fontFamily: 'var(--font-mono)' }}>
                        {r.pnl >= 0 ? '+' : ''}₹{r.pnl.toFixed(0)}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: r.lt ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)', color: r.lt ? 'var(--color-green)' : '#fbbf24' }}>
                          {r.type}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: r.tax > 0 ? '#fbbf24' : 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {r.tax > 0 ? `₹${r.tax.toFixed(0)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
