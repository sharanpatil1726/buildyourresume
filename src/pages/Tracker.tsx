import { useState, useEffect, FormEvent } from 'react'
import { api } from '../lib/api'

const STATUSES = ['saved', 'applied', 'oa_test', 'interview', 'offer', 'rejected'] as const
type Status = typeof STATUSES[number]

interface App {
  id: string
  company: string
  role: string
  status: Status
  apply_url?: string
  notes?: string
  created_at: string
}

const STATUS_LABELS: Record<Status, string> = {
  saved: 'Saved', applied: 'Applied', oa_test: 'OA / Test',
  interview: 'Interview', offer: 'Offer', rejected: 'Rejected',
}

export default function Tracker() {
  const [apps, setApps] = useState<App[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editApp, setEditApp] = useState<App | null>(null)
  const [form, setForm] = useState({ company: '', role: '', status: 'applied' as Status, apply_url: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all')

  const load = async () => {
    try {
      const [a, s] = await Promise.all([api.tracker.list(), api.tracker.stats()])
      setApps(a as unknown as App[])
      setStats(s as unknown as Record<string, number>)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditApp(null)
    setForm({ company: '', role: '', status: 'applied', apply_url: '', notes: '' })
    setShowModal(true)
  }

  const openEdit = (a: App) => {
    setEditApp(a)
    setForm({ company: a.company, role: a.role, status: a.status, apply_url: a.apply_url ?? '', notes: a.notes ?? '' })
    setShowModal(true)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editApp) {
        await api.tracker.update(editApp.id, { status: form.status, notes: form.notes || undefined })
      } else {
        await api.tracker.create({ company: form.company, role: form.role, status: form.status, apply_url: form.apply_url || undefined, notes: form.notes || undefined })
      }
      setShowModal(false)
      await load()
    } catch {} finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this application?')) return
    await api.tracker.delete(id)
    setApps(prev => prev.filter(a => a.id !== id))
    await load()
  }

  const displayed = filterStatus === 'all' ? apps : apps.filter(a => a.status === filterStatus)

  if (loading) return <div className="page"><div className="loader-wrap"><div className="loader" /></div></div>

  return (
    <div className="page">
      <div className="page-inner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>Application Tracker</h1>
            <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>Track every application in one place.</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Application</button>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          {STATUSES.map(s => (
            <div
              key={s}
              className="stat-card"
              style={{ cursor: 'pointer', border: filterStatus === s ? '2px solid var(--primary)' : undefined }}
              onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            >
              <div className="stat-value" style={{ fontSize: '1.6rem' }}>{stats[s] ?? 0}</div>
              <div className="stat-label">{STATUS_LABELS[s]}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilterStatus('all')}>All ({apps.length})</button>
          {STATUSES.map(s => (
            <button key={s} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {displayed.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <h3>No applications yet</h3>
            <p>Start tracking your job applications.</p>
            <br /><button className="btn btn-primary" onClick={openAdd}>Add First Application</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="tracker-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.company}</td>
                    <td>{a.role}</td>
                    <td><span className={`status-chip ${a.status}`}>{STATUS_LABELS[a.status]}</span></td>
                    <td style={{ color: 'var(--muted)' }}>{new Date(a.created_at).toLocaleDateString('en-IN')}</td>
                    <td style={{ color: 'var(--muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.notes || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {a.apply_url && <a href={a.apply_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">↗</a>}
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editApp ? 'Update Application' : 'Add Application'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              {!editApp && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Company *</label>
                      <input className="form-input" required value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Google" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Role *</label>
                      <input className="form-input" required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Software Engineer" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Apply URL</label>
                    <input className="form-input" type="url" value={form.apply_url} onChange={e => setForm(f => ({ ...f, apply_url: e.target.value }))} placeholder="https://…" />
                  </div>
                </>
              )}
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" style={{ minHeight: 80 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Recruiter name, interview notes…" />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
