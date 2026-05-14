export default function SignIn({ error }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
      padding: 24,
    }}>
      <div style={{
        background: 'rgba(20,20,25,0.95)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 24,
        padding: 48,
        maxWidth: 420,
        width: '100%',
        textAlign: 'center',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📈</div>

        <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
          DASHBOARD
        </div>
        <div style={{ fontSize: 13, color: '#71717a', marginBottom: 32 }}>
          Your personal trading journal.<br />
          Data saved securely in your Google Drive.
        </div>

        {error && (
          <div style={{
            fontSize: 12,
            color: '#ff4444',
            marginBottom: 16,
            padding: '10px 16px',
            background: 'rgba(255,68,68,0.1)',
            border: '1px solid rgba(255,68,68,0.2)',
            borderRadius: 9999,
          }}>
            Sign-in failed. Please try again.
          </div>
        )}

        <a
          href="/auth/google"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: '#ffffff',
            color: '#000000',
            border: 'none',
            borderRadius: 9999,
            padding: '12px 28px',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'box-shadow 0.15s',
          }}
          onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,255,255,0.15)'}
          onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          </svg>
          Sign in with Google
        </a>

        <div style={{ fontSize: 11, color: '#52525b', marginTop: 24, lineHeight: 1.6 }}>
          We only access a single file in your Drive.<br/>
          Your data never leaves your Google account.
        </div>
      </div>
    </div>
  );
}