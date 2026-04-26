import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

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

        <p className="auth-switch">
          New to AtsBrain? <Link to="/register">Create free account</Link>
        </p>
      </div>
    </div>
  )
}
