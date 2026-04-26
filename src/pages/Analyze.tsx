import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { api } from '../lib/api'

const EXP_LEVELS = ['Fresher (0–1 yr)', 'Junior (1–2 yrs)', 'Mid Level (2–5 yrs)', 'Senior (5–8 yrs)', 'Lead / Principal (8+ yrs)']

function scoreClass(s: number) { return s >= 75 ? 'good' : s >= 50 ? 'ok' : 'bad' }
function scoreColor(s: number) { return s >= 75 ? 'var(--success)' : s >= 50 ? 'var(--warning)' : 'var(--error)' }
function scoreLabel(s: number) { return s >= 75 ? 'Strong' : s >= 50 ? 'Average' : 'Needs Work' }
function safeArr(v: unknown): string[] { return Array.isArray(v) ? (v as string[]) : [] }

export default function Analyze() {
  const [file, setFile] = useState<File | null>(null)
  const [resumeText, setResumeText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [expLevel, setExpLevel] = useState(EXP_LEVELS[2])
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [coverTab, setCoverTab] = useState(false)
  const [coverCompany, setCoverCompany] = useState('')
  const [coverLoading, setCoverLoading] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.type)) {
      setError('Only PDF and DOCX files are supported.'); return
    }
    setFile(f); setError('')
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const handleAnalyze = async () => {
    setError(''); setResult(null)
    if (!file) { setError('Please upload your resume (PDF or DOCX).'); return }
    if (!targetRole.trim()) { setError('Please enter a target job role.'); return }
    setLoading(true)
    try {
      const uploaded = await api.resume.upload(file)
      setResumeText(uploaded.raw_text)
      const res = await api.analyze.run({ resume_text: uploaded.raw_text, target_role: targetRole, experience_level: expLevel })
      setResult(res.result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCoverLetter = async () => {
    if (!result) return
    setCoverLoading(true)
    try {
      const res = await api.analyze.coverLetter({ resume_text: resumeText, target_role: targetRole, company: coverCompany })
      setCoverLetter(res.letter)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cover letter generation failed')
    } finally {
      setCoverLoading(false)
    }
  }

  const r = result as Record<string, unknown> | null

  if (!result) {
    return (
      <div className="page">
        <div className="page-inner" style={{ maxWidth: 720 }}>
          <h1 className="page-title">ATS Resume Analyzer</h1>
          <p className="page-sub">Upload your resume and get an instant ATS score with AI-powered recommendations.</p>

          <div className="card" style={{ marginBottom: 16 }}>
            <p className="section-title">Resume</p>
            <div
              className={`upload-zone ${drag ? 'drag' : ''}`}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".pdf,.docx" onChange={onFileChange} />
              <div className="upload-icon">📄</div>
              {file ? (
                <p style={{ fontWeight: 600, color: 'var(--success)', fontSize: '.9rem' }}>✓ {file.name}</p>
              ) : (
                <p className="upload-text">
                  <strong>Click to upload</strong> or drag &amp; drop<br />
                  <span style={{ fontSize: '.8rem' }}>PDF or DOCX · Max 10 MB</span>
                </p>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <p className="section-title">Job Details</p>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Target Role *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Software Engineer"
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Experience Level</label>
                <select className="form-select" value={expLevel} onChange={e => setExpLevel(e.target.value)}>
                  {EXP_LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button className="btn btn-primary btn-full btn-lg" onClick={handleAnalyze} disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Analyzing with Claude AI…
              </span>
            ) : 'Analyze Resume'}
          </button>
          {loading && (
            <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.8rem', marginTop: 10 }}>
              This takes 15–25 seconds while AI reads your resume
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setResult(null)}>← Analyze Another</button>
          <button
            className={`btn btn-sm ${coverTab ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setCoverTab(!coverTab)}
          >
            Generate Cover Letter
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Score overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="section-title">Overall ATS Score</p>
            <div className="score-ring-wrap">
              <div className={`score-ring ${scoreClass(r?.ats_score as number ?? 0)}`}>
                {r?.ats_score as number ?? 0}
                <small>/ 100</small>
              </div>
              <p className="score-label">{scoreLabel(r?.ats_score as number ?? 0)}</p>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '.85rem', padding: '0 8px', lineHeight: 1.5 }}>{r?.verdict as string}</p>
          </div>

          <div className="card">
            <p className="section-title">Score Breakdown</p>
            <div className="scores-row">
              {[
                { label: 'Keywords',    val: r?.keyword_score },
                { label: 'Format',      val: r?.format_score },
                { label: 'Content',     val: r?.content_score },
                { label: 'Readability', val: r?.readability_score },
              ].map(s => (
                <div key={s.label} className="score-item">
                  <div className="score-item-val" style={{ color: scoreColor(s.val as number ?? 0) }}>
                    {s.val as number ?? 0}
                  </div>
                  <div className="score-item-label">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: 'var(--muted)' }}>
              <span>Role: <strong style={{ color: 'var(--text)' }}>{r?.primary_role as string}</strong></span>
              <span>Level: <strong style={{ color: 'var(--text)' }}>{r?.candidate_level as string}</strong></span>
              <span>Exp: <strong style={{ color: 'var(--text)' }}>{r?.years_experience as number}y</strong></span>
            </div>
          </div>
        </div>

        {/* Top recommendation */}
        {r?.top_recommendation && (
          <div className="alert alert-info" style={{ fontSize: '.875rem', marginBottom: 16 }}>
            <strong>Top Recommendation: </strong>{r.top_recommendation as string}
          </div>
        )}

        {/* Strengths / Weaknesses / Quick fixes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="card card-sm">
            <p className="section-title">Strengths</p>
            <ul className="check-list">
              {safeArr(r?.strengths).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="card card-sm">
            <p className="section-title">Areas to Improve</p>
            <ul className="check-list cross-list">
              {safeArr(r?.weaknesses).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="card card-sm">
            <p className="section-title">Quick Fixes</p>
            <ul className="check-list bullet-list">
              {safeArr(r?.quick_fixes).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>

        {/* Skills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="card card-sm">
            <p className="section-title">Skills Found</p>
            <div className="tags">
              {safeArr(r?.top_skills).map(s => <span key={s} className="tag success">{s}</span>)}
            </div>
          </div>
          <div className="card card-sm">
            <p className="section-title">Missing Keywords</p>
            <div className="tags">
              {safeArr(r?.missing_keywords).map(s => <span key={s} className="tag missing">{s}</span>)}
            </div>
          </div>
        </div>

        {/* Cover letter */}
        {coverTab && (
          <div className="card" style={{ marginBottom: 16 }}>
            <p className="card-title" style={{ marginBottom: 14 }}>Cover Letter Generator</p>
            <div className="form-group">
              <label className="form-label">Company Name (optional)</label>
              <input className="form-input" placeholder="e.g. Google, Infosys" value={coverCompany} onChange={e => setCoverCompany(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleCoverLetter} disabled={coverLoading}>
              {coverLoading ? 'Generating…' : 'Generate Cover Letter'}
            </button>
            {coverLetter && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => navigator.clipboard.writeText(coverLetter)}>Copy</button>
                </div>
                <textarea className="form-textarea resume-textarea" style={{ minHeight: 320 }} readOnly value={coverLetter} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
