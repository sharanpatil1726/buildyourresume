import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { FileText, Send, Users, Award, Target, Briefcase, ClipboardList, Zap, Lock, CheckCircle, StarFill, Star } from '../components/Icons'

interface Scan { id: string; target_role: string; ats_score: number; experience_level: string; created_at: string; is_unlocked: boolean }
interface Stats { total: number; applied: number; interview: number; offer: number }
interface Feedback { user_name: string; user_role: string; message: string; rating: number; created_at: string }

function scoreClass(s: number) { return s >= 75 ? 'good' : s >= 50 ? 'ok' : 'bad' }

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" className="star-btn" onClick={() => onChange(n)}>
          {n <= value
            ? <StarFill size={20} color="var(--gold)" />
            : <Star size={20} color="var(--muted)" />}
        </button>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [scans, setScans] = useState<Scan[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [testimonials, setTestimonials] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)

  // Feedback form
  const [fbName, setFbName] = useState('')
  const [fbRole, setFbRole] = useState('')
  const [fbMsg, setFbMsg] = useState('')
  const [fbRating, setFbRating] = useState(5)
  const [fbLoading, setFbLoading] = useState(false)
  const [fbSuccess, setFbSuccess] = useState(false)
  const [fbError, setFbError] = useState('')

  useEffect(() => {
    Promise.all([api.analyze.history(), api.tracker.stats(), api.feedback.list()])
      .then(([s, st, fb]) => {
        setScans(s)
        setStats(st as unknown as Stats)
        setTestimonials(fb)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fbName.trim() || !fbMsg.trim()) { setFbError('Name and message are required'); return }
    setFbLoading(true); setFbError('')
    try {
      await api.feedback.submit({ user_name: fbName, user_role: fbRole, message: fbMsg, rating: fbRating })
      setFbSuccess(true)
      setFbName(''); setFbRole(''); setFbMsg(''); setFbRating(5)
      const fb = await api.feedback.list()
      setTestimonials(fb)
    } catch (err: unknown) {
      setFbError(err instanceof Error ? err.message : 'Could not submit feedback')
    } finally {
      setFbLoading(false)
    }
  }

  if (loading) return <div className="page"><div className="loader-wrap"><div className="loader" /></div></div>

  return (
    <div className="page">
      <div className="page-inner">
        <h1 className="page-title">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
        </h1>
        <p className="page-sub">Your career command centre. Let's land that job.</p>

        {/* Stats */}
        <div className="stats-grid">
          {([
            { val: scans.length, label: 'Resume Scans', Icon: FileText },
            { val: stats?.applied ?? 0, label: 'Applications', Icon: Send },
            { val: stats?.interview ?? 0, label: 'Interviews', Icon: Users },
            { val: stats?.offer ?? 0, label: 'Offers', Icon: Award },
          ] as const).map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ marginBottom: 6, color: 'var(--primary)' }}><s.Icon size={22} /></div>
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
          {/* Recent Scans */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Scans</span>
              <Link to="/analyze" className="btn btn-primary btn-sm">+ New Scan</Link>
            </div>
            {scans.length === 0 ? (
              <div className="empty">
                <div className="empty-icon"><FileText size={40} color="var(--muted)" /></div>
                <h3>No scans yet</h3>
                <p>Upload your resume and get your ATS score instantly.</p>
                <br />
                <Link to="/analyze" className="btn btn-primary">Analyze Resume</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scans.slice(0, 6).map(s => (
                  <div key={s.id} className="scan-item" onClick={() => navigate(`/scan/${s.id}`)}>
                    <div className={`score-ring ${scoreClass(s.ats_score)}`}
                      style={{ width: 46, height: 46, fontSize: '.95rem', border: '4px solid' }}>
                      {s.ats_score}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.target_role}
                      </div>
                      <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                        {s.experience_level} · {new Date(s.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <div style={{ fontSize: '.75rem', flexShrink: 0 }}>
                      {s.is_unlocked
                        ? <span style={{ color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle size={13} /> Unlocked</span>
                        : <span style={{ color: 'var(--gold)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><Lock size={13} /> Free</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Quick Actions</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {([
                { to: '/analyze', Icon: Target,       label: 'Analyze Resume',      desc: 'Get your ATS score + insights',   gradient: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', iconColor: 'var(--primary)' },
                { to: '/jobs',    Icon: Briefcase,    label: 'Find Jobs',           desc: 'Live jobs across India',          gradient: 'linear-gradient(135deg,#ecfeff,#cffafe)', iconColor: 'var(--accent)' },
                { to: '/tracker', Icon: ClipboardList,label: 'Track Applications',  desc: 'Stay on top of your pipeline',    gradient: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', iconColor: 'var(--success)' },
                { to: '/pricing', Icon: Zap,          label: 'Plans & Pricing',     desc: 'Pro plan from ₹299/month',        gradient: 'linear-gradient(135deg,#fffbeb,#fef3c7)', iconColor: 'var(--gold)' },
              ] as const).map(a => (
                <Link key={a.to} to={a.to}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit', transition: 'all .15s', background: a.gradient }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
                >
                  <span style={{ color: a.iconColor }}><a.Icon size={22} /></span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{a.label}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{a.desc}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: '.85rem' }}>›</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* What Users Say */}
        <div className="card" style={{ marginBottom: 24 }}>
          <p className="section-title">What Our Users Say</p>
          {testimonials.length > 0 ? (
            <div className="testimonial-grid">
              {testimonials.slice(0, 6).map((t, i) => (
                <div key={i} className="testimonial-card">
                  <div className="testimonial-stars" style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: t.rating }).map((_, i) => <StarFill key={i} size={14} color="var(--gold)" />)}
                  </div>
                  <p className="testimonial-text">"{t.message}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar-circle">{t.user_name[0].toUpperCase()}</div>
                    <div>
                      <div className="testimonial-author">{t.user_name}</div>
                      {t.user_role && <div className="testimonial-role">{t.user_role}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '.875rem' }}>Be the first to share your experience!</p>
          )}
        </div>

        {/* Share Your Experience */}
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary-light), white)' }}>
          <p className="section-title">Share Your Experience</p>
          {fbSuccess ? (
            <div className="alert alert-success">Thank you! Your feedback is now live on the site.</div>
          ) : (
            <form onSubmit={handleFeedback}>
              {fbError && <div className="alert alert-error">{fbError}</div>}
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Your Name *</label>
                  <input className="form-input" placeholder="Rahul Sharma" value={fbName} onChange={e => setFbName(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Your Role (optional)</label>
                  <input className="form-input" placeholder="Software Engineer at Google" value={fbRole} onChange={e => setFbRole(e.target.value)} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Your Experience *</label>
                <textarea className="form-textarea" placeholder="How did AtsBrain help your job search?" value={fbMsg} onChange={e => setFbMsg(e.target.value)} style={{ minHeight: 80 }} required />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <label className="form-label" style={{ margin: 0 }}>Rating:</label>
                <StarRating value={fbRating} onChange={setFbRating} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={fbLoading}>
                {fbLoading ? 'Submitting…' : 'Share Feedback'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
