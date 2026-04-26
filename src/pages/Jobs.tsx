import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

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

function timeAgo(dateStr?: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

const CITIES = ['All India', 'Bangalore', 'Hyderabad', 'Mumbai', 'Delhi', 'Pune', 'Chennai', 'Noida', 'Gurgaon']

export default function Jobs() {
  const { user } = useAuth()
  const isPro = user?.plan === 'pro'
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
  const [applyError, setApplyError] = useState('')

  const search = useCallback(async (p = 1, overrideRole?: string, overrideLocation?: string) => {
    const r = overrideRole !== undefined ? overrideRole : role
    const l = overrideLocation !== undefined ? overrideLocation : location
    setLoading(true)
    setError('')
    setApplyError('')
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
      setSaved((prev: Set<string>) => {
        const next = new Set(prev)
        res.saved ? next.add(id) : next.delete(id)
        return next
      })
    } catch {}
  }

  const trackApply = (jobId: string, applyUrl: string) => {
    if (!isPro) {
      setApplyError('Applying to jobs requires Pro plan (₹299/month).')
      return
    }
    api.jobs.apply(jobId).catch(() => {})
    window.open(applyUrl, '_blank', 'noopener,noreferrer')
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
    setApplyError('')
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

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="page-title">Live Jobs</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            {savedRole
              ? <>Showing jobs for <strong>{savedRole}</strong>
                  <button
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 'inherit', padding: '0 0 0 8px', fontWeight: 600 }}
                    onClick={() => { localStorage.removeItem('atsbrain_target_role'); setRole(''); search(1, '') }}
                  >Clear ×</button>
                </>
              : 'Fresher to Senior — jobs across India updated every 2 hours'}
          </p>
        </div>

        {/* Pro badge / upgrade prompt */}
        {!isPro && (
          <div className="alert alert-gold" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span>⭐ <strong>Pro plan</strong> — unlock one-click job apply + email alerts</span>
            <a href="/pricing" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none', fontSize: '.82rem', border: '1px solid var(--gold)', borderRadius: 6, padding: '4px 12px' }}>
              Upgrade ₹299/mo →
            </a>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={`tab-btn ${tab === 'search' ? 'active' : ''}`} onClick={() => switchTab('search')}>Search Jobs</button>
          <button className={`tab-btn ${tab === 'saved' ? 'active' : ''}`} onClick={() => switchTab('saved')}>Saved Jobs</button>
        </div>

        {tab === 'search' && (
          <>
            {/* Search bar */}
            <div className="search-bar" style={{ marginBottom: 12 }}>
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
                onChange={e => { const val = e.target.value || 'india'; setLocation(val) }}
                onKeyDown={e => e.key === 'Enter' && search(1)}
              />
              <button className="btn btn-primary" onClick={() => search(1)} disabled={loading}>
                {loading ? 'Searching…' : 'Search'}
              </button>
              <button className="btn btn-outline" onClick={seedJobs} disabled={loading} title="Fetch latest jobs from job boards">
                {loading ? 'Loading…' : '↻ Fetch Jobs'}
              </button>
            </div>

            {/* City pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {CITIES.map(city => {
                const val = city === 'All India' ? 'india' : city
                const isActive = location === val
                return (
                  <button
                    key={city}
                    onClick={() => handleCityClick(val)}
                    style={{
                      padding: '4px 12px', borderRadius: 20,
                      border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                      background: isActive ? 'var(--primary)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--muted)',
                      fontSize: '.78rem', cursor: 'pointer', fontWeight: isActive ? 600 : 400,
                      transition: 'all .15s',
                    }}
                  >{city}</button>
                )
              })}
            </div>
          </>
        )}

        {error && <div className="alert alert-error">{error}</div>}
        {applyError && (
          <div className="alert alert-gold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span>⭐ {applyError}</span>
            <a href="/pricing" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none', fontSize: '.82rem', border: '1px solid var(--gold)', borderRadius: 6, padding: '3px 10px' }}>
              Upgrade →
            </a>
          </div>
        )}

        {loading ? (
          <div className="loader-wrap"><div className="loader" /></div>
        ) : displayJobs.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">{tab === 'saved' ? '🔖' : '🔍'}</div>
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
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={seedJobs}>Load Jobs Now</button>
            )}
            {tab === 'search' && !seeding && !savedRole && (
              <a href="/analyze" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>Analyze Resume</a>
            )}
          </div>
        ) : (
          <>
            {tab === 'search' && (
              <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginBottom: 14 }}>
                {total.toLocaleString()} jobs found
                {!roleMatched && role && (
                  <span style={{ color: 'var(--warning)', marginLeft: 8 }}>
                    — no exact matches for &ldquo;{role}&rdquo;, showing available jobs
                  </span>
                )}
              </p>
            )}

            <div className="jobs-grid">
              {displayJobs.map(job => (
                <div key={job.id} className="job-card">
                  {/* Company logo */}
                  <div className="job-logo">
                    {job.company?.[0]?.toUpperCase() ?? '?'}
                  </div>

                  {/* Job info */}
                  <div className="job-info">
                    <div className="job-title">{job.title}</div>
                    <div className="job-company">{job.company}</div>
                    <div className="job-location">
                      <span style={{ marginRight: 4 }}>📍</span>{job.location || 'India'}
                    </div>
                    <div className="job-meta">
                      {formatSalary(job.salary_min, job.salary_max) && (
                        <span className="job-meta-tag salary">
                          💰 {formatSalary(job.salary_min, job.salary_max)}
                        </span>
                      )}
                      {job.posted_at && (
                        <span className="job-meta-tag">{timeAgo(job.posted_at)}</span>
                      )}
                      <span className="job-meta-tag source">{job.source}</span>
                    </div>
                    {job.description && (
                      <p className="job-desc">{job.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="job-actions">
                    <button
                      className={`btn btn-sm ${saved.has(job.id) ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => toggleSave(job.id)}
                      title={saved.has(job.id) ? 'Unsave' : 'Save'}
                      style={{ minWidth: 64 }}
                    >
                      {saved.has(job.id) ? '🔖 Saved' : '🔖 Save'}
                    </button>
                    {isPro ? (
                      <a
                        href={job.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{ textDecoration: 'none', minWidth: 64, textAlign: 'center' }}
                        onClick={() => api.jobs.apply(job.id).catch(() => {})}
                      >
                        Apply →
                      </a>
                    ) : (
                      <button
                        className="btn btn-gold btn-sm"
                        onClick={() => trackApply(job.id, job.apply_url)}
                        style={{ minWidth: 64 }}
                        title="Pro feature — upgrade to apply"
                      >
                        ⭐ Apply
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {tab === 'search' && pages > 1 && (
              <div className="pagination" style={{ marginTop: 24 }}>
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
