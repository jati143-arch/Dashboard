import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchlistApi } from '../api/client.js';
import WatchlistTable from '../components/watchlist/WatchlistTable.jsx';

export default function Watchlist() {
  const qc = useQueryClient();
  const [activeId,  setActiveId]  = useState(null);
  const [newName,   setNewName]   = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: watchlistApi.list,
    onSuccess: (d) => { if (d.length && !activeId) setActiveId(d[0].id); },
  });

  const activeList = lists.find(l => l.id === activeId) || lists[0];

  const create = useMutation({
    mutationFn: () => watchlistApi.create(newName.trim()),
    onSuccess: (newList) => {
      qc.invalidateQueries({ queryKey: ['watchlist'] });
      setActiveId(newList.id);
      setNewName('');
      setShowCreate(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => watchlistApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchlist'] });
      setActiveId(null);
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeSlideUp 0.45s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif", color: '#ffffff' }}>Watchlist</h1>
        <button
          onClick={() => setShowCreate(v => !v)}
          style={{
            padding: '10px 20px',
            background: '#ffffff',
            border: 'none',
            borderRadius: '9999px',
            color: '#050505',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          + New List
        </button>
      </div>

      {showCreate && (
        <div style={{
          padding: '20px 28px',
          background: '#111111',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 24,
        }}>
          <form onSubmit={e => { e.preventDefault(); if (newName.trim()) create.mutate(); }}
            style={{ display: 'flex', gap: 8 }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="List name"
              style={{
                flex: 1,
                padding: '8px 14px',
                background: '#050505',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 24,
                color: '#ffffff',
                fontSize: 13,
                fontFamily: "'Inter', system-ui, sans-serif",
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!newName.trim() || create.isPending}
              style={{
                padding: '8px 20px',
                background: '#22ff88',
                border: 'none',
                borderRadius: '9999px',
                color: '#050505',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Create
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div style={{ color: '#52525b', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>Loading…</div>
      ) : lists.length === 0 ? (
        <div style={{
          padding: 40,
          background: '#111111',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 24,
          textAlign: 'center',
          color: '#52525b',
          fontSize: 13,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          No watchlists yet. Create one to start tracking symbols.
        </div>
      ) : (
        <>
          {/* Tab bar - pill style */}
          <div style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            padding: 4,
            background: '#0a0a0a',
            borderRadius: '9999px',
            border: '1px solid rgba(255,255,255,0.06)',
            width: 'fit-content',
          }}>
            {lists.map(l => (
              <button
                key={l.id}
                onClick={() => setActiveId(l.id)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '9999px',
                  background: l.id === activeList?.id ? '#ffffff' : 'transparent',
                  cursor: 'pointer',
                  color: l.id === activeList?.id ? '#050505' : '#71717a',
                  fontWeight: l.id === activeList?.id ? 600 : 400,
                  fontSize: 13,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {l.name}
                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>({l.symbols?.length || 0})</span>
              </button>
            ))}
          </div>

          {/* Active list */}
          {activeList && (
            <div style={{
              padding: '20px 28px',
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 24,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif", color: '#ffffff' }}>{activeList.name}</span>
                <button
                  onClick={() => remove.mutate(activeList.id)}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    color: '#ff4444',
                    fontSize: 12,
                    padding: '6px 14px',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  Delete list
                </button>
              </div>
              <WatchlistTable list={activeList} />
            </div>
          )}
        </>
      )}
    </div>
  );
}