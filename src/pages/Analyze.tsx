import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

declare global {
  interface Window { Razorpay: new (o: Record<string, unknown>) => { open(): void } }
}

const EXP_LEVELS = ['Fresher (0–1 yr)', 'Junior (1–2 yrs)', 'Mid Level (2–5 yrs)', 'Senior (5–8 yrs)', 'Lead / Principal (8+ yrs)']

const ANALYSIS_STEPS = [
  { step: 'Parsing your resume...', fact: '75% of resumes never reach a human — they\'re filtered by ATS first.' },
  { step: 'Extracting skills & keywords...', fact: 'Resumes with job-matched keywords are 3x more likely to get a callback.' },
  { step: 'Checking ATS compatibility...', fact: 'Most recruiters spend just 6–7 seconds on the first resume scan.' },
  { step: 'Analyzing format & structure...', fact: 'Single-column resumes score 25% higher on ATS than multi-column layouts.' },
  { step: 'Scoring your content quality...', fact: 'Quantified achievements (e.g. "increased sales by 30%") double callback rates.' },
  { step: 'Computing market demand...', fact: 'India\'s tech job market is growing 15% YoY — the right keywords unlock it.' },
  { step: 'Generating personalized insights...', fact: 'Tailoring your resume per role increases interview chances by 60%.' },
  { step: 'Preparing your full report...', fact: 'Top candidates spend ~4 hours optimizing their resume. You\'re almost there.' },
]

function AnalyzingOverlay() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % ANALYSIS_STEPS.length)
        setVisible(true)
      }, 400)
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  const current = ANALYSIS_STEPS[idx]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(248,246,255,0.96)',
      backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 28, padding: 24,
    }}>
      {/* Spinner ring */}
      <div style={{ position: 'relative', width: 88, height: 88 }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          border: '5px solid rgba(124,58,237,.15)',
          borderTopColor: '#7c3aed',
          animation: 'spin .9s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.8rem',
        }}>🤖</div>
      </div>

      {/* Step + fact */}
      <div style={{
        textAlign: 'center', maxWidth: 480,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity .35s ease, transform .35s ease',
      }}>
        <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)', marginBottom: 10 }}>
          {current.step}
        </p>
        <div style={{
          background: 'linear-gradient(135deg,#f5f3ff,#ecfeff)',
          border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 20px',
        }}>
          <p style={{ fontSize: '.82rem', color: 'var(--muted)', lineHeight: 1.6, fontStyle: 'italic' }}>
            💡 {current.fact}
          </p>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6 }}>
        {ANALYSIS_STEPS.map((_s, i: number) => (
          <div key={i} style={{
            width: i === idx ? 20 : 7, height: 7,
            borderRadius: 4,
            background: i === idx ? 'var(--primary)' : 'var(--border)',
            transition: 'all .3s ease',
          }} />
        ))}
      </div>

      <p style={{ fontSize: '.78rem', color: 'var(--muted)' }}>AI analysis takes 15–25 seconds</p>
    </div>
  )
}

function safeArr(v: unknown): string[] { return Array.isArray(v) ? (v as string[]) : [] }
function safeObj(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {} }
function scoreClass(s: number) { return s >= 75 ? 'good' : s >= 50 ? 'ok' : 'bad' }
function scoreColor(s: number) { return s >= 75 ? 'var(--success)' : s >= 50 ? 'var(--gold)' : 'var(--error)' }

function ScoreBar({ label, value, barClass, blurValue = false }: { label: string; value: number; barClass: string; blurValue?: boolean }) {
  const v = typeof value === 'number' ? value : 0
  return (
    <div className="score-bar-wrap">
      <div className="score-bar-label">
        <span>{label}</span>
        <span style={{
          color: blurValue ? 'var(--muted)' : scoreColor(v),
          fontWeight: 700,
          filter: blurValue ? 'blur(5px)' : 'none',
          userSelect: blurValue ? 'none' : 'auto',
        }}>{v}</span>
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

  const handleDownload = async (type: 'txt' | 'doc') => {
    if (!scanId) return
    if (user?.plan !== 'pro') {
      setError('Resume download requires Pro plan (₹299/month). Upgrade at /pricing.')
      return
    }
    setOptimizeLoading(true)
    try {
      const res = await api.analyze.getOptimized(scanId)
      const safeName = targetRole.replace(/\s+/g, '_') || 'resume'
      if (type === 'txt') {
        const blob = new Blob([res.text], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${safeName}_optimized.txt`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        // RTF format — opens in Word, Google Docs, Pages on all platforms
        const rtfLines = res.text
          .split('\n')
          .map(line => line.replace(/\\/g, '\\\\').replace(/[{}]/g, '\\$&'))
          .join('\\par\n')
        const rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\froman\\fcharset0 Arial;}}\n{\\colortbl;\\red0\\green0\\blue0;}\n\\f0\\fs24\\sl360\\slmult1\n${rtfLines}\n}`
        const blob = new Blob([rtf], { type: 'application/rtf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${safeName}_optimized.rtf`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        URL.revokeObjectURL(url)
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
        {loading && <AnalyzingOverlay />}
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
          {isUnlocked && scanId && user?.plan === 'pro' && (
            <div className="download-row">
              <button className="btn btn-accent btn-sm" onClick={() => handleDownload('txt')} disabled={optimizeLoading}>
                {optimizeLoading ? '⏳' : '📄 Download TXT'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => handleDownload('doc')} disabled={optimizeLoading}>
                📝 Download RTF/DOC
              </button>
            </div>
          )}
          {isUnlocked && scanId && user?.plan !== 'pro' && (
            <a href="/pricing" className="btn btn-gold btn-sm" style={{ textDecoration: 'none' }}>
              ⭐ Pro to Download Resume
            </a>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* ══ FREE SECTION ════════════════════════════════ */}

        {/* Score Breakdown */}
        <div className="results-grid" style={{ marginBottom: 16 }}>
          <div className="card" style={{ background: 'linear-gradient(135deg,#f5f3ff,white)' }}>
            <p className="section-title">Score Breakdown</p>
            {!isUnlocked && (
              <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 10, fontStyle: 'italic' }}>
                🔒 Unlock full report to see exact scores
              </p>
            )}
            <ScoreBar label="Keywords Match"  value={r?.keyword_score as number}    barClass="bar-violet"  blurValue={!isUnlocked} />
            <ScoreBar label="Format Quality"  value={r?.format_score as number}     barClass="bar-cyan"    blurValue={!isUnlocked} />
            <ScoreBar label="Content Quality" value={r?.content_score as number}    barClass="bar-emerald" blurValue={!isUnlocked} />
            <ScoreBar label="Readability"     value={r?.readability_score as number} barClass="bar-amber"  blurValue={!isUnlocked} />
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
            {user?.plan === 'pro' ? (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-accent" onClick={() => handleDownload('txt')} disabled={optimizeLoading}>
                  {optimizeLoading ? '⏳ Generating…' : '📄 Download as TXT'}
                </button>
                <button className="btn btn-outline" onClick={() => handleDownload('doc')} disabled={optimizeLoading}>
                  {optimizeLoading ? '⏳ Generating…' : '📝 Download as RTF/DOC'}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--gold)', fontSize: '.85rem', marginBottom: 12, fontWeight: 600 }}>
                  ⭐ Resume download is a Pro feature
                </p>
                <a href="/pricing" className="btn btn-gold" style={{ textDecoration: 'none' }}>
                  Upgrade to Pro — ₹299/month
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
