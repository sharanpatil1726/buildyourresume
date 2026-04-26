import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { api } from '../lib/api'

const EXP_LEVELS = ['Fresher (0–1 yr)', 'Junior (1–2 yrs)', 'Mid Level (2–5 yrs)', 'Senior (5–8 yrs)', 'Lead / Principal (8+ yrs)']

function scoreClass(s: number) { return s >= 75 ? 'good' : s >= 50 ? 'ok' : 'bad' }
function scoreLabel(s: number) { return s >= 75 ? 'Great' : s >= 50 ? 'Average' : 'Needs Work' }

export default function Analyze() {
  const [tab, setTab] = useState<'upload' | 'paste'>('upload')
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
    if (!targetRole.trim()) { setError('Please enter a target job role.'); return }

    setLoading(true)
    try {
      let text = resumeText

      if (tab === 'upload') {
        if (!file) { setError('Please upload a resume file.'); setLoading(false); return }
        const uploaded = await api.resume.upload(file)
        text = uploaded.raw_text
      } else {
        if (text.trim().length < 100) { setError('Resume text is too short.'); setLoading(false); return }
      }

      const res = await api.analyze.run({ resume_text: text, target_role: targetRole, experience_level: expLevel })
      setResult(res.result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCoverLetter = async () => {
    if (!result) return
    setCoverLoading(true)
    try {
      const text = resumeText || ''
      const res = await api.analyze.coverLetter({ resume_text: text, target_role: targetRole, company: coverCompany })
      setCoverLetter(res.letter)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cover letter generation failed')
    } finally {
      setCoverLoading(false)
    }
  }

  const r = result as Record<string, unknown> | null

  return (
    <div className="page">
      <div className="page-inner">
        <h1 className="page-title">ATS Resume Analyzer</h1>
        <p className="page-sub">Get an instant ATS score and actionable improvements powered by Claude AI.</p>

        {!result ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div className="card">
              <div className="tabs">
                <button className={`tab-btn ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>Upload File</button>
                <button className={`tab-btn ${tab === 'paste' ? 'active' : ''}`} onClick={() => setTab('paste')}>Paste Text</button>
              </div>

              {tab === 'upload' ? (
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
                    <p style={{ fontWeight: 600, color: 'var(--success)' }}>✓ {file.name}</p>
                  ) : (
                    <p className="upload-text"><strong>Click to upload</strong> or drag &amp; drop<br />PDF or DOCX · Max 10 MB</p>
                  )}
                </div>
              ) : (
                <textarea
                  className="form-textarea resume-textarea"
                  style={{ minHeight: 220 }}
                  placeholder="Paste your resume text here…"
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                />
              )}
            </div>

            <div className="card">
              <div className="form-group">
                <label className="form-label">Target Job Role *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Software Engineer, Data Scientist"
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Experience Level</label>
                <select className="form-select" value={expLevel} onChange={e => setExpLevel(e.target.value)}>
                  {EXP_LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <button
                className="btn btn-primary btn-full btn-lg"
                onClick={handleAnalyze}
                disabled={loading}
              >
                {loading ? 'Analyzing with Claude AI…' : '🎯 Analyze Resume'}
              </button>
              {loading && <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.85rem', marginTop: 8 }}>This takes 10–20 seconds…</p>}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={() => setResult(null)}>← Analyze Another</button>
              <button className={`btn ${coverTab ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCoverTab(!coverTab)}>
                ✉️ Generate Cover Letter
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Overall score */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: 20 }}>
              <div className="card" style={{ textAlign: 'center' }}>
                <p className="section-title">Overall ATS Score</p>
                <div className="score-ring-wrap">
                  <div className={`score-ring ${scoreClass(r?.ats_score as number ?? 0)}`}>
                    {r?.ats_score as number ?? 0}
                    <small>/ 100</small>
                  </div>
                  <p className="score-label">{scoreLabel(r?.ats_score as number ?? 0)}</p>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '.85rem', padding: '0 8px' }}>{r?.verdict as string}</p>
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
                      <div className={`score-item-val`} style={{ color: `var(--${scoreClass(s.val as number ?? 0) === 'good' ? 'success' : scoreClass(s.val as number ?? 0) === 'ok' ? 'warning' : 'error'})` }}>
                        {s.val as number ?? 0}
                      </div>
                      <div className="score-item-label">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="divider" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', color: 'var(--muted)' }}>
                  <span>Detected Role: <strong style={{ color: 'var(--text)' }}>{r?.primary_role as string}</strong></span>
                  <span>Exp: <strong style={{ color: 'var(--text)' }}>{r?.years_experience as number}y</strong></span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: 20 }}>
              {/* Strengths */}
              <div className="card card-sm">
                <p className="section-title">Strengths</p>
                <ul className="check-list">
                  {(r?.strengths as string[] ?? []).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="card card-sm">
                <p className="section-title">Areas to Improve</p>
                <ul className="check-list cross-list">
                  {(r?.weaknesses as string[] ?? []).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>

              {/* Quick fixes */}
              <div className="card card-sm">
                <p className="section-title">Quick Fixes</p>
                <ul className="check-list bullet-list">
                  {(r?.quick_fixes as string[] ?? []).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: 20 }}>
              {/* Top skills */}
              <div className="card card-sm">
                <p className="section-title">Top Skills Found</p>
                <div className="tags">
                  {(r?.top_skills as string[] ?? []).map(s => <span key={s} className="tag success">{s}</span>)}
                </div>
              </div>

              {/* Missing keywords */}
              <div className="card card-sm">
                <p className="section-title">Missing Keywords</p>
                <div className="tags">
                  {(r?.missing_keywords as string[] ?? []).map(s => <span key={s} className="tag missing">{s}</span>)}
                </div>
              </div>
            </div>

            {/* Top recommendation */}
            {r?.top_recommendation && (
              <div className="alert alert-info" style={{ fontSize: '.95rem' }}>
                <strong>Top Recommendation:</strong> {r.top_recommendation as string}
              </div>
            )}

            {/* Optimized resume */}
            {r?.optimized_resume && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                  <span className="card-title">Optimized Resume Draft</span>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => navigator.clipboard.writeText(r.optimized_resume as string)}
                  >Copy</button>
                </div>
                <textarea
                  className="form-textarea resume-textarea"
                  style={{ minHeight: 300 }}
                  readOnly
                  value={r.optimized_resume as string}
                />
              </div>
            )}

            {/* Cover letter */}
            {coverTab && (
              <div className="card">
                <p className="card-title" style={{ marginBottom: 14 }}>Cover Letter Generator</p>
                <div className="form-group">
                  <label className="form-label">Company Name (optional)</label>
                  <input className="form-input" placeholder="e.g. Google, Flipkart" value={coverCompany} onChange={e => setCoverCompany(e.target.value)} />
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
        )}
      </div>
    </div>
  )
}
