import { useEffect } from 'react';

export default function Modal({ title, onClose, children, width = 520 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(20,20,25,0.95)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 24,
          width, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          padding: 28,
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: 20,
          marginBottom: 20,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#ffffff' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: 9999,
              color: '#ffffff',
              padding: '4px 14px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >✕</button>
        </div>
        <div style={{ overflowY: 'auto', color: '#71717a', fontSize: 14 }}>{children}</div>
      </div>
    </div>
  );
}