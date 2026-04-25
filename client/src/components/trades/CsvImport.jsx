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
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
        Upload a CSV from your broker. The dashboard will auto-detect columns and show a preview before importing.
        If columns aren't detected correctly, see <code>server/services/csvImport.js</code> to add your broker's column names.
      </p>

      <div
        style={{
          border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 28,
          textAlign: 'center', cursor: 'pointer', marginBottom: 16,
          background: 'var(--bg-surface)',
        }}
        onClick={() => fileRef.current?.click()}
      >
        <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {file ? file.name : 'Click to select your broker CSV file'}
        </div>
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}
      {previewing && <LoadingSpinner text="Parsing CSV..." />}

      {preview && (
        <>
          <div style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
            <span style={{ color: 'var(--green)', fontSize: 13 }}>✓ {preview.rows.length} trades parsed</span>
            {preview.skipped > 0 && <span style={{ color: 'var(--yellow)', fontSize: 13 }}>⚠ {preview.skipped} rows skipped</span>}
          </div>

          <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Symbol</th><th>Dir</th><th>Entry</th><th>Exit</th><th>Size</th><th>P&L</th><th>Pattern</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ fontSize: 11 }}>{r.date}</td>
                    <td style={{ fontFamily: 'var(--text-mono)', fontWeight: 700 }}>{r.symbol}</td>
                    <td><span className={`badge badge-${r.direction}`}>{r.direction}</span></td>
                    <td className="mono">${r.entry_price}</td>
                    <td className="mono">${r.exit_price}</td>
                    <td className="mono">{r.size}</td>
                    <td><PnlBadge value={r.pnl_dollar} /></td>
                    <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.pattern_tag || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={() => confirmImport(preview.rows)} disabled={importing}>
              {importing ? 'Importing...' : `Import ${preview.rows.length} Trades`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
