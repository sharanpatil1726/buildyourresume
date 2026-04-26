import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

interface Job {
  id: string
  title: string
  company: string
  location: string
  salary_min?: number
  salary_max?: number
  description?: string
  apply_url: string
  source: string
  posted_at?: string
  is_active: boolean
}

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return ''
  const fmt = (n: number) => `₹${(n / 100000).toFixed(0)}L`
  if (min && max) return `${fmt(min)}–${fmt(max)} /yr`
  if (min) return `${fmt(min)}+ /yr`
  return `Up to ${fmt(max!)} /yr`
}

export default function Jobs() {
  const savedRole = localStorage.getItem('atsbrain_target_role') || ''
  const [role, setRole] = useState(savedRole)
  const [location, setLocation] = useState('india')
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'search' | 'saved'>('search')
  const [savedJobs, setSavedJobs] = useState<Job[]>([])

  const search = useCallback(async (p = 1) => {
    setLoading(true); setError('')
    try {
      const res = await api.jobs.search(role || undefined, location || undefined, p)
      setJobs(res.jobs as unknown as Job[])
      setTotal(res.total)
      setPages(res.pages)
      setPage(p)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [role, location])

  useEffect(() => { search(1) }, []) // auto-search on mount — uses savedRole if present

  const loadSaved = async () => {
    try {
      const res = await api.jobs.saved()
      setSavedJobs(res as unknown as Job[])
      const ids = new Set(res.map((j) => (j as unknown as Job).id))
      setSaved(ids)
    } catch {}
  }

  const toggleSave = async (id: string) => {
    try {
      const res = await api.jobs.save(id)
      setSaved(prev => {
        const next = new Set(prev)
        res.saved ? next.add(id) : next.delete(id)
        return next
      })
    } catch {}
  }

  const trackApply = async (job: Job) => {
    try { await api.jobs.apply(job.id) } catch {}
    window.open(job.apply_url, '_blank', 'noopener')
  }

  const switchTab = (t: 'search' | 'saved') => {
    setTab(t)
    if (t === 'saved') loadSaved()
  }

  const displayJobs = tab === 'saved' ? savedJobs : jobs

  if (!savedRole && jobs.length === 0 && !loading) {
    return (
      <div className="page">
        <div className="page-inner" style={{ maxWidth: 560 }}>
          <div className="empty" style={{ marginTop: 60 }}>
            <div className="empty-icon">💼</div>
            <h3>Scan your resume first</h3>
            <p style={{ marginBottom: 20 }}>
              We'll match live jobs to your target role automatically after you analyze your resume.
            </p>
            <a href="/analyze" className="btn btn-primary">Analyze Resume →</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-inner">
        <h1 className="page-title">Live Jobs</h1>
        <p className="page-sub">
          {savedRole ? <>Showing jobs for <strong>{savedRole}</strong> · <button style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 'inherit', padding: 0 }} onClick={() => { localStorage.removeItem('atsbrain_target_role'); setRole('') }}>Clear</button></> : 'Fresher to Senior — jobs across India updated every 2 hours.'}
        </p>

        <div className="tabs">
          <button className={`tab-btn ${tab === 'search' ? 'active' : ''}`} onClick={() => switchTab('search')}>Search Jobs</button>
          <button className={`tab-btn ${tab === 'saved' ? 'active' : ''}`} onClick={() => switchTab('saved')}>Saved Jobs</button>
        </div>

        {tab === 'search' && (
          <div className="search-bar">
            <input
              className="form-input"
              placeholder="Job title, skill (e.g. React Developer)"
              value={role}
              onChange={e => setRole(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search(1)}
            />
            <input
              className="form-input"
              style={{ maxWidth: 200 }}
              placeholder="City (e.g. Bangalore)"
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search(1)}
            />
            <button className="btn btn-primary" onClick={() => search(1)} disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loader-wrap"><div className="loader" /></div>
        ) : displayJobs.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💼</div>
            <h3>{tab === 'saved' ? 'No saved jobs' : 'No jobs found'}</h3>
            <p>{tab === 'saved' ? 'Save jobs from search to view them here.' : 'Try a different role or location.'}</p>
          </div>
        ) : (
          <>
            {tab === 'search' && <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginBottom: 12 }}>{total.toLocaleString()} jobs found</p>}
            <div className="jobs-grid">
              {displayJobs.map(job => (
                <div key={job.id} className="job-card">
                  <div className="job-logo">{job.company?.[0]?.toUpperCase() ?? '?'}</div>
                  <div className="job-info">
                    <div className="job-title">{job.title}</div>
                    <div className="job-company">{job.company}</div>
                    <div className="job-meta">
                      {job.location && <span>📍 {job.location}</span>}
                      {formatSalary(job.salary_min, job.salary_max) && <span>💰 {formatSalary(job.salary_min, job.salary_max)}</span>}
                      {job.source && <span>🔗 {job.source}</span>}
                      {job.posted_at && <span>🕐 {new Date(job.posted_at).toLocaleDateString('en-IN')}</span>}
                    </div>
                    {job.description && (
                      <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {job.description}
                      </p>
                    )}
                  </div>
                  <div className="job-actions">
                    <button
                      className={`btn btn-sm ${saved.has(job.id) ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => toggleSave(job.id)}
                      title={saved.has(job.id) ? 'Unsave' : 'Save'}
                    >{saved.has(job.id) ? '★' : '☆'}</button>
                    <button className="btn btn-primary btn-sm" onClick={() => trackApply(job)}>Apply</button>
                  </div>
                </div>
              ))}
            </div>

            {tab === 'search' && pages > 1 && (
              <div className="pagination">
                {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={p === page ? 'active' : ''} onClick={() => search(p)}>{p}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
