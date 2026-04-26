import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

declare global {
  interface Window { Razorpay: new (o: Record<string, unknown>) => { open(): void } }
}

const EXP_LEVELS = ['Fresher (0–1 yr)', 'Junior (1–2 yrs)', 'Mid Level (2–5 yrs)', 'Senior (5–8 yrs)', 'Lead / Principal (8+ yrs)']

function safeArr(v: unknown): string[] { return Array.isArray(v) ? (v as string[]) : [] }
function safeObj(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {} }
function scoreClass(s: number) { return s >= 75 ? 'good' : s >= 50 ? 'ok' : 'bad' }
function scoreColor(s: number) { return s >= 75 ? 'var(--success)' : s >= 50 ? 'var(--gold)' : 'var(--error)' }

function ScoreBar({ label, value, barClass }: { label: string; value: number; barClass: string }) {
  const v = typeof value === 'number' ? value : 0
  return (
    <div className="score-bar-wrap">
      <div className="score-bar-label">
        <span>{label}</span>
        <span style={{ color: scoreColor(v), fontWeight: 700 }}>{v}</span>
      </div>
      <div className="score-bar-track">
        <div className={`score-bar-fill ${barClass}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

function ChecklistItem({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className="checklist-item">
      <div className={`checklist-dot ${pass ? 'pass' : 'fail'}`}>{pass ? '✓' : '✗'}</div>
      <span style={{ color: pass ? 'var(--text)' : 'var(--muted)' }}>{label}</span>
    </div>
  )
}

const ATS_CHECKLIST_LABELS: Record<string, string> = {
  has_contact_info: 'Contact info (email)',
  has_phone: 'Phone number',
  has_summary: 'Professional summary',
  has_quantified_achievements: 'Quantified achievements (%, $)',
  uses_strong_action_verbs: 'Strong action verbs',
  proper_date_format: 'Consistent date format',
  ats_safe_format: 'ATS-safe format',
  has_skills_section: 'Skills section',
  has_education: 'Education section',
  no_tables_graphics: 'No tables / graphics',
  consistent_formatting: 'Consistent formatting',
  good_bullet_structure: 'Good bullet structure (8+)',
}

export default function Analyze() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [resumeText, setResumeText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [expLevel, setExpLevel] = useState(EXP_LEVELS[2])
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [scanId, setScanId] = useState<string | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [unlockLoading, setUnlockLoading] = useState(false)
  const [optimizeLoading, setOptimizeLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.type)) {
      setError('Only PDF and DOCX files are supported.'); return
    }
    setFile(f); setError('')
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) handleFile(f)
  }

  const handleAnalyze = async () => {
    setError(''); setResult(null); setScanId(null); setIsUnlocked(false)
    if (!file) { setError('Please upload your resume (PDF or DOCX).'); return }
    if (!targetRole.trim()) { setError('Please enter a target job role.'); return }
    setLoading(true)
    try {
      const uploaded = await api.resume.upload(file)
      setResumeText(uploaded.raw_text)
      const res = await api.analyze.run({ resume_text: uploaded.raw_text, target_role: targetRole, experience_level: expLevel })
      setResult(res.result)
      setScanId(res.scan_id)
      setIsUnlocked(res.is_unlocked)
      localStorage.setItem('atsbrain_target_role', targetRole)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async () => {
    if (!scanId) return
    setUnlockLoading(true)
    try {
      const order = await api.analyze.createUnlockOrder(scanId)
      if (!window.Razorpay) { setError('Payment gateway not loaded. Please refresh.'); return }
      const rz = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'AtsBrain',
        description: 'Full Analysis Unlock',
        order_id: order.order_id,
        prefill: { email: user?.email || '' },
        theme: { color: '#7c3aed' },
        handler: async (response: Record<string, string>) => {
          try {
            const res = await api.analyze.verifyUnlock(scanId, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            setResult(prev => ({ ...(prev || {}), ...res.result }))
            setIsUnlocked(true)
            setUnlockLoading(false)
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Payment verification failed')
            setUnlockLoading(false)
          }
        },
        modal: { ondismiss: () => setUnlockLoading(false) },
      })
      rz.open()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create payment order')
      setUnlockLoading(false)
    }
  }

  const handleDownload = async (type: 'txt' | 'pdf') => {
    if (!scanId) return
    setOptimizeLoading(true)
    try {
      const res = await api.analyze.getOptimized(scanId)
      if (type === 'txt') {
        const blob = new Blob([res.text], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `resume_${targetRole.replace(/\s+/g, '_')}_optimized.txt`
        a.click(); URL.revokeObjectURL(url)
      } else {
        const htmlContent = `<html><head><meta charset="utf-8"/><style>body{font-family:Arial;font-size:12pt;line-height:1.5;margin:2cm;}pre{white-space:pre-wrap;font-family:inherit;}</style></head><body><pre>${res.text.replace(/</g, '&lt;')}</pre></body></html>`
        const blob = new Blob([htmlContent], { type: 'application/msword' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `resume_${targetRole.replace(/\s+/g, '_')}_optimized.doc`
        a.click(); URL.revokeObjectURL(url)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not generate optimized resume')
    } finally {
      setOptimizeLoading(false)
    }
  }

  const r = result

  // ── Upload form ──────────────────────────────────────────
  if (!result) {
    return (
      <div className="page">
        <div className="page-inner" style={{ maxWidth: 720 }}>
          <h1 className="page-title">ATS Resume Analyzer</h1>
          <p className="page-sub">Upload your resume and get an instant ATS score with AI-powered insights.</p>

          <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg,#f5f3ff,white)' }}>
            <p className="section-title">Resume File</p>
            <div
              className={`upload-zone ${drag ? 'drag' : ''}`}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".pdf,.docx" onChange={onFileChange} />
              <div className="upload-icon">{file ? '✅' : '📄'}</div>
              {file ? (
                <p style={{ fontWeight: 700, color: 'var(--success)', fontSize: '.9rem' }}>{file.name}</p>
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
                <input className="form-input" placeholder="e.g. Software Engineer"
                  value={targetRole} onChange={e => setTargetRole(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAnalyze()} />
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

          <div className="alert alert-gold" style={{ marginBottom: 14, fontSize: '.82rem' }}>
            🔒 Free: Score breakdown, strengths, skills &amp; ATS checklist &nbsp;·&nbsp; 🔓 ₹49: Full analysis including ATS score, weaknesses, interview questions &amp; more
          </div>

          <button className="btn btn-primary btn-full btn-lg" onClick={handleAnalyze} disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Analyzing with AI…
              </span>
            ) : '🚀 Analyze Resume'}
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

  // ── Results ──────────────────────────────────────────────
  const atsBreakdown = safeObj(r?.ats_breakdown)
  const interviewLikelihood = safeObj(r?.interview_likelihood)
  const gapAnalysis = safeObj(r?.gap_analysis)
  const marketDemand = safeObj(r?.market_demand)
  const salaryNeg = safeObj(r?.salary_negotiation)
  const roleGuide = safeObj(r?.role_guide)

  return (
    <div className="page">
      <div className="page-inner">

        {/* Action bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setResult(null); setScanId(null) }}>← New Scan</button>
          {scanId && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/scan/${scanId}`)}>View History</button>
          )}
          {!isUnlocked && (
            <button className="btn btn-gold btn-sm" onClick={handleUnlock} disabled={unlockLoading}>
              {unlockLoading ? 'Opening payment…' : '🔒 Unlock Full Report — ₹49'}
            </button>
          )}
          {isUnlocked && (
            <span style={{ fontSize: '.8rem', color: 'var(--success)', fontWeight: 700, padding: '6px 12px', background: 'var(--success-light)', borderRadius: 6 }}>
              ✅ Fully Unlocked
            </span>
          )}
          {isUnlocked && scanId && (
            <div className="download-row">
              <button className="btn btn-accent btn-sm" onClick={() => handleDownload('txt')} disabled={optimizeLoading}>
                {optimizeLoading ? '⏳' : '📄 Download TXT'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => handleDownload('pdf')} disabled={optimizeLoading}>
                📝 Download DOC
              </button>
            </div>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* ══ FREE SECTION ════════════════════════════════ */}

        {/* Score Breakdown */}
        <div className="results-grid" style={{ marginBottom: 16 }}>
          <div className="card" style={{ background: 'linear-gradient(135deg,#f5f3ff,white)' }}>
            <p className="section-title">Score Breakdown</p>
            <ScoreBar label="Keywords Match"  value={r?.keyword_score as number}    barClass="bar-violet" />
            <ScoreBar label="Format Quality"  value={r?.format_score as number}     barClass="bar-cyan" />
            <ScoreBar label="Content Quality" value={r?.content_score as number}    barClass="bar-emerald" />
            <ScoreBar label="Readability"     value={r?.readability_score as number} barClass="bar-amber" />
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg,#ecfeff,white)' }}>
            <p className="section-title">Interview Likelihood</p>
            <div className="interview-bars">
              {[
                { key: 'tech_companies', label: 'Tech Co.' },
                { key: 'startups',       label: 'Startups' },
                { key: 'enterprise',     label: 'Enterprise' },
                { key: 'remote_roles',   label: 'Remote' },
              ].map(({ key, label }) => {
                const val = (interviewLikelihood[key] as number) ?? 0
                return (
                  <div key={key} className="interview-bar-wrap">
                    <span className="interview-bar-label">{label}</span>
                    <div className="interview-bar-track">
                      <div className="interview-bar-fill" style={{ width: `${val}%` }} />
                    </div>
                    <span className="interview-bar-pct">{val}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Skills + ATS Checklist */}
        <div className="results-grid" style={{ marginBottom: 16 }}>
          <div className="card card-sm">
            <p className="section-title">Skills Found</p>
            <div className="tags">
              {safeArr(r?.top_skills).map(s => <span key={s} className="tag skill">{s}</span>)}
              {safeArr(r?.top_skills).length === 0 && <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>No skills detected</span>}
            </div>
          </div>

          <div className="card card-sm">
            <p className="section-title">ATS Compatibility Checklist</p>
            <div className="ats-checklist">
              {Object.entries(ATS_CHECKLIST_LABELS).map(([key, label]) => (
                <ChecklistItem key={key} label={label} pass={!!atsBreakdown[key]} />
              ))}
            </div>
          </div>
        </div>

        {/* Strengths + Portfolio */}
        <div className="results-grid" style={{ marginBottom: 16 }}>
          <div className="card card-sm" style={{ background: 'linear-gradient(135deg,#ecfdf5,white)' }}>
            <p className="section-title">Strengths</p>
            <ul className="check-list">
              {safeArr(r?.strengths).map((s, i) => <li key={i}>{s}</li>)}
              {safeArr(r?.strengths).length === 0 && <li style={{ color: 'var(--muted)' }}>No strengths detected</li>}
            </ul>
          </div>

          <div className="card card-sm" style={{ background: 'linear-gradient(135deg,#fffbeb,white)' }}>
            <p className="section-title">Portfolio &amp; Projects to Build</p>
            <ul className="bullet-list check-list">
              {safeArr(gapAnalysis.skill_gaps as unknown).map((s, i) => <li key={i}>{s}</li>)}
              {safeArr(gapAnalysis.skill_gaps as unknown).length === 0 && (
                <li style={{ color: 'var(--muted)' }}>Analysis complete — keep building!</li>
              )}
            </ul>
            {gapAnalysis.estimated_learning_time && (
              <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                ⏱ Estimated to close gaps: <strong>{gapAnalysis.estimated_learning_time as string}</strong>
              </p>
            )}
          </div>
        </div>

        {/* ══ LOCKED SECTION ═══════════════════════════════ */}
        <div className="locked-section">
          <div className={isUnlocked ? '' : 'locked-content'}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 16 }}>

              {/* ATS Score */}
              <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg,#f5f3ff,white)' }}>
                <p className="section-title" style={{ justifyContent: 'center' }}>Overall ATS Score</p>
                <div className="score-ring-wrap">
                  <div className={`score-ring ${scoreClass(r?.ats_score as number ?? 0)}`}>
                    {r?.ats_score as number ?? 0}
                    <small>/ 100</small>
                  </div>
                  <p className="score-label">{(r?.ats_score as number ?? 0) >= 75 ? 'Strong' : (r?.ats_score as number ?? 0) >= 50 ? 'Average' : 'Needs Work'}</p>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '.85rem', padding: '0 8px', lineHeight: 1.5 }}>{r?.verdict as string}</p>
              </div>

              {/* Weaknesses */}
              <div className="card card-sm" style={{ background: 'linear-gradient(135deg,#fef2f2,white)' }}>
                <p className="section-title">Weaknesses</p>
                <ul className="cross-list check-list">
                  {safeArr(r?.weaknesses).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>

            {/* Quick Fixes + Top Recommendations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 16 }}>
              <div className="card card-sm" style={{ background: 'linear-gradient(135deg,#fffbeb,white)' }}>
                <p className="section-title">Quick Fixes to Boost Score ⚡</p>
                <ul className="bullet-list check-list">
                  {safeArr(r?.quick_fixes).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>

              <div className="card card-sm" style={{ background: 'linear-gradient(135deg,#f5f3ff,white)' }}>
                <p className="section-title">Top Recommendations</p>
                {r?.top_recommendation && (
                  <div style={{ padding: '10px 12px', background: 'var(--primary-light)', borderRadius: 8, marginBottom: 10, fontSize: '.875rem', fontWeight: 600 }}>
                    🥇 {r.top_recommendation as string}
                  </div>
                )}
                <ul className="bullet-list check-list">
                  {safeArr(r?.secondary_recommendations).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>

            {/* Missing Keywords */}
            <div className="card card-sm" style={{ marginBottom: 16, background: 'linear-gradient(135deg,#fef2f2,white)' }}>
              <p className="section-title">Missing Keywords</p>
              <div className="tags">
                {safeArr(r?.missing_keywords).map(s => <span key={s} className="tag missing">{s}</span>)}
              </div>
            </div>

            {/* Role-Specific Guide */}
            {(roleGuide.key_responsibilities || roleGuide.must_have_skills) && (
              <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg,#ecfeff,white)' }}>
                <p className="section-title">Role-Specific Guide 🗺</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
                  {roleGuide.key_responsibilities && (
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--accent)', marginBottom: 8 }}>Key Responsibilities</p>
                      <ul className="check-list">
                        {safeArr(roleGuide.key_responsibilities as unknown).map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {roleGuide.must_have_skills && (
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--primary)', marginBottom: 8 }}>Must-Have Skills</p>
                      <div className="tags">
                        {safeArr(roleGuide.must_have_skills as unknown).map(s => <span key={s} className="tag tech">{s}</span>)}
                      </div>
                    </div>
                  )}
                  {roleGuide.certifications && (
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--gold)', marginBottom: 8 }}>Certifications</p>
                      <div className="tags">
                        {safeArr(roleGuide.certifications as unknown).map(s => <span key={s} className="tag gold">{s}</span>)}
                      </div>
                    </div>
                  )}
                </div>
                {roleGuide.next_steps && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--accent-light)', borderRadius: 8, fontSize: '.875rem', color: 'var(--accent-dark)' }}>
                    <strong>Next Steps: </strong>{roleGuide.next_steps as string}
                  </div>
                )}
              </div>
            )}

            {/* Interview Prep Questions */}
            {safeArr(r?.interview_questions).length > 0 && (
              <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg,#ecfdf5,white)' }}>
                <p className="section-title">Common Interview Questions 🎤</p>
                <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {safeArr(r?.interview_questions).map((q, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, fontSize: '.875rem' }}>
                      <span style={{ background: 'var(--success)', color: 'white', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Salary Negotiation */}
            {(salaryNeg.expected_range || salaryNeg.negotiation_tips) && (
              <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg,#fffbeb,white)' }}>
                <p className="section-title">Salary Negotiation Tips 💰</p>
                {salaryNeg.expected_range && (
                  <div style={{ display: 'inline-block', padding: '8px 18px', background: 'var(--gold-light)', border: '2px solid var(--gold)', borderRadius: 8, fontWeight: 800, color: 'var(--gold)', fontSize: '1.1rem', marginBottom: 14 }}>
                    Expected: {salaryNeg.expected_range as string}
                  </div>
                )}
                <ul className="check-list">
                  {safeArr(salaryNeg.negotiation_tips as unknown).map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}

            {/* Market Analysis */}
            {Object.keys(marketDemand).length > 0 && (
              <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg,#f5f3ff,white)' }}>
                <p className="section-title">2025 Market Analysis 📊</p>
                <div className="market-row" style={{ marginBottom: 14 }}>
                  {marketDemand.role_demand && <div className="market-item"><div className="market-item-value">{marketDemand.role_demand as string}</div><div className="market-item-label">Demand</div></div>}
                  {marketDemand.avg_salary_range && <div className="market-item"><div className="market-item-value" style={{ fontSize: '.8rem' }}>{marketDemand.avg_salary_range as string}</div><div className="market-item-label">Avg Salary</div></div>}
                  {marketDemand.market_trend && <div className="market-item"><div className="market-item-value">{marketDemand.market_trend as string}</div><div className="market-item-label">Trend</div></div>}
                </div>
                {safeArr(marketDemand.hot_industries as unknown).length > 0 && (
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '.8rem', color: 'var(--primary)', marginBottom: 8 }}>Hot Industries 🔥</p>
                    <div className="tags">
                      {safeArr(marketDemand.hot_industries as unknown).map(s => <span key={s} className="tag skill">{s}</span>)}
                    </div>
                  </div>
                )}
                {safeArr(marketDemand.trending_skills as unknown).length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontWeight: 700, fontSize: '.8rem', color: 'var(--accent)', marginBottom: 8 }}>Trending Skills</p>
                    <div className="tags">
                      {safeArr(marketDemand.trending_skills as unknown).map(s => <span key={s} className="tag tech">{s}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lock overlay */}
          {!isUnlocked && (
            <div className="lock-overlay">
              <div className="lock-icon">🔒</div>
              <div className="lock-title">Unlock Full Analysis</div>
              <div className="lock-price">₹49</div>
              <div className="lock-desc">
                Get your ATS Score, Weaknesses, Interview Questions, Salary Range, Market Analysis, Role Guide &amp; more
              </div>
              <div className="lock-features">
                {['ATS Score', 'Weaknesses', 'Quick Fixes', 'Role Guide', 'Interview Q&A', 'Salary Tips', 'Market Analysis', 'Top Recommendations'].map(f => (
                  <span key={f}>{f}</span>
                ))}
              </div>
              <button className="btn btn-gold btn-lg" onClick={handleUnlock} disabled={unlockLoading}
                style={{ marginTop: 4 }}>
                {unlockLoading ? '⏳ Opening payment…' : '🔓 Unlock for ₹49'}
              </button>
              <p style={{ fontSize: '.75rem', color: 'var(--muted)' }}>One-time payment · No subscription</p>
            </div>
          )}
        </div>

        {/* Download section (only after unlock) */}
        {isUnlocked && (
          <div className="card" style={{ marginTop: 16, background: 'linear-gradient(135deg,#ecfeff,white)', textAlign: 'center' }}>
            <p className="section-title" style={{ justifyContent: 'center' }}>Download Optimized Resume</p>
            <p style={{ color: 'var(--muted)', fontSize: '.875rem', marginBottom: 16 }}>
              AI-rewritten version of your resume with keywords, strong verbs &amp; ATS-safe format
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-accent" onClick={() => handleDownload('txt')} disabled={optimizeLoading}>
                {optimizeLoading ? '⏳ Generating…' : '📄 Download as TXT'}
              </button>
              <button className="btn btn-outline" onClick={() => handleDownload('pdf')} disabled={optimizeLoading}>
                {optimizeLoading ? '⏳ Generating…' : '📝 Download as DOC'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
