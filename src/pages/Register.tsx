import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { signInWithGoogle } from '../lib/supabase'

const TECH_WORDS = [
  { word: 'Career', size: 1.3, x: 8, y: 15, delay: 0 },
  { word: 'Resume', size: 1.1, x: 78, y: 10, delay: 1 },
  { word: 'Jobs', size: 1.5, x: 20, y: 75, delay: 0.5 },
  { word: 'Interview', size: 1.0, x: 65, y: 80, delay: 2 },
  { word: 'Offer', size: 1.2, x: 88, y: 40, delay: 0.8 },
  { word: 'Skills', size: 1.4, x: 45, y: 88, delay: 1.5 },
  { word: 'Hire', size: 1.1, x: 5, y: 55, delay: 2.2 },
  { word: 'Growth', size: 0.95, x: 32, y: 8, delay: 1.7 },
  { word: 'Salary', size: 1.2, x: 58, y: 22, delay: 0.4 },
  { word: 'LinkedIn', size: 0.9, x: 25, y: 45, delay: 2.8 },
]

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await api.auth.signup(email, password, name)
      try {
        await login(email, password)
        navigate('/dashboard')
      } catch {
        setSuccess(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-wrap">
        {TECH_WORDS.map(t => (
          <span key={t.word} className="tech-float"
            style={{ left: `${t.x}%`, top: `${t.y}%`, fontSize: `${t.size}rem`, animationDelay: `${t.delay}s` }}>
            {t.word}
          </span>
        ))}
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>📧</div>
          <h2 style={{ marginBottom: 8, color: 'var(--text)' }}>Check your email</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
            We sent a verification link to <strong style={{ color: 'var(--primary)' }}>{email}</strong>.<br />
            Verify then sign in to start optimizing!
          </p>
          <Link to="/login" className="btn btn-primary btn-full">Go to Login →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      {TECH_WORDS.map(t => (
        <span key={t.word} className="tech-float"
          style={{ left: `${t.x}%`, top: `${t.y}%`, fontSize: `${t.size}rem`, animationDelay: `${t.delay}s` }}>
          {t.word}
        </span>
      ))}

      <div className="auth-card">
        <div className="auth-logo">Ats<span>Brain</span></div>
        <p className="auth-tagline">Join 10,000+ job seekers beating the ATS</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" type="text" placeholder="Rahul Sharma"
              value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Min. 8 characters"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating account…</span>
              : 'Create free account →'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 14px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '11px 16px', borderRadius: 10, border: '1.5px solid var(--border)',
            background: 'white', cursor: 'pointer', fontSize: '.9rem', fontWeight: 600,
            color: '#3c4043', fontFamily: 'inherit', transition: 'box-shadow .15s',
          }}
          onMouseOver={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.12)')}
          onMouseOut={e => (e.currentTarget.style.boxShadow = 'none')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908C16.658 14.252 17.64 11.946 17.64 9.2z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
