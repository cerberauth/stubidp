'use client'

import { authClient } from '@/lib/auth-client'

export default function Home() {
  const { data: session, isPending } = authClient.useSession()

  async function handleLogin() {
    await authClient.signIn.oauth2({
      providerId: 'stubidp',
      callbackURL: '/',
    })
  }

  async function handleLogout() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.reload()
        },
      },
    })
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.title}>Next.js + better-auth + stubidp</h1>
        <p style={styles.subtitle}>
          Example application using{' '}
          <a href="https://www.better-auth.com" style={styles.link}>
            better-auth
          </a>{' '}
          with{' '}
          <a href="https://github.com/cerberauth/stubidp" style={styles.link}>
            stubidp
          </a>{' '}
          as the OIDC provider.
        </p>

        <div style={styles.divider} />

        {isPending ? (
          <p style={styles.status}>Loading session...</p>
        ) : session ? (
          <div>
            <div style={styles.userInfo}>
              <p style={styles.welcomeText}>
                Welcome, <strong>{session.user.name || session.user.email}</strong>!
              </p>
              <table style={styles.table}>
                <tbody>
                  <tr>
                    <td style={styles.tableLabel}>User ID</td>
                    <td style={styles.tableValue}>{session.user.id}</td>
                  </tr>
                  {session.user.email && (
                    <tr>
                      <td style={styles.tableLabel}>Email</td>
                      <td style={styles.tableValue}>{session.user.email}</td>
                    </tr>
                  )}
                  {session.user.name && (
                    <tr>
                      <td style={styles.tableLabel}>Name</td>
                      <td style={styles.tableValue}>{session.user.name}</td>
                    </tr>
                  )}
                  {session.user.image && (
                    <tr>
                      <td style={styles.tableLabel}>Image</td>
                      <td style={styles.tableValue}>
                        <img src={session.user.image} alt="avatar" style={styles.avatar} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button onClick={handleLogout} style={styles.buttonSecondary}>
              Sign out
            </button>
          </div>
        ) : (
          <div>
            <p style={styles.status}>You are not signed in.</p>
            <button onClick={handleLogin} style={styles.buttonPrimary}>
              Sign in with stubidp
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
  },
  title: {
    margin: '0 0 0.5rem',
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  subtitle: {
    margin: '0',
    color: '#6b7280',
    fontSize: '0.95rem',
    lineHeight: '1.5',
  },
  link: {
    color: '#4f46e5',
    textDecoration: 'none',
  },
  divider: {
    margin: '1.5rem 0',
    borderTop: '1px solid #e5e7eb',
  },
  status: {
    color: '#6b7280',
    margin: '0 0 1rem',
  },
  welcomeText: {
    margin: '0 0 1rem',
    fontSize: '1rem',
  },
  userInfo: {
    background: '#f9fafb',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
  tableLabel: {
    color: '#6b7280',
    paddingRight: '1rem',
    paddingBottom: '0.25rem',
    whiteSpace: 'nowrap',
    verticalAlign: 'top',
  },
  tableValue: {
    color: '#111827',
    wordBreak: 'break-all',
    paddingBottom: '0.25rem',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
  },
  buttonPrimary: {
    display: 'inline-block',
    background: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.95rem',
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%',
  },
  buttonSecondary: {
    display: 'inline-block',
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.95rem',
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%',
  },
}
