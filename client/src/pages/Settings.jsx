import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/client.js';

const PROVIDERS = [
  { id: 'groq',       label: 'Groq',        sub: 'Free · 14,400 req/day · Llama 3.3 70B',   url: 'https://console.groq.com' },
  { id: 'claude',     label: 'Claude',       sub: 'Paid · Anthropic · claude-haiku-4-5',      url: 'https://console.anthropic.com' },
  { id: 'gemini',     label: 'Gemini Flash', sub: 'Free · Google · 1,500 req/day',            url: 'https://aistudio.google.com/app/apikey' },
  { id: 'openrouter', label: 'OpenRouter',   sub: 'Free models available · mistral-7b',       url: 'https://openrouter.ai/keys' },
];

const KEY_INPUTS = [
  { field: 'groq_key',       label: 'Groq API Key',       placeholder: 'gsk_…',    provider: 'groq',       url: 'https://console.groq.com' },
  { field: 'anthropic_key',  label: 'Anthropic API Key',  placeholder: 'sk-ant-…', provider: 'claude',     url: 'https://console.anthropic.com' },
  { field: 'gemini_key',     label: 'Gemini API Key',     placeholder: 'AIza…',    provider: 'gemini',     url: 'https://aistudio.google.com/app/apikey' },
  { field: 'openrouter_key', label: 'OpenRouter API Key', placeholder: 'sk-or-…',  provider: 'openrouter', url: 'https://openrouter.ai/keys' },
  { field: 'finnhub_key',    label: 'Finnhub API Key',    placeholder: 'For Market Hub & Economic Calendar events', url: 'https://finnhub.io' },
  { field: 'fred_key',       label: 'FRED API Key',       placeholder: 'For macroeconomic charts in Calendar',     url: 'https://fred.stlouisfed.org/docs/api/fred/' },
];

export default function Settings() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ai_provider: '', groq_key: '', anthropic_key: '', gemini_key: '', openrouter_key: '', finnhub_key: '', fred_key: '' });
  const [toast, setToast] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const { data: saved, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  useEffect(() => {
    if (saved) setForm(f => ({ ...f, ai_provider: saved.ai_provider || '', groq_key: saved.groq_key || '', anthropic_key: saved.anthropic_key || '', gemini_key: saved.gemini_key || '', openrouter_key: saved.openrouter_key || '', finnhub_key: saved.finnhub_key || '', fred_key: saved.fred_key || '' }));
  }, [saved]);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => settingsApi.save(form),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['ai-provider'] });
      setForm(f => ({ ...f, groq_key: data.groq_key || '', anthropic_key: data.anthropic_key || '', gemini_key: data.gemini_key || '', openrouter_key: data.openrouter_key || '', finnhub_key: data.finnhub_key || '', fred_key: data.fred_key || '' }));
      showToast('Settings saved', 'success');
    },
    onError: (e) => showToast(e.response?.data?.error || 'Failed to save', 'error'),
  });

  const { mutate: testAI, isPending: testing } = useMutation({
    mutationFn: settingsApi.testAI,
    onSuccess: (data) => setTestResult(data),
    onError: (e) => setTestResult({ ok: false, error: e.response?.data?.error || 'Test failed' }),
  });

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, display: 'block' };
  const hintStyle  = { fontSize: 11, color: 'var(--text-dim)', marginTop: 4 };

  if (isLoading) return <div style={{ color: 'var(--text-dim)', padding: 20, fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>Settings</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Your API keys are stored securely in your own Google Drive — only you can access them.
        </p>
      </div>

      {toast && (
        <div style={{ background: toast.type === 'success' ? 'var(--green-dim, #1a2e1a)' : 'var(--red-dim)', border: `1px solid ${toast.type === 'success' ? 'var(--green)' : 'var(--red)'}`, borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13, color: toast.type === 'success' ? 'var(--green)' : 'var(--red)', marginBottom: 16 }}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}

      {/* AI Provider */}
      <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--accent)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          AI Provider
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {PROVIDERS.map(p => (
            <label key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius)', border: `1px solid ${form.ai_provider === p.id ? 'var(--accent)' : 'var(--border)'}`, background: form.ai_provider === p.id ? 'var(--bg-card)' : 'transparent', cursor: 'pointer' }}>
              <input type="radio" name="ai_provider" value={p.id} checked={form.ai_provider === p.id} onChange={e => setForm(f => ({ ...f, ai_provider: e.target.value }))} style={{ marginTop: 2, accentColor: 'var(--accent)' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{p.sub}</div>
              </div>
            </label>
          ))}
        </div>
        <div style={{ ...hintStyle, marginTop: 8 }}>
          Leave unselected for auto-detection (Groq → Claude → Gemini → OpenRouter).
        </div>
      </div>

      {/* API Keys — AI */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          AI API Keys
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {KEY_INPUTS.filter(k => k.provider).map(({ field, label, placeholder, url }) => (
            <div key={field}>
              <label style={labelStyle}>{label}</label>
              <input
                type="password"
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                placeholder={form[field] ? '' : placeholder}
                style={{ width: '100%', boxSizing: 'border-box' }}
                autoComplete="off"
              />
              <div style={hintStyle}>
                Get your key at <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{url.replace('https://', '')}</a>
                {' · '}Leave blank to keep existing key. Clear and save to remove it.
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Keys — Data */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Data API Keys
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {KEY_INPUTS.filter(k => !k.provider).map(({ field, label, placeholder, url }) => (
            <div key={field}>
              <label style={labelStyle}>{label}</label>
              <input
                type="password"
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                placeholder={form[field] ? '' : placeholder}
                style={{ width: '100%', boxSizing: 'border-box' }}
                autoComplete="off"
              />
              <div style={hintStyle}>
                Get your key at <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{url.replace('https://', '')}</a>
                {' · '}Both are free with no payment required.
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => save()} disabled={saving}>
          {saving ? 'Saving…' : '✓ Save Settings'}
        </button>
        <button
          className="btn-secondary"
          onClick={() => { setTestResult(null); testAI(); }}
          disabled={testing}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', padding: '8px 14px', borderRadius: 'var(--radius)', fontSize: 13 }}
        >
          {testing ? 'Testing…' : '⚡ Test AI Connection'}
        </button>
      </div>

      {testResult && (
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 'var(--radius)', border: `1px solid ${testResult.ok ? 'var(--green, #4ade80)' : 'var(--red)'}`, background: testResult.ok ? 'var(--green-dim, #1a2e1a)' : 'var(--red-dim)', fontSize: 13 }}>
          {testResult.ok ? (
            <>
              <span style={{ color: 'var(--green, #4ade80)', fontWeight: 600 }}>✓ Connected</span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{testResult.provider} · {testResult.model}</span>
              <div style={{ color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>{testResult.response}</div>
            </>
          ) : (
            <span style={{ color: 'var(--red)' }}>⚠ {testResult.error}</span>
          )}
        </div>
      )}
    </div>
  );
}
