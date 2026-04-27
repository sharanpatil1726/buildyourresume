import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { signInWithGoogle } from '../lib/supabase'

const TECH_WORDS = [
  { word: 'AI', size: 1.8, x: 6, y: 12, delay: 0 },
  { word: 'ATS', size: 1.4, x: 82, y: 8, delay: 1.2 },
  { word: 'Python', size: 1.1, x: 18, y: 72, delay: 0.6 },
  { word: 'React', size: 1.2, x: 70, y: 78, delay: 2 },
  { word: 'SQL', size: 1.0, x: 90, y: 45, delay: 0.9 },
  { word: 'ML', size: 1.6, x: 50, y: 85, delay: 1.5 },
  { word: 'Cloud', size: 1.0, x: 4, y: 50, delay: 2.4 },
  { word: 'Docker', size: 0.95, x: 35, y: 5, delay: 1.8 },
  { word: 'API', size: 1.3, x: 62, y: 20, delay: 0.3 },
  { word: 'AWS', size: 1.1, x: 28, y: 40, delay: 3 },
  { word: 'TypeScript', size: 0.85, x: 55, y: 55, delay: 2.7 },
  { word: 'FastAPI', size: 0.9, x: 8, y: 88, delay: 1.1 },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      {TECH_WORDS.map(t => (
        <span
          key={t.word}
          className="tech-float"
          style={{ left: `${t.x}%`, top: `${t.y}%`, fontSize: `${t.size}rem`, animationDelay: `${t.delay}s` }}
        >
          {t.word}
        </span>
      ))}

      <div className="auth-card">
        <div className="auth-logo">Ats<span>Brain</span></div>
        <p className="auth-tagline">Beat the ATS. Land your dream job. 🚀</p>

        <div className="auth-stats">
          <div className="auth-stat">
            <div className="auth-stat-val">10K+</div>
            <div className="auth-stat-label">Resumes Scanned</div>
          </div>
          <div className="auth-stat">
            <div className="auth-stat-val">87%</div>
            <div className="auth-stat-label">Interview Rate</div>
          </div>
          <div className="auth-stat">
            <div className="auth-stat-val">₹49</div>
            <div className="auth-stat-label">Full Analysis</div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in…</span>
              : 'Sign in →'}
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
          New to AtsBrain? <Link to="/register">Create free account</Link>
        </p>
      </div>
    </div>
  )
}
