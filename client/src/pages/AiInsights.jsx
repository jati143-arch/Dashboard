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
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 13,
    color: '#ffffff',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.9,
    background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 24,
    padding: 20,
    margin: 0,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <p style={{ color: '#71717a', fontSize: 13, margin: 0, lineHeight: 1.6, flex: 1, fontFamily: "'Inter', system-ui, sans-serif" }}>
          AI-powered analysis of your full trading portfolio. Responses are saved and only regenerated when you click the button.
        </p>
        {providerInfo && (
          <span style={{
            padding: '6px 14px',
            borderRadius: 9999,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            background: providerInfo.provider === 'groq' ? 'rgba(34,255,136,0.15)' : providerInfo.provider === 'claude' ? 'rgba(165,180,252,0.15)' : providerInfo.provider === 'gemini' ? 'rgba(125,211,252,0.15)' : providerInfo.provider === 'openrouter' ? 'rgba(216,180,254,0.15)' : '#111111',
            color: providerInfo.provider === 'groq' ? '#86efac' : providerInfo.provider === 'claude' ? '#a5b4fc' : providerInfo.provider === 'gemini' ? '#7dd3fc' : providerInfo.provider === 'openrouter' ? '#d8b4fe' : '#52525b',
            border: '1px solid rgba(255,255,255,0.06)',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            {providerInfo.provider === 'none' ? '⚠ No AI key' : `✦ ${providerInfo.provider === 'groq' ? 'Groq · Free' : providerInfo.provider === 'claude' ? 'Claude' : providerInfo.provider === 'gemini' ? 'Gemini' : 'OpenRouter'}`}
            {providerInfo.model && <span style={{ opacity: 0.7, marginLeft: 6, fontSize: 10 }}>({providerInfo.model})</span>}
          </span>
        )}
      </div>

      {aiError && (
        <div style={{
          background: 'rgba(255,68,68,0.12)',
          border: '1px solid #ff4444',
          borderRadius: 24,
          padding: '12px 18px',
          color: '#ff4444',
          fontSize: 13,
          marginBottom: 20,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          ⚠ {aiError}
        </div>
      )}

      {/* Portfolio Analysis */}
      <div style={{
        padding: 28,
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 24,
        marginBottom: 20,
        borderLeft: '3px solid #22ff88',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#52525b',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 6,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              Portfolio Analysis
            </div>
            <div style={{ fontSize: 13, color: '#71717a', fontFamily: "'Inter', system-ui, sans-serif" }}>
              Reviews your entire trade history — win rate, patterns, strengths, weaknesses and an action plan
            </div>
            {saved?.updated_at && (
              <div style={{ fontSize: 11, color: '#52525b', marginTop: 6, fontFamily: "'Inter', system-ui, sans-serif" }}>
                Last generated: {fmtDate(saved.updated_at)}
              </div>
            )}
          </div>
          <button
            onClick={() => runAnalysis()}
            disabled={analyzing}
            style={{
              padding: '10px 20px',
              background: '#22ff88',
              border: 'none',
              borderRadius: 9999,
              color: '#050505',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'opacity 0.15s',
            }}
          >
            {analyzing ? 'Analysing...' : saved?.insight ? '↻ Refresh Analysis' : '✦ Analyse My Portfolio'}
          </button>
        </div>

        {analyzing ? (
          <LoadingSpinner text="AI is reviewing your full portfolio..." size={24} />
        ) : saved?.insight ? (
          <pre style={preStyle}>{saved.insight}</pre>
        ) : (
          <div style={{ textAlign: 'center', padding: 32, color: '#52525b', fontSize: 13 }}>
            Click "Analyse My Portfolio" to get a full coaching review of all your trades.
          </div>
        )}
      </div>

      {/* Pattern Explainer */}
      <div style={{
        padding: 28,
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 24,
        marginBottom: 20,
        borderLeft: '3px solid #ffd60a',
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#52525b',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 6,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          Pattern Deep Dive
        </div>
        <div style={{ fontSize: 13, color: '#71717a', marginBottom: 20, fontFamily: "'Inter', system-ui, sans-serif" }}>
          AI gives you a practical tip beyond what's in the pattern library — things beginners often miss
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <select
            value={selectedPattern}
            onChange={e => { setSelectedPattern(e.target.value); setPatternExplanation(''); }}
            style={{
              flex: 1,
              minWidth: 200,
              padding: '10px 14px',
              background: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 24,
              color: '#ffffff',
              fontSize: 13,
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">— Pick a pattern —</option>
            {patterns.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
          <button
            onClick={() => explainPattern()}
            disabled={!selectedPattern || explaining}
            style={{
              padding: '10px 20px',
              background: '#ffd60a',
              border: 'none',
              borderRadius: 9999,
              color: '#050505',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {explaining ? 'Thinking...' : '✦ Explain It'}
          </button>
        </div>

        {explaining ? (
          <LoadingSpinner text="AI is thinking..." size={24} />
        ) : patternExplanation ? (
          <pre style={preStyle}>{patternExplanation}</pre>
        ) : (
          <div style={{ textAlign: 'center', padding: 24, color: '#52525b', fontSize: 13 }}>
            Select a pattern above to get a practical tip.
          </div>
        )}
      </div>

      {/* AI Portfolio Chat */}
      <div style={{
        padding: 28,
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 24,
        borderLeft: '3px solid #22ff88',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#52525b',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            Chat With AI About Your Portfolio
          </div>
          {chatMessages.length > 0 && (
            <button
              onClick={() => { setChatMessages([]); setChatError(''); }}
              style={{
                fontSize: 11,
                color: '#52525b',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#71717a', marginBottom: 20, fontFamily: "'Inter', system-ui, sans-serif" }}>
          Ask anything about your trades. The AI has full access to your portfolio data.
        </div>

        {chatError && (
          <div style={{
            background: 'rgba(255,68,68,0.12)',
            border: '1px solid #ff4444',
            borderRadius: 24,
            padding: '10px 14px',
            color: '#ff4444',
            fontSize: 12,
            marginBottom: 16,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            ⚠ {chatError}
          </div>
        )}

        {/* Message list */}
        {chatMessages.length > 0 && (
          <div style={{
            maxHeight: 400,
            overflowY: 'auto',
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {chatMessages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '12px 18px',
                  borderRadius: 24,
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  background: m.role === 'user' ? '#22ff88' : '#0a0a0a',
                  color: m.role === 'user' ? '#050505' : '#ffffff',
                  border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  fontFamily: "'Inter', system-ui, sans-serif",
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
                  background: '#0a0a0a',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#52525b',
                  fontSize: 12,
                  fontStyle: 'italic',
                  fontFamily: "'Inter', system-ui, sans-serif",
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
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: '#0a0a0a',
                  color: '#71717a',
                  cursor: 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  transition: 'border-color 0.15s, color 0.15s',
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
            style={{
              flex: 1,
              resize: 'none',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 13,
              lineHeight: 1.6,
              padding: '12px 16px',
              background: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 24,
              color: '#ffffff',
              outline: 'none',
            }}
            disabled={chatting}
          />
          <button
            onClick={handleChatSend}
            disabled={!chatInput.trim() || chatting}
            style={{
              padding: '12px 20px',
              background: '#ffffff',
              border: 'none',
              borderRadius: 9999,
              color: '#050505',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
              alignSelf: 'flex-end',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.15s',
            }}
          >
            {chatting ? '…' : 'Send ↵'}
          </button>
        </div>
      </div>
    </div>
  );
}