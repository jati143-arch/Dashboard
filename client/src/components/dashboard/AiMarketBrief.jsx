import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const api = axios.create({ baseURL: '/api' });

async function fetchBrief() {
  const r = await api.get('/ai/market-brief');
  return r.data;
}

async function generateBrief() {
  const r = await api.post('/ai/market-brief');
  return r.data;
}

export default function AiMarketBrief() {
  const [expanded, setExpanded] = useState(true);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['ai-market-brief'],
    queryFn: fetchBrief,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const genMutation = useMutation({
    mutationFn: generateBrief,
    onSuccess: (d) => qc.setQueryData(['ai-market-brief'], d),
  });

  const brief = data?.brief;
  const generatedAt = data?.generatedAt;
  const ageHours = generatedAt ? Math.floor((Date.now() - new Date(generatedAt)) / 3600000) : null;
  const isStale = ageHours != null && ageHours >= 12;

  if (isLoading) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(34,197,94,0.04))',
      border: '1px solid rgba(139,92,246,0.2)',
      borderRadius: 16,
      padding: 20,
      marginBottom: 4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: expanded ? 14 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={14} color="#8b5cf6" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            AI Market Brief
          </span>
          {generatedAt && (
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {ageHours === 0 ? 'just now' : `${ageHours}h ago`}
              {isStale && ' · stale'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => genMutation.mutate()}
            disabled={genMutation.isPending}
            title="Regenerate brief"
            style={{ background: 'transparent', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
          >
            <RefreshCw size={11} className={genMutation.isPending ? 'spin' : ''} />
            {genMutation.isPending ? 'Generating…' : 'Refresh'}
          </button>
          <button onClick={() => setExpanded(e => !e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 2 }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {genMutation.isPending && (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Analysing markets…</div>
          )}
          {!brief && !genMutation.isPending && (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              No brief yet.{' '}
              <button onClick={() => genMutation.mutate()} style={{ background: 'transparent', border: 'none', color: '#8b5cf6', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>
                Generate now
              </button>
            </div>
          )}
          {brief && !genMutation.isPending && (
            <div style={{ fontSize: 12, color: 'var(--color-text-primary)', lineHeight: 1.7 }}>
              {brief.split('\n').filter(Boolean).map((line, i) => {
                const isBullet = line.startsWith('•') || line.startsWith('-') || /^\d+\./.test(line);
                return (
                  <div key={i} style={{ marginBottom: 6, paddingLeft: isBullet ? 10 : 0, borderLeft: isBullet ? '2px solid rgba(139,92,246,0.4)' : 'none' }}>
                    {line}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
