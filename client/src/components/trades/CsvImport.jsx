import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import PnlBadge from '../shared/PnlBadge.jsx';
import LoadingSpinner from '../shared/LoadingSpinner.jsx';

export default function CsvImport({ onClose }) {
  const qc = useQueryClient();
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const { mutate: uploadForPreview, isPending: previewing } = useMutation({
    mutationFn: async (f) => {
      const fd = new FormData();
      fd.append('file', f);
      const r = await axios.post('/api/trades/import-csv', fd);
      return r.data;
    },
    onSuccess: (data) => { setPreview(data); setError(''); },
    onError: (e) => setError(e.response?.data?.error || 'Failed to parse CSV'),
  });

  const { mutate: confirmImport, isPending: importing } = useMutation({
    mutationFn: async (rows) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('confirmed', 'true');
      fd.append('rows', JSON.stringify(rows));
      const r = await axios.post('/api/trades/import-csv', fd);
      return r.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['trades'] });
      onClose();
      alert(`Imported ${data.imported} trades successfully.`);
    },
    onError: (e) => setError(e.response?.data?.error || 'Import failed'),
  });

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(null);
    setError('');
    uploadForPreview(f);
  }

  return (
    <div>
      <p style={{ color: '#71717a', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
        Upload a CSV from your broker. The dashboard will auto-detect columns and show a preview before importing.
        If columns aren't detected correctly, see <code style={{ color: '#00d4ff', fontFamily: 'JetBrains Mono, monospace' }}>server/services/csvImport.js</code> to add your broker's column names.
      </p>

      <div
        style={{
          border: '2px dashed rgba(255,255,255,0.06)', borderRadius: 24, padding: 32,
          textAlign: 'center', cursor: 'pointer', marginBottom: 20,
          background: '#0d0d0d',
        }}
        onClick={() => fileRef.current?.click()}
      >
        <div style={{ fontSize: 28, marginBottom: 10 }}>📄</div>
        <div style={{ color: '#71717a', fontSize: 14 }}>
          {file ? file.name : 'Click to select your broker CSV file'}
        </div>
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />
      </div>

      {error && <div style={{ color: '#ff4444', fontSize: 13, marginBottom: 14, padding: '8px 14px', background: 'rgba(255,68,68,0.1)', borderRadius: 12 }}>⚠ {error}</div>}
      {previewing && <LoadingSpinner text="Parsing CSV..." />}

      {preview && (
        <>
          <div style={{ marginBottom: 14, display: 'flex', gap: 14 }}>
            <span style={{ color: '#22ff88', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>✓ {preview.rows.length} trades parsed</span>
            {preview.skipped > 0 && <span style={{ color: '#ffd60a', fontSize: 13 }}>⚠ {preview.skipped} rows skipped</span>}
          </div>

          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, marginBottom: 20, background: '#0d0d0d' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#111111' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Date</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Symbol</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Dir</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Entry</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Exit</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Size</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>P&L</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Pattern</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#71717a' }}>{r.date}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#00d4ff' }}>{r.symbol}</td>
                    <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600, background: r.direction === 'long' ? 'rgba(34,255,136,0.12)' : 'rgba(255,68,68,0.12)', color: r.direction === 'long' ? '#22ff88' : '#ff4444' }}>{r.direction}</span></td>
                    <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace' }}>${r.entry_price}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace' }}>${r.exit_price}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace' }}>{r.size}</td>
                    <td style={{ padding: '10px 14px' }}><PnlBadge value={r.pnl_dollar} /></td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#71717a' }}>{r.pattern_tag || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#71717a', padding: '8px 18px', borderRadius: 9999, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={() => confirmImport(preview.rows)} disabled={importing} style={{ background: '#22ff88', border: 'none', color: '#000', padding: '8px 18px', borderRadius: 9999, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              {importing ? 'Importing...' : `Import ${preview.rows.length} Trades`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}