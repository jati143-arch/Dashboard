import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dailyApi } from '../../api/client.js';

export default function BestSetups({ date, setups = [], lesson }) {
  const qc = useQueryClient();
  const [editingSetups, setEditingSetups] = useState(false);
  const [editingLesson, setEditingLesson] = useState(false);
  const [localSetups, setLocalSetups] = useState(setups);
  const [localLesson, setLocalLesson] = useState(lesson || '');
  const [newSetup, setNewSetup] = useState({ symbol: '', pattern: '', notes: '' });

  const { mutate: save } = useMutation({
    mutationFn: (data) => dailyApi.update(date, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily', date] });
      setEditingSetups(false);
      setEditingLesson(false);
    },
  });

  function addSetup() {
    if (!newSetup.symbol) return;
    const updated = [...localSetups, { ...newSetup, symbol: newSetup.symbol.toUpperCase() }];
    setLocalSetups(updated);
    setNewSetup({ symbol: '', pattern: '', notes: '' });
  }

  function removeSetup(i) {
    setLocalSetups(localSetups.filter((_, idx) => idx !== i));
  }

  const cardStyle = {
    background: 'rgba(20,20,25,0.6)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 24,
    padding: 28,
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: '#52525b',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontFamily: "'JetBrains Mono', monospace",
  };

  const monoStyle = {
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700,
    color: '#00d4ff',
  };

  const borderStyle = {
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  };

  const inputBase = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 9999,
    padding: '8px 14px',
    color: '#ffffff',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    outline: 'none',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={labelStyle}>Best Setups Today</span>
          <button
            onClick={() => { setEditingSetups(!editingSetups); setLocalSetups(setups); }}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: 9999,
              color: '#ffffff',
              padding: '4px 12px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {editingSetups ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editingSetups ? (
          <>
            {localSetups.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', ...borderStyle }}>
                <span style={monoStyle}>{s.symbol}</span>
                <span style={{ flex: 1, margin: '0 12px', fontSize: 12, color: '#71717a' }}>{s.pattern} {s.notes && `· ${s.notes}`}</span>
                <button
                  onClick={() => removeSetup(i)}
                  style={{
                    background: 'rgba(255,68,68,0.1)',
                    border: 'none',
                    borderRadius: 9999,
                    color: '#ff4444',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '2px 8px',
                  }}
                >✕</button>
              </div>
            ))}
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                placeholder="Symbol"
                value={newSetup.symbol}
                onChange={e => setNewSetup(p => ({ ...p, symbol: e.target.value }))}
                style={{ ...inputBase, width: 80 }}
              />
              <input
                placeholder="Pattern"
                value={newSetup.pattern}
                onChange={e => setNewSetup(p => ({ ...p, pattern: e.target.value }))}
                style={{ ...inputBase, flex: 1 }}
              />
              <input
                placeholder="Notes"
                value={newSetup.notes}
                onChange={e => setNewSetup(p => ({ ...p, notes: e.target.value }))}
                style={{ ...inputBase, flex: 1 }}
              />
              <button
                onClick={addSetup}
                style={{
                  background: '#ffffff',
                  border: 'none',
                  borderRadius: 9999,
                  color: '#000000',
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >+ Add</button>
            </div>
            <button
              onClick={() => save({ best_setups: localSetups, lesson_of_day: lesson })}
              style={{
                marginTop: 14,
                background: '#00d4ff',
                border: 'none',
                borderRadius: 9999,
                color: '#000000',
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >Save Setups</button>
          </>
        ) : (
          <>
            {setups.length === 0 && (
              <div style={{ color: '#52525b', fontSize: 13, fontStyle: 'italic', padding: '16px 0' }}>
                No setups logged yet.
              </div>
            )}
            {setups.map((s, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < setups.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <span style={{ ...monoStyle, marginRight: 10 }}>{s.symbol}</span>
                {s.pattern && <span style={{ fontSize: 12, color: '#71717a', fontStyle: 'italic' }}>{s.pattern}</span>}
                {s.notes && <div style={{ fontSize: 12, color: '#52525b', marginTop: 4 }}>{s.notes}</div>}
              </div>
            ))}
          </>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={labelStyle}>Lesson of the Day</span>
          <button
            onClick={() => { setEditingLesson(!editingLesson); setLocalLesson(lesson || ''); }}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: 9999,
              color: '#ffffff',
              padding: '4px 12px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {editingLesson ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editingLesson ? (
          <>
            <textarea
              rows={5}
              value={localLesson}
              onChange={e => setLocalLesson(e.target.value)}
              placeholder="What did you learn today? What would you do differently?"
              style={{
                resize: 'vertical',
                fontSize: 13,
                lineHeight: 1.6,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '12px 16px',
                color: '#ffffff',
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
              }}
            />
            <button
              onClick={() => save({ best_setups: setups, lesson_of_day: localLesson })}
              style={{
                marginTop: 12,
                background: '#00d4ff',
                border: 'none',
                borderRadius: 9999,
                color: '#000000',
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >Save Lesson</button>
          </>
        ) : (
          <div style={{
            fontSize: 13,
            color: lesson ? '#ffffff' : '#52525b',
            lineHeight: 1.7,
            fontStyle: lesson ? 'normal' : 'italic',
          }}>
            {lesson || 'No lesson recorded yet. Click Edit to add one.'}
          </div>
        )}
      </div>
    </div>
  );
}