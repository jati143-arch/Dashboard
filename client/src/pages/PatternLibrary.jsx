import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { patternsApi, statsApi } from '../api/client.js';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';
import PnlBadge from '../components/shared/PnlBadge.jsx';

const CARD = {
  background: '#111111',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 24,
  padding: 28,
};

const TEXT_DIM = '#52525b';
const TEXT_SECONDARY = '#71717a';
const TEXT_PRIMARY = '#ffffff';
const GREEN = '#22ff88';
const RED = '#ff4444';

const PILL_BTN = {
  padding: '6px 14px',
  borderRadius: 9999,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'transparent',
  color: TEXT_SECONDARY,
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontWeight: 500,
};

function PatternCard({ pattern, stats, onExpand }) {
  const s = stats?.find(x => x.pattern_tag === pattern.slug);

  return (
    <div
      style={{ ...CARD, cursor: 'pointer', transition: 'all 0.2s', borderColor: 'rgba(255,255,255,0.06)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,255,136,0.3)'; e.currentTarget.style.background = '#141414'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = '#111111'; }}
      onClick={() => onExpand(pattern)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: TEXT_PRIMARY, fontFamily: 'Inter, system-ui, sans-serif' }}>{pattern.name}</div>
        {pattern.is_builtin ? null : <span style={{ fontSize: 9, color: GREEN, border: '1px solid rgba(34,255,136,0.3)', borderRadius: 9999, padding: '3px 10px', letterSpacing: '0.08em', fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>CUSTOM</span>}
      </div>

      <p style={{ fontSize: 13, color: TEXT_SECONDARY, lineHeight: 1.6, marginBottom: 16, fontFamily: 'Inter, system-ui, sans-serif', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {pattern.description}
      </p>

      {s ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <div>
            <div style={{ fontSize: 9, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>Trades</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 20, color: TEXT_PRIMARY }}>{s.total_trades}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>Win Rate</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 20, color: s.win_rate >= 50 ? GREEN : RED }}>{s.win_rate}%</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>Total P&L</div>
            <PnlBadge value={s.total_pnl} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>Avg P&L</div>
            <PnlBadge value={s.avg_pnl} />
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: TEXT_DIM, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14, fontFamily: 'Inter, system-ui, sans-serif' }}>
          No personal stats yet — tag a trade with this pattern
        </div>
      )}
    </div>
  );
}

function PatternDetail({ pattern, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, width: 560, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT_PRIMARY, fontFamily: 'Inter, system-ui, sans-serif' }}>{pattern.name}</h2>
          <button onClick={onClose} style={PILL_BTN}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>What It Is</div>
            <p style={{ fontSize: 14, color: TEXT_PRIMARY, lineHeight: 1.7, fontFamily: 'Inter, system-ui, sans-serif' }}>{pattern.description}</p>
          </div>
          {pattern.how_to_trade && (
            <div>
              <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>How to Trade It</div>
              <p style={{ fontSize: 14, color: TEXT_PRIMARY, lineHeight: 1.7, fontFamily: 'Inter, system-ui, sans-serif' }}>{pattern.how_to_trade}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PatternLibrary() {
  const [expanded, setExpanded] = useState(null);

  const { data: patterns = [], isLoading: pLoading } = useQuery({
    queryKey: ['patterns'],
    queryFn: patternsApi.list,
  });

  const { data: stats = [] } = useQuery({
    queryKey: ['stats-by-pattern'],
    queryFn: statsApi.byPattern,
  });

  if (pLoading) return <LoadingSpinner text="Loading patterns..." />;

  const builtin = patterns.filter(p => p.is_builtin);
  const custom = patterns.filter(p => !p.is_builtin);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif' }}>
          {patterns.length} chart patterns loaded · Click any card to see full details · Stats update as you tag trades
        </p>
      </div>

      {builtin.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Classic Patterns ({builtin.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 36 }}>
            {builtin.map(p => <PatternCard key={p.slug} pattern={p} stats={stats} onExpand={setExpanded} />)}
          </div>
        </>
      )}

      {custom.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
            My Custom Patterns ({custom.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {custom.map(p => <PatternCard key={p.slug} pattern={p} stats={stats} onExpand={setExpanded} />)}
          </div>
        </>
      )}

      {expanded && <PatternDetail pattern={expanded} onClose={() => setExpanded(null)} />}
    </div>
  );
}