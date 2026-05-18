import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mfApi, mfHoldingsApi } from '../../api/client.js';
import { TrendingUp, TrendingDown, Plus, Trash2, Search } from 'lucide-react';

const CARD = { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20 };

function xirr(cashflows) {
  // Simplified XIRR using Newton's method
  if (cashflows.length < 2) return null;
  let rate = 0.1;
  for (let iter = 0; iter < 100; iter++) {
    let f = 0, df = 0;
    for (const { amount, days } of cashflows) {
      const t = days / 365;
      const v = amount / Math.pow(1 + rate, t);
      f  += v;
      df -= t * amount / Math.pow(1 + rate, t + 1);
    }
    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < 1e-7) return newRate;
    rate = newRate;
  }
  return rate;
}

function calcXIRR(holding, currentNav) {
  if (!holding.startDate || !currentNav) return null;
  const start = new Date(holding.startDate);
  const today = new Date();
  const daysSinceStart = Math.max(1, (today - start) / 86400000);
  const invested = holding.investedAmount || (holding.units * holding.avgNav);
  const current  = holding.units * currentNav;
  const cashflows = [
    { amount: -invested, days: 0 },
    { amount: current,   days: daysSinceStart },
  ];
  try {
    const r = xirr(cashflows);
    return r != null ? Math.round(r * 10000) / 100 : null;
  } catch {
    return null;
  }
}

function NavRow({ holding, onDelete }) {
  const { data: navData } = useQuery({
    queryKey: ['mf-nav', holding.schemeCode],
    queryFn: () => mfApi.nav(holding.schemeCode),
    staleTime: 4 * 60 * 60 * 1000,
    enabled: !!holding.schemeCode,
  });

  const currentNav  = navData?.nav ?? null;
  const currentVal  = currentNav != null ? holding.units * currentNav : null;
  const invested    = holding.investedAmount || (holding.units * holding.avgNav);
  const gainLoss    = currentVal != null ? currentVal - invested : null;
  const gainPct     = invested > 0 && gainLoss != null ? (gainLoss / invested) * 100 : null;
  const xirResult   = calcXIRR(holding, currentNav);

  return (
    <div style={{ ...CARD, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {holding.schemeName}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
            Code: {holding.schemeCode} · Units: {holding.units?.toFixed(3)}
          </div>
        </div>
        <button
          onClick={() => onDelete(holding.id)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, flexShrink: 0 }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
        {[
          ['Avg NAV', holding.avgNav ? `₹${holding.avgNav.toFixed(2)}` : '—'],
          ['Current NAV', currentNav != null ? `₹${currentNav.toFixed(2)}` : '—'],
          ['Invested', invested ? `₹${Math.round(invested).toLocaleString('en-IN')}` : '—'],
          ['Current Value', currentVal != null ? `₹${Math.round(currentVal).toLocaleString('en-IN')}` : '—'],
          ['Gain / Loss', gainLoss != null ? `₹${Math.round(gainLoss).toLocaleString('en-IN')}` : '—', gainLoss >= 0 ? 'var(--color-green)' : 'var(--color-red)'],
          ['Returns', gainPct != null ? `${gainPct.toFixed(2)}%` : '—', gainPct >= 0 ? 'var(--color-green)' : 'var(--color-red)'],
          ['XIRR', xirResult != null ? `${xirResult.toFixed(2)}%` : '—', xirResult >= 0 ? 'var(--color-green)' : 'var(--color-red)'],
        ].map(([label, value, color]) => (
          <div key={label}>
            <div style={{ fontSize: 9, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: color || 'var(--color-text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>

      {holding.isSIP && (
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--color-text-secondary)', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 6, padding: '4px 8px', display: 'inline-block' }}>
          SIP ₹{holding.sipAmount?.toLocaleString('en-IN')} / {holding.sipFrequency}
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  schemeCode: '', schemeName: '', units: '', avgNav: '', investedAmount: '',
  startDate: '', isSIP: false, sipAmount: '', sipFrequency: 'monthly', notes: '',
};

export default function MutualFundTracker() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const { data: holdings = [], isLoading } = useQuery({
    queryKey: ['mf-holdings'],
    queryFn: mfHoldingsApi.list,
    staleTime: 5 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: mfHoldingsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mf-holdings'] }); setShowForm(false); setForm(EMPTY_FORM); },
  });

  const delMutation = useMutation({
    mutationFn: mfHoldingsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mf-holdings'] }),
  });

  const doSearch = useCallback(async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const results = await mfApi.search(searchQ);
      setSearchResults(results);
    } catch { setSearchResults([]); }
    setSearching(false);
  }, [searchQ]);

  const totalInvested = holdings.reduce((a, h) => a + (h.investedAmount || h.units * h.avgNav || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Mutual Fund Portfolio</div>
          {holdings.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {holdings.length} funds · ₹{Math.round(totalInvested).toLocaleString('en-IN')} invested
            </div>
          )}
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--color-accent)', color: '#000',
            border: 'none', borderRadius: 9, padding: '7px 14px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Add Fund
        </button>
      </div>

      {showForm && (
        <div style={{ ...CARD, marginBottom: 16, background: 'var(--color-bg-base)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Search &amp; Add Fund
          </div>

          {/* Fund search */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              placeholder="Search fund name (e.g. HDFC Flexicap)"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              style={{ flex: 1, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--color-text-primary)', outline: 'none' }}
            />
            <button onClick={doSearch} disabled={searching} style={{ background: 'var(--color-accent)', color: '#000', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              {searching ? '…' : <Search size={14} />}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 8, marginBottom: 12 }}>
              {searchResults.map(r => (
                <div
                  key={r.schemeCode}
                  onClick={() => { setForm(f => ({ ...f, schemeCode: String(r.schemeCode), schemeName: r.schemeName })); setSearchResults([]); }}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', fontSize: 12, color: 'var(--color-text-primary)' }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginRight: 8 }}>{r.schemeCode}</span>
                  {r.schemeName}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 10 }}>
            {[
              ['Scheme Code', 'schemeCode', 'text'],
              ['Scheme Name', 'schemeName', 'text'],
              ['Units Held', 'units', 'number'],
              ['Avg NAV (₹)', 'avgNav', 'number'],
              ['Invested (₹)', 'investedAmount', 'number'],
              ['Start Date', 'startDate', 'date'],
            ].map(([label, key, type]) => (
              <div key={key}>
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-primary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isSIP} onChange={e => setForm(f => ({ ...f, isSIP: e.target.checked }))} />
              SIP Investment
            </label>
            {form.isSIP && (
              <>
                <div>
                  <input
                    type="number" placeholder="SIP Amount ₹"
                    value={form.sipAmount} onChange={e => setForm(f => ({ ...f, sipAmount: e.target.value }))}
                    style={{ width: 120, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--color-text-primary)', outline: 'none' }}
                  />
                </div>
                <select
                  value={form.sipFrequency} onChange={e => setForm(f => ({ ...f, sipFrequency: e.target.value }))}
                  style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--color-text-primary)', outline: 'none' }}
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => addMutation.mutate(form)}
              disabled={!form.schemeCode || !form.units || addMutation.isPending}
              style={{ background: 'var(--color-green)', color: '#000', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (!form.schemeCode || !form.units) ? 0.5 : 1 }}
            >
              {addMutation.isPending ? 'Saving…' : 'Add to Portfolio'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 32 }}>Loading…</div>
      ) : holdings.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '40px 0', fontSize: 13, border: '1px dashed var(--color-border)', borderRadius: 16 }}>
          No mutual funds tracked yet. Click "Add Fund" to get started.
        </div>
      ) : (
        holdings.map(h => (
          <NavRow key={h.id} holding={h} onDelete={id => delMutation.mutate(id)} />
        ))
      )}
    </div>
  );
}
