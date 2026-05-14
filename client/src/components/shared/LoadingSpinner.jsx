export default function LoadingSpinner({ size = 20, text }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      padding: 20,
    }}>
      <div
        style={{
          width: size,
          height: size,
          border: '2px solid rgba(255,255,255,0.06)',
          borderTopColor: '#00d4ff',
          borderRadius: 9999,
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {text && (
        <span style={{
          color: '#71717a',
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {text}
        </span>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}