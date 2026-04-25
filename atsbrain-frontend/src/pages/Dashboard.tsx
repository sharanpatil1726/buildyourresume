import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

interface Scan { id: string; target_role: string; ats_score: number; experience_level: string; created_at: string }
interface Stats { total: number; applied: number; interview: number; offer: number }

function scoreClass(s: number) { return s >= 75 ? 'good' : s >= 50 ? 'ok' : 'bad' }

export default function Dashboard() {
  const { user } = useAuth()
  const [scans, setScans] = useState<Scan[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.analyze.history(), api.tracker.stats()])
      .then(([s, st]) => {
        setScans(s)
        setStats(st as unknown as Stats)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="loader-wrap"><div className="loader" /></div></div>

  return (
    <div className="page">
      <div className="page-inner">
        <h1 className="page-title">Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!</h1>
        <p className="page-sub">Here's your career snapshot.</p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{scans.length}</div>
            <div className="stat-label">Resume Scans</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats?.applied ?? 0}</div>
            <div className="stat-label">Applications</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats?.interview ?? 0}</div>
            <div className="stat-label">Interviews</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats?.offer ?? 0}</div>
            <div className="stat-label">Offers</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Scans</span>
              <Link to="/analyze" className="btn btn-primary btn-sm">+ New Scan</Link>
            </div>
            {scans.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📄</div>
                <h3>No scans yet</h3>
                <p>Upload your resume and see your ATS score.</p>
                <br />
                <Link to="/analyze" className="btn btn-primary">Analyze Resume</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {scans.slice(0, 5).map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                    <div className={`score-ring ${scoreClass(s.ats_score)}`} style={{ width: 48, height: 48, fontSize: '1rem', borderWidth: 4 }}>
                      {s.ats_score}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{s.target_role}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                        {s.experience_level} · {new Date(s.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Quick Actions</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { to: '/analyze', icon: '🎯', label: 'Analyze Resume', desc: 'Get your ATS score' },
                { to: '/jobs',    icon: '💼', label: 'Find Jobs',      desc: 'Live jobs across India' },
                { to: '/tracker', icon: '📋', label: 'Track Applications', desc: 'Stay on top of your pipeline' },
                ...(user?.plan === 'free' ? [{ to: '/pricing', icon: '⚡', label: 'Upgrade Plan', desc: 'Unlock unlimited scans & more' }] : []),
              ].map(a => (
                <Link key={a.to} to={a.to} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit', transition: 'box-shadow .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  <span style={{ fontSize: '1.5rem' }}>{a.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{a.label}</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{a.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
