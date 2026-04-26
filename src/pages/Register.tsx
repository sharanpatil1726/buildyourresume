import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

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

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
