import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi, patternsApi, aiProviderApi } from '../api/client.js';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';
import { useState } from 'react';

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AiInsights() {
  const [selectedPattern, setSelectedPattern] = useState('');
  const [patternExplanation, setPatternExplanation] = useState('');
  const [aiError, setAiError] = useState('');
  const qc = useQueryClient();

  const { data: providerInfo } = useQuery({ queryKey: ['ai-provider'], queryFn: aiProviderApi.get });

  const { data: saved } = useQuery({
    queryKey: ['portfolio-analysis'],
    queryFn: aiApi.getPortfolioAnalysis,
  });

  const { data: patterns = [] } = useQuery({
    queryKey: ['patterns'],
    queryFn: patternsApi.list,
  });

  const { mutate: runAnalysis, isPending: analyzing } = useMutation({
    mutationFn: aiApi.portfolioAnalysis,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio-analysis'] });
      setAiError('');
    },
    onError: (e) => setAiError(e.response?.data?.error || 'AI analysis failed. Check your API key.'),
  });

  const { mutate: explainPattern, isPending: explaining } = useMutation({
    mutationFn: () => aiApi.explainPattern(selectedPattern),
    onSuccess: (data) => {
      setPatternExplanation(data.explanation);
      setAiError('');
    },
    onError: (e) => setAiError(e.response?.data?.error || 'Failed to fetch explanation. Check your API key.'),
  });

  const preStyle = {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.9,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: 16,
    margin: 0,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, lineHeight: 1.6, flex: 1 }}>
          AI-powered analysis of your full trading portfolio. Responses are saved and only regenerated when you click the button.
        </p>
        {providerInfo && (
          <span style={{
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            background: providerInfo.provider === 'groq' ? '#1a3a1a' : providerInfo.provider === 'claude' ? '#1a1a3a' : 'var(--bg-card)',
            color: providerInfo.provider === 'groq' ? '#86efac' : providerInfo.provider === 'claude' ? '#a5b4fc' : 'var(--text-dim)',
            border: '1px solid var(--border)',
          }}>
            {providerInfo.provider === 'groq' ? '✦ Groq · Free' : providerInfo.provider === 'claude' ? '✦ Claude' : '⚠ No AI key'}
            {providerInfo.model && <span style={{ opacity: 0.7, marginLeft: 4, fontSize: 10 }}>({providerInfo.model})</span>}
          </span>
        )}
      </div>

      {aiError && (
        <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
          ⚠ {aiError}
        </div>
      )}

      {/* Portfolio Analysis */}
      <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Portfolio Analysis
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Reviews your entire trade history — win rate, patterns, strengths, weaknesses and an action plan
            </div>
            {saved?.updated_at && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                Last generated: {fmtDate(saved.updated_at)}
              </div>
            )}
          </div>
          <button className="btn-primary" onClick={() => runAnalysis()} disabled={analyzing}>
            {analyzing ? 'Analysing...' : saved?.insight ? '↻ Refresh Analysis' : '✦ Analyse My Portfolio'}
          </button>
        </div>

        {analyzing ? (
          <LoadingSpinner text="AI is reviewing your full portfolio..." size={24} />
        ) : saved?.insight ? (
          <pre style={preStyle}>{saved.insight}</pre>
        ) : (
          <div className="empty-state">
            Click "Analyse My Portfolio" to get a full coaching review of all your trades.
          </div>
        )}
      </div>

      {/* Pattern Explainer */}
      <div className="card" style={{ borderLeft: '3px solid var(--yellow)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Pattern Deep Dive
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
          AI gives you a practical tip beyond what's in the pattern library — things beginners often miss
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <select
            value={selectedPattern}
            onChange={e => { setSelectedPattern(e.target.value); setPatternExplanation(''); }}
            style={{ flex: 1, minWidth: 200 }}
          >
            <option value="">— Pick a pattern —</option>
            {patterns.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
          <button
            className="btn-primary"
            style={{ background: 'var(--yellow)', color: '#000' }}
            onClick={() => explainPattern()}
            disabled={!selectedPattern || explaining}
          >
            {explaining ? 'Thinking...' : '✦ Explain It'}
          </button>
        </div>

        {explaining ? (
          <LoadingSpinner text="AI is thinking..." size={24} />
        ) : patternExplanation ? (
          <pre style={preStyle}>{patternExplanation}</pre>
        ) : (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            Select a pattern above to get a practical tip.
          </div>
        )}
      </div>
    </div>
  );
}
