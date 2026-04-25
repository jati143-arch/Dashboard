export default function LoadingSpinner({ size = 20, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 20 }}>
      <div className="spinner" style={{ width: size, height: size }} />
      {text && <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{text}</span>}
    </div>
  );
}
