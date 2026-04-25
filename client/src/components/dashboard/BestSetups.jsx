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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
      {/* Best Setups */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Best Setups Today
          </span>
          <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}
            onClick={() => { setEditingSetups(!editingSetups); setLocalSetups(setups); }}>
            {editingSetups ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editingSetups ? (
          <>
            {localSetups.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, color: 'var(--accent)' }}>{s.symbol}</span>
                <span style={{ flex: 1, margin: '0 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{s.pattern} {s.notes && `· ${s.notes}`}</span>
                <button onClick={() => removeSetup(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}>✕</button>
              </div>
            ))}
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input placeholder="Symbol" value={newSetup.symbol} onChange={e => setNewSetup(p => ({ ...p, symbol: e.target.value }))} style={{ width: 80 }} />
              <input placeholder="Pattern" value={newSetup.pattern} onChange={e => setNewSetup(p => ({ ...p, pattern: e.target.value }))} style={{ flex: 1 }} />
              <input placeholder="Notes" value={newSetup.notes} onChange={e => setNewSetup(p => ({ ...p, notes: e.target.value }))} style={{ flex: 1 }} />
              <button className="btn-ghost" onClick={addSetup} style={{ padding: '6px 10px' }}>+ Add</button>
            </div>
            <button className="btn-primary" onClick={() => save({ best_setups: localSetups, lesson_of_day: lesson })} style={{ marginTop: 12 }}>Save Setups</button>
          </>
        ) : (
          <>
            {setups.length === 0 && <div className="empty-state" style={{ padding: '16px 0' }}>No setups logged yet.</div>}
            {setups.map((s, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < setups.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <span style={{ fontFamily: 'var(--text-mono)', fontWeight: 700, color: 'var(--accent)', marginRight: 8 }}>{s.symbol}</span>
                {s.pattern && <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{s.pattern}</span>}
                {s.notes && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{s.notes}</div>}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Lesson of the Day */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Lesson of the Day
          </span>
          <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}
            onClick={() => { setEditingLesson(!editingLesson); setLocalLesson(lesson || ''); }}>
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
              style={{ resize: 'vertical', fontSize: 13, lineHeight: 1.6 }}
            />
            <button className="btn-primary" onClick={() => save({ best_setups: setups, lesson_of_day: localLesson })} style={{ marginTop: 10 }}>Save Lesson</button>
          </>
        ) : (
          <div style={{ fontSize: 13, color: lesson ? 'var(--text-primary)' : 'var(--text-dim)', lineHeight: 1.7, fontStyle: lesson ? 'normal' : 'italic' }}>
            {lesson || 'No lesson recorded yet. Click Edit to add one.'}
          </div>
        )}
      </div>
    </div>
  );
}
