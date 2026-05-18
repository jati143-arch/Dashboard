import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react';

export default function PositionSizer() {
  const [form, setForm] = useState({
    capital: '100000',
    riskPct: '1',
    entry: '',
    stopLoss: '',
    target: '',
  });

  const calc = useMemo(() => {
    const capital = parseFloat(form.capital) || 0;
    const riskPct = parseFloat(form.riskPct) / 100;
    const entry = parseFloat(form.entry) || 0;
    const sl = parseFloat(form.stopLoss) || 0;
    const target = parseFloat(form.target) || 0;

    if (!capital || !riskPct || !entry || !sl || entry <= 0) return null;

    const riskAmount = capital * riskPct;
    const riskPerShare = Math.abs(entry - sl);
    if (riskPerShare === 0) return null;

    const qty = Math.floor(riskAmount / riskPerShare);
    const totalInvestment = qty * entry;
    const maxLoss = qty * riskPerShare;

    let rr = null, reward = null;
    if (target && target !== entry) {
      reward = Math.abs(target - entry) * qty;
      rr = Math.abs(target - entry) / riskPerShare;
    }

    const kellyPct = rr ? Math.max(0, (rr - 1) / rr) * 100 : null;

    return { qty, totalInvestment, riskAmount, maxLoss, rr, reward, kellyPct, riskPerShare };
  }, [form]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const isLong = !form.stopLoss || !form.entry || parseFloat(form.stopLoss) < parseFloat(form.entry);

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 12px',
    background: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    borderRadius: 10, color: 'var(--color-text-primary)',
    fontSize: 13, outline: 'none',
    fontFamily: 'var(--font-mono)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Calculator size={18} color="var(--color-accent)" />
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>Position Sizing Calculator</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Portfolio Capital (₹)
          </label>
          <input type="number" value={form.capital} onChange={set('capital')} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Risk per Trade (%)
          </label>
          <input type="number" value={form.riskPct} onChange={set('riskPct')} step="0.1" min="0.1" max="10" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Entry Price
          </label>
          <input type="number" value={form.entry} onChange={set('entry')} placeholder="e.g. 2400" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Stop Loss
          </label>
          <input type="number" value={form.stopLoss} onChange={set('stopLoss')} placeholder="e.g. 2350" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Target (optional)
          </label>
          <input type="number" value={form.target} onChange={set('target')} placeholder="e.g. 2520" style={inputStyle} />
        </div>
      </div>

      {calc && (
        <div style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 20 }}>
          {/* Main result */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Suggested Quantity</div>
            <div style={{ fontSize: 42, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
              {calc.qty.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              shares · ₹{calc.totalInvestment.toLocaleString('en-IN', { maximumFractionDigits: 0 })} total investment
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {[
              { label: 'Max Risk (₹)', value: `₹${calc.maxLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'var(--color-red)' },
              { label: 'Risk per Share', value: `₹${calc.riskPerShare.toFixed(2)}`, color: 'var(--color-text-primary)' },
              ...(calc.rr != null ? [
                { label: 'R:R Ratio', value: `1 : ${calc.rr.toFixed(2)}`, color: calc.rr >= 2 ? 'var(--color-green)' : calc.rr >= 1 ? '#fbbf24' : 'var(--color-red)' },
                { label: 'Max Reward', value: `₹${calc.reward.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'var(--color-green)' },
              ] : []),
              ...(calc.kellyPct != null ? [
                { label: 'Kelly Criterion', value: `${calc.kellyPct.toFixed(1)}%`, color: 'var(--color-text-secondary)' },
              ] : []),
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* R:R visualizer */}
          {calc.rr != null && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Risk / Reward</div>
              <div style={{ display: 'flex', height: 10, borderRadius: 9999, overflow: 'hidden', gap: 2 }}>
                <div style={{ flex: 1, background: 'var(--color-red)', opacity: 0.7, borderRadius: '9999px 0 0 9999px' }} title="Risk 1R" />
                <div style={{ flex: calc.rr, background: 'var(--color-green)', opacity: 0.7, borderRadius: '0 9999px 9999px 0' }} title={`Reward ${calc.rr.toFixed(1)}R`} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--color-red)' }}>Risk 1R</span>
                <span style={{ fontSize: 10, color: 'var(--color-green)' }}>Reward {calc.rr.toFixed(1)}R</span>
              </div>
            </div>
          )}

          {calc.rr != null && calc.rr < 1.5 && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, fontSize: 11, color: '#fbbf24' }}>
              ⚠ R:R below 1.5 — consider tightening stop or widening target
            </div>
          )}
        </div>
      )}

      {!calc && form.entry && form.stopLoss && (
        <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Fill in capital, risk %, entry, and stop loss to see your position size.
        </div>
      )}
    </div>
  );
}
