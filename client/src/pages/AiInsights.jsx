import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi, patternsApi, dailyApi, aiProviderApi } from '../api/client.js';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AiInsights() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedPattern, setSelectedPattern] = useState('');
  const [patternExplanation, setPatternExplanation] = useState('');
  const [aiError, setAiError] = useState('');

  const qc = useQueryClient();

  const { data: providerInfo } = useQuery({ queryKey: ['ai-provider'], queryFn: aiProviderApi.get });

  const { data: daily } = useQuery({
    queryKey: ['daily', selectedDate],
    queryFn: () => dailyApi.get(selectedDate),
  });

  const { data: patterns = [] } = useQuery({
    queryKey: ['patterns'],
    queryFn: patternsApi.list,
  });

  const { mutate: runAnalysis, isPending: analyzing } = useMutation({
    mutationFn: () => aiApi.dailyAnalysis(selectedDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily', selectedDate] });
      setAiError('');
    },
    onError: (e) => setAiError(e.response?.data?.error || 'AI analysis failed. Check your API key in server/.env'),
  });

  const { mutate: explainPattern, isPending: explaining } = useMutation({
    mutationFn: () => aiApi.explainPattern(selectedPattern),
    onSuccess: (data) => {
      setPatternExplanation(data.explanation);
      setAiError('');
    },
    onError: (e) => setAiError(e.response?.data?.error || 'Failed to fetch explanation. Check your API key.'),
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, lineHeight: 1.6, flex: 1 }}>
          AI-powered tools for your trading. Responses are saved — you're only charged when you click the button.
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

      {/* Daily Analysis */}
      <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Daily Trade Analysis
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Claude reviews your trades and gives coaching feedback
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ width: 150 }}
            />
            <button
              className="btn-primary"
              onClick={() => runAnalysis()}
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : daily?.ai_insight ? '↻ Refresh' : '✦ Get Insight'}
            </button>
          </div>
        </div>

        {analyzing ? (
          <LoadingSpinner text="Claude is reviewing your trades..." size={24} />
        ) : daily?.ai_insight ? (
          <pre style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.8,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 16,
          }}>
            {daily.ai_insight}
          </pre>
        ) : (
          <div className="empty-state">
            No analysis for {selectedDate} yet. Add some trades then click "Get Insight."
          </div>
        )}
      </div>

      {/* Pattern Explainer */}
      <div className="card" style={{ borderLeft: '3px solid var(--yellow)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Pattern Deep Dive
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Claude gives you a practical tip beyond what's in the pattern library — things beginners often miss
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
          <LoadingSpinner text="Claude is thinking..." size={24} />
        ) : patternExplanation ? (
          <pre style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.8,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 16,
          }}>
            {patternExplanation}
          </pre>
        ) : (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            Select a pattern above to get a practical tip from Claude.
          </div>
        )}
      </div>

      {/* Setup guide link */}
      <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Need an API Key?
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          See the <strong style={{ color: 'var(--text-primary)' }}>README.md</strong> in the project root for step-by-step instructions on getting your free Anthropic API key
          and adding it to <code style={{ color: 'var(--accent)', background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 3 }}>server/.env</code>.
        </p>
      </div>
    </div>
  );
}
