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

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    color: '#52525b',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 8,
    display: 'block',
    fontFamily: "'Inter', system-ui, sans-serif",
  };
  const hintStyle = {
    fontSize: 11,
    color: '#52525b',
    marginTop: 6,
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 14px',
    background: '#050505',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 24,
    color: '#ffffff',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace",
    outline: 'none',
  };

  if (isLoading) return <div style={{ color: '#52525b', padding: 24, fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}>Settings</h2>
        <p style={{ fontSize: 13, color: '#71717a', margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>
          Your API keys are stored securely in your own Google Drive — only you can access them.
        </p>
      </div>

      {toast && (
        <div style={{
          background: toast.type === 'success' ? 'rgba(34,255,136,0.12)' : 'rgba(255,68,68,0.12)',
          border: `1px solid ${toast.type === 'success' ? '#22ff88' : '#ff4444'}`,
          borderRadius: 24,
          padding: '12px 18px',
          fontSize: 13,
          color: toast.type === 'success' ? '#22ff88' : '#ff4444',
          marginBottom: 20,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}

      {/* AI Provider - pill radio buttons */}
      <div style={{
        padding: 28,
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 24,
        marginBottom: 16,
        borderLeft: '3px solid #22ff88',
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#52525b',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 16,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          AI Provider
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {PROVIDERS.map(p => (
            <label
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 18px',
                borderRadius: 24,
                border: `1px solid ${form.ai_provider === p.id ? '#22ff88' : 'rgba(255,255,255,0.06)'}`,
                background: form.ai_provider === p.id ? 'rgba(34,255,136,0.08)' : 'transparent',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <input
                type="radio"
                name="ai_provider"
                value={p.id}
                checked={form.ai_provider === p.id}
                onChange={e => setForm(f => ({ ...f, ai_provider: e.target.value }))}
                style={{ marginTop: 4, accentColor: '#22ff88', width: 16, height: 16 }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', marginBottom: 4, fontFamily: "'Inter', system-ui, sans-serif" }}>{p.label}</div>
                <div style={{ fontSize: 11, color: '#52525b', fontFamily: "'Inter', system-ui, sans-serif" }}>{p.sub}</div>
              </div>
            </label>
          ))}
        </div>
        <div style={{ ...hintStyle, marginTop: 12 }}>
          Leave unselected for auto-detection (Groq → Claude → Gemini → OpenRouter).
        </div>
      </div>

      {/* API Keys — AI */}
      <div style={{
        padding: 28,
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 24,
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#52525b',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 16,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          AI API Keys
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {KEY_INPUTS.filter(k => k.provider).map(({ field, label, placeholder, url }) => (
            <div key={field}>
              <label style={labelStyle}>{label}</label>
              <input
                type="password"
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                placeholder={form[field] ? '' : placeholder}
                style={inputStyle}
                autoComplete="off"
              />
              <div style={hintStyle}>
                Get your key at <a href={url} target="_blank" rel="noreferrer" style={{ color: '#22ff88', textDecoration: 'none' }}>{url.replace('https://', '')}</a>
                {' · '}Leave blank to keep existing key. Clear and save to remove it.
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Keys — Data */}
      <div style={{
        padding: 28,
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 24,
        marginBottom: 20,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#52525b',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 16,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          Data API Keys
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {KEY_INPUTS.filter(k => !k.provider).map(({ field, label, placeholder, url }) => (
            <div key={field}>
              <label style={labelStyle}>{label}</label>
              <input
                type="password"
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                placeholder={form[field] ? '' : placeholder}
                style={inputStyle}
                autoComplete="off"
              />
              <div style={hintStyle}>
                Get your key at <a href={url} target="_blank" rel="noreferrer" style={{ color: '#22ff88', textDecoration: 'none' }}>{url.replace('https://', '')}</a>
                {' · '}Both are free with no payment required.
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <button
          onClick={() => save()}
          disabled={saving}
          style={{
            padding: '12px 24px',
            background: '#ffffff',
            border: 'none',
            borderRadius: 9999,
            color: '#050505',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {saving ? 'Saving…' : '✓ Save Settings'}
        </button>
        <button
          onClick={() => { setTestResult(null); testAI(); }}
          disabled={testing}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '12px 24px',
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {testing ? 'Testing…' : '⚡ Test AI Connection'}
        </button>
      </div>

      {testResult && (
        <div style={{
          marginTop: 16,
          padding: '14px 20px',
          borderRadius: 24,
          border: `1px solid ${testResult.ok ? '#22ff88' : '#ff4444'}`,
          background: testResult.ok ? 'rgba(34,255,136,0.08)' : 'rgba(255,68,68,0.08)',
          fontSize: 13,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {testResult.ok ? (
            <>
              <span style={{ color: '#22ff88', fontWeight: 700 }}>✓ Connected</span>
              <span style={{ color: '#71717a', marginLeft: 10 }}>{testResult.provider} · {testResult.model}</span>
              <div style={{ color: '#71717a', marginTop: 6, fontStyle: 'italic' }}>{testResult.response}</div>
            </>
          ) : (
            <span style={{ color: '#ff4444' }}>⚠ {testResult.error}</span>
          )}
        </div>
      )}
    </div>
  );
}