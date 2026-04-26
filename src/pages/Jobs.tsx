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

const CITIES = ['All India', 'Bangalore', 'Hyderabad', 'Mumbai', 'Delhi', 'Pune', 'Chennai', 'Noida', 'Gurgaon']

export default function Jobs() {
  const savedRole = localStorage.getItem('atsbrain_target_role') || ''
  const [role, setRole] = useState(savedRole)
  const [location, setLocation] = useState('india')
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState('')
  const [roleMatched, setRoleMatched] = useState(true)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'search' | 'saved'>('search')
  const [savedJobs, setSavedJobs] = useState<Job[]>([])

  const search = useCallback(async (p = 1, overrideRole?: string, overrideLocation?: string) => {
    const r = overrideRole !== undefined ? overrideRole : role
    const l = overrideLocation !== undefined ? overrideLocation : location
    setLoading(true)
    setError('')
    try {
      const res = await api.jobs.search(r || undefined, l || undefined, p)
      setJobs(res.jobs as unknown as Job[])
      setTotal(res.total)
      setPages(res.pages)
      setPage(p)
      setRoleMatched(res.role_matched ?? true)
      setSeeding(res.seeding ?? false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [role, location])

  useEffect(() => { search(1) }, [])

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

  const trackApply = (jobId: string) => {
    api.jobs.apply(jobId).catch(() => {})
  }

  const seedJobs = async () => {
    setLoading(true)
    setError('')
    try {
      await api.jobs.refresh()
      await search(1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (t: 'search' | 'saved') => {
    setTab(t)
    if (t === 'saved') loadSaved()
  }

  const handleCityClick = (cityVal: string) => {
    setLocation(cityVal)
    search(1, undefined, cityVal)
  }

  const displayJobs = tab === 'saved' ? savedJobs : jobs

  return (
    <div className="page">
      <div className="page-inner">
        <h1 className="page-title">Live Jobs</h1>
        <p className="page-sub">
          {savedRole
            ? <>
                Showing jobs for <strong>{savedRole}</strong>
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 'inherit', padding: '0 0 0 8px' }}
                  onClick={() => { localStorage.removeItem('atsbrain_target_role'); setRole(''); search(1, '') }}
                >Clear</button>
              </>
            : 'Fresher to Senior — jobs across India updated every 2 hours.'}
        </p>

        <div className="tabs">
          <button className={`tab-btn ${tab === 'search' ? 'active' : ''}`} onClick={() => switchTab('search')}>Search Jobs</button>
          <button className={`tab-btn ${tab === 'saved' ? 'active' : ''}`} onClick={() => switchTab('saved')}>Saved Jobs</button>
        </div>

        {tab === 'search' && (
          <>
            <div className="search-bar">
              <input
                className="form-input"
                placeholder="Job title or skill (e.g. React Developer)"
                value={role}
                onChange={e => setRole(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search(1)}
              />
              <input
                className="form-input"
                style={{ maxWidth: 180 }}
                placeholder="City (e.g. Bangalore)"
                value={location === 'india' ? '' : location}
                onChange={e => {
                  const val = e.target.value || 'india'
                  setLocation(val)
                }}
                onKeyDown={e => e.key === 'Enter' && search(1)}
              />
              <button className="btn btn-primary" onClick={() => search(1)} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
              <button
                className="btn btn-outline"
                onClick={seedJobs}
                disabled={loading}
                title="Fetch latest jobs from job boards"
              >
                {loading ? 'Loading...' : 'Fetch Jobs'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {CITIES.map(city => {
                const val = city === 'All India' ? 'india' : city
                const isActive = location === val
                return (
                  <button
                    key={city}
                    onClick={() => handleCityClick(val)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 20,
                      border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                      background: isActive ? 'var(--primary)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--muted)',
                      fontSize: '.78rem',
                      cursor: 'pointer',
                    }}
                  >{city}</button>
                )
              })}
            </div>
          </>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loader-wrap"><div className="loader" /></div>
        ) : displayJobs.length === 0 ? (
          <div className="empty">
            <h3 style={{ marginBottom: 8 }}>
              {tab === 'saved' ? 'No saved jobs' : 'No jobs found'}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>
              {tab === 'saved'
                ? 'Save jobs from the search tab to view them here.'
                : seeding
                  ? 'Job database is being populated for the first time. Click below to load jobs now.'
                  : !savedRole
                    ? 'Analyze your resume first to see role-matched jobs, or search for any title above.'
                    : 'Try a different role or location.'}
            </p>
            {tab === 'search' && seeding && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={seedJobs}>
                Load Jobs Now
              </button>
            )}
            {tab === 'search' && !seeding && !savedRole && (
              <a href="/analyze" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>
                Analyze Resume
              </a>
            )}
          </div>
        ) : (
          <>
            {tab === 'search' && (
              <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginBottom: 12 }}>
                {total.toLocaleString()} jobs found
                {!roleMatched && role && (
                  <span style={{ color: 'var(--warning, #f59e0b)', marginLeft: 8 }}>
                    — no exact matches for &ldquo;{role}&rdquo;, showing available jobs
                  </span>
                )}
              </p>
            )}

            <div className="jobs-grid">
              {displayJobs.map(job => (
                <div key={job.id} className="job-card">
                  <div className="job-logo">{job.company?.[0]?.toUpperCase() ?? '?'}</div>
                  <div className="job-info">
                    <a
                      href={job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="job-title"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                      onClick={() => trackApply(job.id)}
                    >{job.title}</a>
                    <div style={{ fontWeight: 600, fontSize: '.88rem', marginTop: 2 }}>{job.company}</div>
                    <div style={{ fontSize: '.82rem', color: 'var(--primary)', fontWeight: 500, marginTop: 3 }}>
                      {job.location || 'India'}
                    </div>
                    <div className="job-meta" style={{ marginTop: 4 }}>
                      {formatSalary(job.salary_min, job.salary_max) && (
                        <span>{formatSalary(job.salary_min, job.salary_max)}</span>
                      )}
                      {job.posted_at && (
                        <span>{new Date(job.posted_at).toLocaleDateString('en-IN')}</span>
                      )}
                    </div>
                    {job.description && (
                      <p style={{
                        fontSize: '.82rem',
                        color: 'var(--muted)',
                        marginTop: 6,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {job.description}
                      </p>
                    )}
                  </div>
                  <div className="job-actions">
                    <button
                      className={`btn btn-sm ${saved.has(job.id) ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => toggleSave(job.id)}
                      title={saved.has(job.id) ? 'Unsave' : 'Save'}
                    >{saved.has(job.id) ? 'Saved' : 'Save'}</button>
                    <a
                      href={job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                      onClick={() => trackApply(job.id)}
                    >Apply</a>
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
