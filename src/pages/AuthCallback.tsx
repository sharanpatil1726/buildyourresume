import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { loginWithGoogleSession } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')

    if (!accessToken) {
      setError('Authentication failed — no token received. Please try again.')
      return
    }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(res => { if (!res.ok) throw new Error('Profile fetch failed'); return res.json() })
      .then(profile => {
        loginWithGoogleSession(
          accessToken,
          profile.email || '',
          profile.plan || 'free',
          profile.id || '',
        )
        navigate('/dashboard')
      })
      .catch(() => setError('Could not complete sign-in. Please try again.'))
  }, [])

  if (error) {
    return (
      <div className="auth-wrap">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
          <a href="/login" className="btn btn-primary btn-full" style={{ textDecoration: 'none', display: 'block' }}>
            Back to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{
          width: 52, height: 52,
          border: '4px solid rgba(124,58,237,.2)',
          borderTopColor: '#7c3aed',
          borderRadius: '50%',
          animation: 'spin .9s linear infinite',
          margin: '0 auto 20px',
        }} />
        <p style={{ color: 'var(--muted)', fontSize: '.95rem' }}>Completing sign-in…</p>
      </div>
    </div>
  )
}
