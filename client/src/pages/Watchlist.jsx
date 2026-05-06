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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Watchlist</h1>
        <button onClick={() => setShowCreate(v => !v)}
          style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + New List
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ padding: '14px 20px' }}>
          <form onSubmit={e => { e.preventDefault(); if (newName.trim()) create.mutate(); }}
            style={{ display: 'flex', gap: 8 }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="List name"
              style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13 }} />
            <button type="submit" disabled={!newName.trim() || create.isPending}
              style={{ padding: '6px 14px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)', color: '#fff', cursor: 'pointer' }}>
              Create
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading…</div>
      ) : lists.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
          No watchlists yet. Create one to start tracking symbols.
        </div>
      ) : (
        <>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
            {lists.map(l => (
              <button key={l.id}
                onClick={() => setActiveId(l.id)}
                style={{
                  padding: '8px 14px', border: 'none', borderBottom: l.id === activeList?.id ? '2px solid var(--accent)' : '2px solid transparent',
                  background: 'transparent', cursor: 'pointer',
                  color: l.id === activeList?.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: l.id === activeList?.id ? 600 : 400, fontSize: 13,
                  borderRadius: 0,
                }}>
                {l.name}
                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-dim)' }}>({l.symbols?.length || 0})</span>
              </button>
            ))}
          </div>

          {/* Active list */}
          {activeList && (
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{activeList.name}</span>
                <button onClick={() => remove.mutate(activeList.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 12 }}>
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
