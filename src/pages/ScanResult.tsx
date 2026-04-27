import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { Lock, CheckCircle, Download, Zap, Star, BarChart, Award, TrendingUp, IndianRupee, Users, ClipboardList } from '../components/Icons'

declare global {
  interface Window { Razorpay: new (o: Record<string, unknown>) => { open(): void } }
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

const ATS_CHECKLIST_LABELS: Record<string, string> = {
  has_contact_info: 'Contact info (email)',
  has_phone: 'Phone number',
  has_summary: 'Professional summary',
  has_quantified_achievements: 'Quantified achievements',
  uses_strong_action_verbs: 'Strong action verbs',
  proper_date_format: 'Consistent date format',
  ats_safe_format: 'ATS-safe format',
  has_skills_section: 'Skills section',
  has_education: 'Education section',
  no_tables_graphics: 'No tables / graphics',
  consistent_formatting: 'Consistent formatting',
  good_bullet_structure: 'Good bullet structure',
}

export default function ScanResult() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [scan, setScan] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unlockLoading, setUnlockLoading] = useState(false)
  const [optimizeLoading, setOptimizeLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    api.analyze.get(id)
      .then(data => setScan(data as unknown as Record<string, unknown>))
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load scan'))
      .finally(() => setLoading(false))
  }, [id])

  const handleUnlock = async () => {
    if (!id) return
    setUnlockLoading(true)
    try {
      const order = await api.analyze.createUnlockOrder(id)
      if (!window.Razorpay) { setError('Payment gateway not loaded.'); return }
      const rz = new window.Razorpay({
        key: order.key_id, amount: order.amount, currency: order.currency,
        name: 'AtsBrain', description: 'Full Analysis Unlock', order_id: order.order_id,
        prefill: { email: user?.email || '' }, theme: { color: '#7c3aed' },
        handler: async (response: Record<string, string>) => {
          try {
            const res = await api.analyze.verifyUnlock(id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            setScan(prev => prev ? { ...prev, is_unlocked: true, result: res.result } : prev)
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
    if (!id) return
    if (user?.plan !== 'pro') {
      setError('Resume download requires Pro plan (₹299/month). Upgrade at /pricing.')
      return
    }
    setOptimizeLoading(true)
    try {
      const res = await api.analyze.getOptimized(id)
      const safeName = ((scan?.target_role as string) || 'resume').replace(/\s+/g, '_')
      if (type === 'txt') {
        const blob = new Blob([res.text], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${safeName}_optimized.txt`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        const rtfLines = res.text
          .split('\n')
          .map((line: string) => line.replace(/\\/g, '\\\\').replace(/[{}]/g, '\\$&'))
          .join('\\par\n')
        const rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\froman\\fcharset0 Arial;}}\n{\\colortbl;\\red0\\green0\\blue0;}\n\\f0\\fs24\\sl360\\slmult1\n${rtfLines}\n}`
        const blob = new Blob([rtf], { type: 'application/rtf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${safeName}_optimized.rtf`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch {
      setError('Could not generate optimized resume')
    } finally {
      setOptimizeLoading(false)
    }
  }

  if (loading) return <div className="page"><div className="loader-wrap"><div className="loader" /></div></div>
  if (!scan) return <div className="page"><div className="page-inner"><div className="alert alert-error">{error || 'Scan not found'}</div></div></div>

  const r = safeObj(scan.result)
  const isUnlocked = !!scan.is_unlocked || user?.plan === 'pro'
  const atsBreakdown = safeObj(r.ats_breakdown)
  const interviewLikelihood = safeObj(r.interview_likelihood)
  const gapAnalysis = safeObj(r.gap_analysis)
  const marketDemand = safeObj(r.market_demand)
  const salaryNeg = safeObj(r.salary_negotiation)
  const roleGuide = safeObj(r.role_guide)

  return (
    <div className="page">
      <div className="page-inner">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>← Dashboard</button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/analyze')}>+ New Scan</button>
          {!isUnlocked && (
            <button className="btn btn-gold btn-sm" onClick={handleUnlock} disabled={unlockLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={13} />
              {unlockLoading ? 'Opening payment…' : 'Unlock Full Report — ₹49'}
            </button>
          )}
          {isUnlocked && (
            <span style={{ fontSize: '.8rem', color: 'var(--success)', fontWeight: 700, padding: '6px 12px', background: 'var(--success-light)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle size={13} /> Fully Unlocked
            </span>
          )}
          {isUnlocked && user?.plan === 'pro' && (
            <>
              <button className="btn btn-accent btn-sm" onClick={() => handleDownload('txt')} disabled={optimizeLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={13} /> {optimizeLoading ? 'Generating…' : 'Download TXT'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => handleDownload('doc')} disabled={optimizeLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={13} /> {optimizeLoading ? 'Generating…' : 'Download RTF/DOC'}
              </button>
            </>
          )}
          {isUnlocked && user?.plan !== 'pro' && (
            <a href="/pricing" className="btn btn-gold btn-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Star size={13} /> Pro to Download
            </a>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <h1 className="page-title">{scan.target_role as string}</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            {scan.experience_level as string} · {new Date(scan.created_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Score Breakdown + Interview */}
        <div className="results-grid" style={{ marginBottom: 16 }}>
          <div className="card" style={{ background: 'linear-gradient(135deg,#f5f3ff,white)' }}>
            <p className="section-title">Score Breakdown</p>
            {!isUnlocked && (
              <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 10, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={12} /> Unlock full report to see exact scores
              </p>
            )}
            <ScoreBar label="Keywords Match" value={r.keyword_score as number} barClass="bar-violet" blurValue={!isUnlocked} />
            <ScoreBar label="Format Quality" value={r.format_score as number} barClass="bar-cyan" blurValue={!isUnlocked} />
            <ScoreBar label="Content Quality" value={r.content_score as number} barClass="bar-emerald" blurValue={!isUnlocked} />
            <ScoreBar label="Readability" value={r.readability_score as number} barClass="bar-amber" blurValue={!isUnlocked} />
          </div>
          <div className="card" style={{ background: 'linear-gradient(135deg,#ecfeff,white)' }}>
            <p className="section-title">Interview Likelihood</p>
            <div className="interview-bars">
              {[{ key: 'tech_companies', label: 'Tech Co.' }, { key: 'startups', label: 'Startups' }, { key: 'enterprise', label: 'Enterprise' }, { key: 'remote_roles', label: 'Remote' }].map(({ key, label }) => {
                const val = (interviewLikelihood[key] as number) ?? 0
                return (
                  <div key={key} className="interview-bar-wrap">
                    <span className="interview-bar-label">{label}</span>
                    <div className="interview-bar-track"><div className="interview-bar-fill" style={{ width: `${val}%` }} /></div>
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
            <div className="tags">{safeArr(r.top_skills).map(s => <span key={s} className="tag skill">{s}</span>)}</div>
          </div>
          <div className="card card-sm">
            <p className="section-title">ATS Compatibility Checklist</p>
            <div className="ats-checklist">
              {Object.entries(ATS_CHECKLIST_LABELS).map(([key, label]) => (
                <div key={key} className="checklist-item">
                  <div className={`checklist-dot ${atsBreakdown[key] ? 'pass' : 'fail'}`}>{atsBreakdown[key] ? '✓' : '✗'}</div>
                  <span style={{ color: atsBreakdown[key] ? 'var(--text)' : 'var(--muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Strengths + Portfolio */}
        <div className="results-grid" style={{ marginBottom: 16 }}>
          <div className="card card-sm" style={{ background: 'linear-gradient(135deg,#ecfdf5,white)' }}>
            <p className="section-title">Strengths</p>
            <ul className="check-list">{safeArr(r.strengths).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div className="card card-sm" style={{ background: 'linear-gradient(135deg,#fffbeb,white)' }}>
            <p className="section-title">Portfolio &amp; Projects to Build</p>
            <ul className="bullet-list check-list">{safeArr(gapAnalysis.skill_gaps as unknown).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        </div>

        {/* Locked Section */}
        <div className="locked-section">
          <div className={isUnlocked ? '' : 'locked-content'}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 16 }}>
              <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg,#f5f3ff,white)' }}>
                <p className="section-title" style={{ justifyContent: 'center' }}>Overall ATS Score</p>
                <div className="score-ring-wrap">
                  <div className={`score-ring ${scoreClass(r.ats_score as number ?? 0)}`}>
                    {r.ats_score as number ?? 0}<small>/ 100</small>
                  </div>
                  <p className="score-label">{(r.ats_score as number ?? 0) >= 75 ? 'Strong' : (r.ats_score as number ?? 0) >= 50 ? 'Average' : 'Needs Work'}</p>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '.85rem', padding: '0 8px', lineHeight: 1.5 }}>{r.verdict as string}</p>
              </div>
              <div className="card card-sm" style={{ background: 'linear-gradient(135deg,#fef2f2,white)' }}>
                <p className="section-title">Weaknesses</p>
                <ul className="cross-list check-list">{safeArr(r.weaknesses).map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 16 }}>
              <div className="card card-sm" style={{ background: 'linear-gradient(135deg,#fffbeb,white)' }}>
                <p className="section-title">Quick Fixes</p>
                <ul className="bullet-list check-list">{safeArr(r.quick_fixes).map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div className="card card-sm" style={{ background: 'linear-gradient(135deg,#f5f3ff,white)' }}>
                <p className="section-title">Top Recommendations</p>
                {r.top_recommendation && <div style={{ padding: '10px 12px', background: 'var(--primary-light)', borderRadius: 8, marginBottom: 10, fontSize: '.875rem', fontWeight: 600 }}>{r.top_recommendation as string}</div>}
                <ul className="bullet-list check-list">{safeArr(r.secondary_recommendations).map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            </div>

            <div className="card card-sm" style={{ marginBottom: 16 }}>
              <p className="section-title">Missing Keywords</p>
              <div className="tags">{safeArr(r.missing_keywords).map(s => <span key={s} className="tag missing">{s}</span>)}</div>
            </div>

            {safeArr(r.interview_questions).length > 0 && (
              <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg,#ecfdf5,white)' }}>
                <p className="section-title">Common Interview Questions</p>
                <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {safeArr(r.interview_questions).map((q, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, fontSize: '.875rem' }}>
                      <span style={{ background: 'var(--success)', color: 'white', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {salaryNeg.expected_range && (
              <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg,#fffbeb,white)' }}>
                <p className="section-title">Salary Negotiation</p>
                <div style={{ display: 'inline-block', padding: '8px 18px', background: 'var(--gold-light)', border: '2px solid var(--gold)', borderRadius: 8, fontWeight: 800, color: 'var(--gold)', fontSize: '1.1rem', marginBottom: 14 }}>
                  {salaryNeg.expected_range as string}
                </div>
                <ul className="check-list">{safeArr(salaryNeg.negotiation_tips as unknown).map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}

            {Object.keys(marketDemand).length > 0 && (
              <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg,#f5f3ff,white)' }}>
                <p className="section-title">2025 Market Analysis</p>
                <div className="market-row" style={{ marginBottom: 14 }}>
                  {marketDemand.role_demand && <div className="market-item"><div className="market-item-value">{marketDemand.role_demand as string}</div><div className="market-item-label">Demand</div></div>}
                  {marketDemand.avg_salary_range && <div className="market-item"><div className="market-item-value" style={{ fontSize: '.8rem' }}>{marketDemand.avg_salary_range as string}</div><div className="market-item-label">Avg Salary</div></div>}
                  {marketDemand.market_trend && <div className="market-item"><div className="market-item-value">{marketDemand.market_trend as string}</div><div className="market-item-label">Trend</div></div>}
                </div>
                <div className="tags">{safeArr(marketDemand.hot_industries as unknown).map(s => <span key={s} className="tag skill">{s}</span>)}</div>
              </div>
            )}

            {Object.keys(roleGuide).length > 0 && (
              <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg,#ecfeff,white)' }}>
                <p className="section-title">Role-Specific Guide</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                  {roleGuide.key_responsibilities && <div>
                    <p style={{ fontWeight: 700, fontSize: '.8rem', color: 'var(--accent)', marginBottom: 6 }}>Key Responsibilities</p>
                    <ul className="check-list">{safeArr(roleGuide.key_responsibilities as unknown).map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>}
                  {roleGuide.must_have_skills && <div>
                    <p style={{ fontWeight: 700, fontSize: '.8rem', color: 'var(--primary)', marginBottom: 6 }}>Must-Have Skills</p>
                    <div className="tags">{safeArr(roleGuide.must_have_skills as unknown).map(s => <span key={s} className="tag tech">{s}</span>)}</div>
                  </div>}
                </div>
                {roleGuide.next_steps && <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--accent-light)', borderRadius: 8, fontSize: '.875rem', color: 'var(--accent-dark)' }}><strong>Next Steps: </strong>{roleGuide.next_steps as string}</div>}
              </div>
            )}
          </div>

          {!isUnlocked && (
            <div className="lock-overlay">
              <div className="lock-icon"><Lock size={32} color="var(--gold)" /></div>
              <div className="lock-title">Unlock Full Analysis</div>
              <div className="lock-price">₹49 <span style={{ fontSize: '.55em', fontWeight: 400, color: 'var(--muted)' }}>one-time</span></div>
              <ul style={{ textAlign: 'left', listStyle: 'none', padding: '0 8px', margin: '10px 0 16px', lineHeight: 1.9, fontSize: '.85rem' }}>
                {[
                  { Icon: BarChart,     text: 'Overall ATS Score' },
                  { Icon: Zap,          text: 'Weaknesses & Quick Fixes' },
                  { Icon: Users,        text: 'Interview Questions (role-specific)' },
                  { Icon: IndianRupee,  text: 'Salary Negotiation Tips' },
                  { Icon: TrendingUp,   text: '2025 Market Analysis' },
                  { Icon: ClipboardList,text: 'Role-Specific Career Guide' },
                  { Icon: Download,     text: 'Optimised Resume Download' },
                ].map(({ Icon, text }) => (
                  <li key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--gold)', flexShrink: 0 }}><Icon size={14} /></span> {text}
                  </li>
                ))}
              </ul>
              <button className="btn btn-gold btn-lg" onClick={handleUnlock} disabled={unlockLoading}
                style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {unlockLoading
                  ? 'Opening payment…'
                  : <><Award size={15} /> Unlock for ₹49</>}
              </button>
              <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 8 }}>One-time · Instant · No subscription</p>
              <a href="/pricing" style={{ fontSize: '.75rem', color: 'var(--primary)', marginTop: 4, display: 'block' }}>
                Or upgrade to Pro for unlimited unlocks
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
