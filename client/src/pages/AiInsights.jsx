import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi, patternsApi, aiProviderApi } from '../api/client.js';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';
import { useState, useRef, useEffect } from 'react';

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AiInsights() {
  const [selectedPattern, setSelectedPattern] = useState('');
  const [patternExplanation, setPatternExplanation] = useState('');
  const [aiError, setAiError] = useState('');

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState('');
  const chatBottomRef = useRef(null);

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
    onError: (e) => setAiError(e.response?.data?.error || 'AI analysis failed. Check your API key in Settings.'),
  });

  const { mutate: explainPattern, isPending: explaining } = useMutation({
    mutationFn: () => aiApi.explainPattern(selectedPattern),
    onSuccess: (data) => {
      setPatternExplanation(data.explanation);
      setAiError('');
    },
    onError: (e) => setAiError(e.response?.data?.error || 'Failed to fetch explanation. Check your API key in Settings.'),
  });

  const { mutate: sendChat, isPending: chatting } = useMutation({
    mutationFn: (messages) => aiApi.chat(messages),
    onSuccess: (data) => {
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      setChatError('');
    },
    onError: (e) => setChatError(e.response?.data?.error || 'Chat failed. Check your API key in Settings.'),
  });

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatting]);

  function handleChatSend() {
    const text = chatInput.trim();
    if (!text || chatting) return;
    const updated = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(updated);
    setChatInput('');
    sendChat(updated);
  }

  function handleChatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  }

  const preStyle = {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    color: 'var(--color-text-primary)',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.9,
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 24,
    padding: 20,
    margin: 0,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, margin: 0, lineHeight: 1.6, flex: 1 }}>
          AI-powered analysis of your full trading portfolio. Responses are saved and only regenerated when you click the button.
        </p>
        {providerInfo && (
          <span style={{
            padding: '6px 14px',
            borderRadius: 9999,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            background: providerInfo.provider === 'groq' ? 'rgba(34,255,136,0.15)' : providerInfo.provider === 'claude' ? 'rgba(165,180,252,0.15)' : providerInfo.provider === 'gemini' ? 'rgba(125,211,252,0.15)' : providerInfo.provider === 'openrouter' ? 'rgba(216,180,254,0.15)' : 'var(--color-bg-card)',
            color: providerInfo.provider === 'groq' ? '#86efac' : providerInfo.provider === 'claude' ? '#a5b4fc' : providerInfo.provider === 'gemini' ? '#7dd3fc' : providerInfo.provider === 'openrouter' ? '#d8b4fe' : 'var(--color-text-dim)',
            border: '1px solid var(--color-border)',
          }}>
            {providerInfo.provider === 'none' ? '⚠ No AI key' : `✦ ${providerInfo.provider === 'groq' ? 'Groq · Free' : providerInfo.provider === 'claude' ? 'Claude' : providerInfo.provider === 'gemini' ? 'Gemini' : 'OpenRouter'}`}
            {providerInfo.model && <span style={{ opacity: 0.7, marginLeft: 6, fontSize: 10 }}>({providerInfo.model})</span>}
          </span>
        )}
      </div>

      {aiError && (
        <div className="card-glass" style={{ marginBottom: 20, borderLeft: '3px solid var(--color-red)', padding: '12px 18px', color: 'var(--color-red)' }}>
          ⚠ {aiError}
        </div>
      )}

      {/* Portfolio Analysis */}
      <div className="card-glass" style={{ marginBottom: 16, borderLeft: '3px solid var(--color-accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 6 }}>Portfolio Analysis</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Reviews your entire trade history — win rate, patterns, strengths, weaknesses and an action plan
            </div>
            {saved?.updated_at && (
              <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 6 }}>
                Last generated: {fmtDate(saved.updated_at)}
              </div>
            )}
          </div>
          <button
            onClick={() => runAnalysis()}
            disabled={analyzing}
            className="btn-primary"
            style={{ padding: '10px 20px' }}
          >
            {analyzing ? 'Analysing...' : saved?.insight ? '↻ Refresh Analysis' : '✦ Analyse My Portfolio'}
          </button>
        </div>

        {analyzing ? (
          <LoadingSpinner text="AI is reviewing your full portfolio..." size={24} />
        ) : saved?.insight ? (
          <pre style={preStyle}>{saved.insight}</pre>
        ) : (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-dim)', fontSize: 13 }}>
            Click "Analyse My Portfolio" to get a full coaching review of all your trades.
          </div>
        )}
      </div>

      {/* Pattern Explainer */}
      <div className="card-glass" style={{ marginBottom: 16, borderLeft: '3px solid var(--color-yellow)' }}>
        <div className="section-label" style={{ marginBottom: 6 }}>Pattern Deep Dive</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
          AI gives you a practical tip beyond what's in the pattern library — things beginners often miss
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <select
            value={selectedPattern}
            onChange={e => { setSelectedPattern(e.target.value); setPatternExplanation(''); }}
            style={{ flex: 1, minWidth: 200 }}
          >
            <option value="">— Pick a pattern —</option>
            {patterns.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
          <button
            onClick={() => explainPattern()}
            disabled={!selectedPattern || explaining}
            className="btn-primary"
            style={{ background: 'var(--color-yellow)', color: '#000' }}
          >
            {explaining ? 'Thinking...' : '✦ Explain It'}
          </button>
        </div>

        {explaining ? (
          <LoadingSpinner text="AI is thinking..." size={24} />
        ) : patternExplanation ? (
          <pre style={preStyle}>{patternExplanation}</pre>
        ) : (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-dim)', fontSize: 13 }}>
            Select a pattern above to get a practical tip.
          </div>
        )}
      </div>

      {/* AI Portfolio Chat */}
      <div className="card-glass" style={{ borderLeft: '3px solid var(--color-accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div className="section-label">Chat With AI About Your Portfolio</div>
          {chatMessages.length > 0 && (
            <button
              onClick={() => { setChatMessages([]); setChatError(''); }}
              style={{ fontSize: 11, color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
            >
              Clear
            </button>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
          Ask anything about your trades. The AI has full access to your portfolio data.
        </div>

        {chatError && (
          <div className="card-glass" style={{ marginBottom: 16, borderLeft: '3px solid var(--color-red)', padding: '10px 14px', color: 'var(--color-red)' }}>
            ⚠ {chatError}
          </div>
        )}

        {/* Message list */}
        {chatMessages.length > 0 && (
          <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chatMessages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '12px 18px',
                  borderRadius: 24,
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  background: m.role === 'user' ? 'var(--color-accent)' : 'var(--color-bg-surface)',
                  color: m.role === 'user' ? '#000' : 'var(--color-text-primary)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--color-border)',
                  fontWeight: m.role === 'user' ? 600 : 400,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {chatting && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '12px 18px',
                  borderRadius: 24,
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-dim)',
                  fontSize: 12,
                  fontStyle: 'italic',
                }}>
                  AI is thinking…
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
        )}

        {chatMessages.length === 0 && !chatting && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {['Which pattern makes me the most money?', 'What is my biggest weakness?', 'Compare my LONG vs SHORT performance'].map(q => (
              <button
                key={q}
                onClick={() => {
                  setChatInput(q);
                  const updated = [...chatMessages, { role: 'user', content: q }];
                  setChatMessages(updated);
                  setChatInput('');
                  sendChat(updated);
                }}
                style={{
                  fontSize: 11,
                  padding: '8px 14px',
                  borderRadius: 9999,
                  border: '1px solid var(--color-border-bright)',
                  background: 'var(--color-bg-surface)',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ display: 'flex', gap: 10 }}>
          <textarea
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={handleChatKey}
            placeholder="Ask anything about your portfolio… (Enter to send, Shift+Enter for newline)"
            rows={2}
            style={{ flex: 1, resize: 'none' }}
            disabled={chatting}
          />
          <button
            onClick={handleChatSend}
            disabled={!chatInput.trim() || chatting}
            className="btn-primary"
            style={{ padding: '12px 20px', alignSelf: 'flex-end', whiteSpace: 'nowrap' }}
          >
            {chatting ? '…' : 'Send ↵'}
          </button>
        </div>
      </div>
    </div>
  );
}