import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { patternsApi, statsApi } from '../api/client.js';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';
import PnlBadge from '../components/shared/PnlBadge.jsx';

function PatternCard({ pattern, stats, onExpand }) {
  const s = stats?.find(x => x.pattern_tag === pattern.slug);

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', transition: 'border-color 0.15s', borderColor: 'var(--border)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      onClick={() => onExpand(pattern)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'var(--text-primary)' }}>{pattern.name}</div>
        {pattern.is_builtin ? null : <span style={{ fontSize: 9, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 3, padding: '1px 5px', letterSpacing: '0.06em' }}>CUSTOM</span>}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {pattern.description}
      </p>

      {s ? (
        <div style={{ display: 'flex', gap: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trades</div>
            <div style={{ fontFamily: 'var(--text-mono)', fontWeight: 700 }}>{s.total_trades}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Win Rate</div>
            <div style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, color: s.win_rate >= 50 ? 'var(--green)' : 'var(--red)' }}>{s.win_rate}%</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total P&L</div>
            <PnlBadge value={s.total_pnl} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Avg P&L</div>
            <PnlBadge value={s.avg_pnl} />
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
          No personal stats yet — tag a trade with this pattern
        </div>
      )}
    </div>
  );
}

function PatternDetail({ pattern, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: 560, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{pattern.name}</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '4px 10px' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>What It Is</div>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>{pattern.description}</p>
          </div>
          {pattern.how_to_trade && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>How to Trade It</div>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>{pattern.how_to_trade}</p>
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
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {patterns.length} chart patterns loaded · Click any card to see full details · Stats update as you tag trades
        </p>
      </div>

      {builtin.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Classic Patterns ({builtin.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 32 }}>
            {builtin.map(p => <PatternCard key={p.slug} pattern={p} stats={stats} onExpand={setExpanded} />)}
          </div>
        </>
      )}

      {custom.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            My Custom Patterns ({custom.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {custom.map(p => <PatternCard key={p.slug} pattern={p} stats={stats} onExpand={setExpanded} />)}
          </div>
        </>
      )}

      {expanded && <PatternDetail pattern={expanded} onClose={() => setExpanded(null)} />}
    </div>
  );
}
