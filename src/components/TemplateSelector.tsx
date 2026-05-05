import { useEffect, useState } from 'react'
import { Download } from './Icons'

interface Tpl {
  id: string; name: string; category: string
  primary: string; headerBg: string; headerText: string
  layout: 'single' | 'sidebar'; sidebarBg?: string
}

const CAT_LABEL: Record<string, string> = {
  ats: 'ATS-Friendly', standard: 'Standard', basic: 'Basic', modern: 'Modern',
}
const CAT_COLOR: Record<string, string> = {
  ats: '#059669', standard: '#2563eb', basic: '#6b7280', modern: '#7c3aed',
}

const TEMPLATES: Tpl[] = [
  // ATS-Friendly (10)
  { id: 'ats-classic',  name: 'ATS Classic',   category: 'ats',      layout: 'single',  primary: '#111827', headerBg: '#111827', headerText: '#ffffff' },
  { id: 'ats-minimal',  name: 'ATS Minimal',   category: 'ats',      layout: 'single',  primary: '#374151', headerBg: '#f9fafb', headerText: '#111827' },
  { id: 'ats-navy',     name: 'ATS Navy',      category: 'ats',      layout: 'single',  primary: '#1e3a5f', headerBg: '#1e3a5f', headerText: '#ffffff' },
  { id: 'ats-clean',    name: 'ATS Clean',     category: 'ats',      layout: 'single',  primary: '#1e40af', headerBg: '#ffffff',  headerText: '#111827' },
  { id: 'ats-modern',   name: 'ATS Modern',    category: 'ats',      layout: 'single',  primary: '#7c3aed', headerBg: '#ffffff',  headerText: '#111827' },
  { id: 'ats-sharp',    name: 'ATS Sharp',     category: 'ats',      layout: 'single',  primary: '#0f172a', headerBg: '#0f172a', headerText: '#f1f5f9' },
  { id: 'ats-slate',    name: 'ATS Slate',     category: 'ats',      layout: 'single',  primary: '#475569', headerBg: '#334155', headerText: '#f8fafc' },
  { id: 'ats-teal',     name: 'ATS Teal',      category: 'ats',      layout: 'single',  primary: '#0f766e', headerBg: '#0f766e', headerText: '#ffffff' },
  { id: 'ats-stone',    name: 'ATS Stone',     category: 'ats',      layout: 'single',  primary: '#44403c', headerBg: '#292524', headerText: '#fafaf9' },
  { id: 'ats-ink',      name: 'ATS Ink',       category: 'ats',      layout: 'single',  primary: '#312e81', headerBg: '#ffffff',  headerText: '#111827' },
  // Standard (10)
  { id: 'std-violet',   name: 'Violet Pro',    category: 'standard', layout: 'sidebar', primary: '#7c3aed', headerBg: '#7c3aed', headerText: '#ffffff', sidebarBg: '#7c3aed' },
  { id: 'std-navy',     name: 'Navy Corp',     category: 'standard', layout: 'sidebar', primary: '#1e3a5f', headerBg: '#1e3a5f', headerText: '#ffffff', sidebarBg: '#1e3a5f' },
  { id: 'std-forest',   name: 'Forest',        category: 'standard', layout: 'sidebar', primary: '#065f46', headerBg: '#065f46', headerText: '#ffffff', sidebarBg: '#065f46' },
  { id: 'std-teal',     name: 'Teal Exec',     category: 'standard', layout: 'sidebar', primary: '#0f766e', headerBg: '#0f766e', headerText: '#ffffff', sidebarBg: '#0f766e' },
  { id: 'std-charcoal', name: 'Charcoal',      category: 'standard', layout: 'sidebar', primary: '#1f2937', headerBg: '#1f2937', headerText: '#ffffff', sidebarBg: '#1f2937' },
  { id: 'std-burgundy', name: 'Burgundy',      category: 'standard', layout: 'sidebar', primary: '#7f1d1d', headerBg: '#7f1d1d', headerText: '#ffffff', sidebarBg: '#7f1d1d' },
  { id: 'std-cobalt',   name: 'Cobalt',        category: 'standard', layout: 'sidebar', primary: '#1d4ed8', headerBg: '#1d4ed8', headerText: '#ffffff', sidebarBg: '#1d4ed8' },
  { id: 'std-gold',     name: 'Gold Exec',     category: 'standard', layout: 'single',  primary: '#92400e', headerBg: '#78350f', headerText: '#fef3c7' },
  { id: 'std-slate',    name: 'Slate Pro',     category: 'standard', layout: 'single',  primary: '#334155', headerBg: '#1e293b', headerText: '#f8fafc' },
  { id: 'std-indigo',   name: 'Indigo',        category: 'standard', layout: 'single',  primary: '#4338ca', headerBg: '#3730a3', headerText: '#eef2ff' },
  // Basic (5)
  { id: 'basic-clean',    name: 'Clean',       category: 'basic',    layout: 'single',  primary: '#374151', headerBg: '#ffffff',  headerText: '#111827' },
  { id: 'basic-simple',   name: 'Simple',      category: 'basic',    layout: 'single',  primary: '#111827', headerBg: '#f9fafb', headerText: '#111827' },
  { id: 'basic-compact',  name: 'Compact',     category: 'basic',    layout: 'single',  primary: '#1f2937', headerBg: '#ffffff',  headerText: '#111827' },
  { id: 'basic-academic', name: 'Academic',    category: 'basic',    layout: 'single',  primary: '#1e3a5f', headerBg: '#ffffff',  headerText: '#111827' },
  { id: 'basic-entry',    name: 'Entry Level', category: 'basic',    layout: 'single',  primary: '#374151', headerBg: '#f3f4f6', headerText: '#111827' },
  // Modern (10)
  { id: 'mod-violet',   name: 'Mod Violet',    category: 'modern',   layout: 'single',  primary: '#7c3aed', headerBg: '#7c3aed', headerText: '#ffffff' },
  { id: 'mod-navy',     name: 'Mod Navy',      category: 'modern',   layout: 'single',  primary: '#1e3a5f', headerBg: '#1e3a5f', headerText: '#ffffff' },
  { id: 'mod-teal',     name: 'Mod Teal',      category: 'modern',   layout: 'single',  primary: '#0f766e', headerBg: '#134e4a', headerText: '#ffffff' },
  { id: 'mod-slate',    name: 'Mod Slate',     category: 'modern',   layout: 'sidebar', primary: '#334155', headerBg: '#0f172a', headerText: '#e2e8f0', sidebarBg: '#1e293b' },
  { id: 'mod-purple',   name: 'Deep Purple',   category: 'modern',   layout: 'sidebar', primary: '#6d28d9', headerBg: '#4c1d95', headerText: '#ede9fe', sidebarBg: '#4c1d95' },
  { id: 'mod-cyan',     name: 'Cyan Edge',     category: 'modern',   layout: 'single',  primary: '#0891b2', headerBg: '#0e7490', headerText: '#ecfeff' },
  { id: 'mod-emerald',  name: 'Emerald',       category: 'modern',   layout: 'sidebar', primary: '#059669', headerBg: '#065f46', headerText: '#ecfdf5', sidebarBg: '#065f46' },
  { id: 'mod-graphite', name: 'Graphite',      category: 'modern',   layout: 'sidebar', primary: '#374151', headerBg: '#111827', headerText: '#f9fafb', sidebarBg: '#1f2937' },
  { id: 'mod-rose',     name: 'Rose',          category: 'modern',   layout: 'single',  primary: '#be185d', headerBg: '#9d174d', headerText: '#fff1f2' },
  { id: 'mod-amber',    name: 'Amber',         category: 'modern',   layout: 'single',  primary: '#b45309', headerBg: '#92400e', headerText: '#fffbeb' },
]

// ── Dummy resume for template previews ────────────────────────────────────────

const DUMMY = `Alex Johnson
alex.johnson@email.com  |  +91 98765 43210  |  Mumbai, India  |  linkedin.com/in/alexj
PROFESSIONAL SUMMARY
Results-driven Software Engineer with 5+ years building scalable web applications and APIs. Strong expertise in React, Node.js, Python and AWS cloud services.
EXPERIENCE
Senior Software Engineer  —  TechCorp India, Mumbai  |  2021 - Present
- Led microservices architecture migration reducing API latency by 40%
- Mentored team of 4 junior engineers and ran weekly code reviews
- Shipped 3 zero-downtime product features serving 200K+ users
Software Engineer  —  StartupXYZ, Bangalore  |  2019 - 2021
- Built RESTful APIs handling 100K+ daily active users with Node.js
- Implemented CI/CD pipelines cutting deployment time by 60%
- Contributed to open-source library with 2K+ GitHub stars
EDUCATION
B.Tech in Computer Science  —  IIT Mumbai  |  2015 - 2019
GPA 8.7/10  |  Dean's List three consecutive years
SKILLS
Languages: JavaScript, TypeScript, Python, Java, SQL
Frameworks: React, Node.js, FastAPI, Express, Spring Boot
Tools: Git, Docker, Kubernetes, AWS, PostgreSQL, Redis
CERTIFICATIONS
AWS Solutions Architect Associate  —  Amazon Web Services, 2022
Google Professional Cloud Developer  —  Google, 2023`

// ── Resume parser ─────────────────────────────────────────────────────────────

interface Section { title: string; lines: string[] }
interface Parsed { name: string; contact: string[]; sections: Section[] }

const SECTION_RE = /^(CONTACT|PROFILE|SUMMARY|OBJECTIVE|PROFESSIONAL|EXPERIENCE|WORK|EMPLOYMENT|EDUCATION|SKILL|TECHNICAL|CERTIF|PROJECT|AWARD|ACHIEVEMENT|LANGUAGE|REFERENCE|VOLUNTEER|INTEREST|ACTIVITY|PUBLICATION|RESEARCH|HONOR)/i

function isHeading(line: string): boolean {
  const t = line.trim()
  if (!t || t.length > 60) return false
  if (t === t.toUpperCase() && t.length >= 3 && /[A-Z]/.test(t)) return true
  if (SECTION_RE.test(t.replace(/[:\-_|]/g, '').trim())) return true
  return false
}

function parseResume(text: string): Parsed {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  if (!lines.length) return { name: '', contact: [], sections: [] }

  const name = lines[0]
  let bodyStart = lines.length
  for (let i = 1; i < Math.min(lines.length, 8); i++) {
    if (isHeading(lines[i])) { bodyStart = i; break }
  }

  const contactRaw = lines.slice(1, bodyStart)
  const contact = contactRaw.filter(l =>
    l.includes('@') || l.includes('+') || l.includes('|') ||
    /linkedin|github|http/i.test(l) || /^\d/.test(l)
  )
  const finalContact = contact.length ? contact : contactRaw.slice(0, 2)

  const sections: Section[] = []
  let cur: Section | null = null
  for (let i = bodyStart; i < lines.length; i++) {
    if (isHeading(lines[i])) {
      if (cur) sections.push(cur)
      cur = { title: lines[i], lines: [] }
    } else if (cur) {
      cur.lines.push(lines[i])
    }
  }
  if (cur) sections.push(cur)

  return { name, contact: finalContact, sections }
}

// ── HTML renderer ─────────────────────────────────────────────────────────────

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function lineHtml(line: string, textColor: string): string {
  const isBullet = /^[-•*]\s/.test(line.trim())
  const e = esc(line)
  if (isBullet) {
    return `<div style="display:flex;gap:7px;margin:2px 0 2px 10px;font-size:10pt;line-height:1.55;color:${textColor}">
      <span style="flex-shrink:0">•</span><span>${esc(line.trim().replace(/^[-•*]\s/, ''))}</span></div>`
  }
  return `<div style="margin:2px 0;font-size:10pt;line-height:1.55;color:${textColor}">${e}</div>`
}

function sectionBlock(s: Section, tpl: Tpl, sidebar = false): string {
  const hc = sidebar ? tpl.headerText : tpl.primary
  const tc = sidebar ? 'rgba(255,255,255,0.9)' : '#374151'
  const bc = sidebar ? 'rgba(255,255,255,0.3)' : tpl.primary
  return `<div style="margin-bottom:14px">
    <div style="font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${hc};border-bottom:1.5px solid ${bc};padding-bottom:3px;margin-bottom:6px">${esc(s.title)}</div>
    ${s.lines.map(l => lineHtml(l, tc)).join('')}
  </div>`
}

function buildSingleHtml(parsed: Parsed, tpl: Tpl): string {
  const colorHeader = tpl.headerBg !== '#ffffff'
  const hdrStyle = colorHeader
    ? `background:${tpl.headerBg};padding:22px 30px;`
    : `border-bottom:3px solid ${tpl.primary};padding:18px 30px 14px;`
  const namec = colorHeader ? tpl.headerText : tpl.primary
  const conc = colorHeader ? 'rgba(255,255,255,0.82)' : '#6b7280'
  return `<div style="font-family:Arial,Helvetica,sans-serif;width:794px;background:#fff;min-height:1120px">
    <div style="${hdrStyle}">
      <div style="font-size:21pt;font-weight:800;margin-bottom:4px;color:${namec}">${esc(parsed.name)}</div>
      <div style="font-size:9pt;color:${conc};line-height:1.6">${parsed.contact.map(esc).join(' &nbsp;|&nbsp; ')}</div>
    </div>
    <div style="padding:18px 30px">${parsed.sections.map(s => sectionBlock(s, tpl)).join('')}</div>
  </div>`
}

function buildSidebarHtml(parsed: Parsed, tpl: Tpl): string {
  const sb = tpl.sidebarBg || tpl.primary
  const skillIdx = parsed.sections.findIndex(s => /skill/i.test(s.title))
  const sidebarSections = skillIdx >= 0 ? [parsed.sections[skillIdx]] : []
  const mainSections = parsed.sections.filter((_, i) => i !== skillIdx)

  const sidebar = `
    <div style="font-size:16pt;font-weight:800;color:${tpl.headerText};margin-bottom:6px;line-height:1.2">${esc(parsed.name)}</div>
    <div style="font-size:8pt;color:rgba(255,255,255,0.8);margin-bottom:16px;line-height:1.7">${parsed.contact.map(esc).join('<br/>')}</div>
    ${sidebarSections.map(s => sectionBlock(s, tpl, true)).join('')}`

  return `<div style="font-family:Arial,Helvetica,sans-serif;width:794px;display:flex;min-height:1120px;background:#fff">
    <div style="width:210px;min-height:1120px;background:${sb};padding:22px 14px;flex-shrink:0;box-sizing:border-box">${sidebar}</div>
    <div style="flex:1;padding:22px 20px;background:#fff">${mainSections.map(s => sectionBlock(s, tpl)).join('')}</div>
  </div>`
}

function buildResumeHtml(text: string, tpl: Tpl): string {
  const parsed = parseResume(text)
  return tpl.layout === 'sidebar' ? buildSidebarHtml(parsed, tpl) : buildSingleHtml(parsed, tpl)
}

// Pre-compute all thumbnail HTMLs once at module load (avoids re-building on every render)
const THUMB_HTMLS: Record<string, string> = Object.fromEntries(
  TEMPLATES.map(tpl => [tpl.id, buildResumeHtml(DUMMY, tpl)])
)

// ── Thumbnail ─────────────────────────────────────────────────────────────────

const THUMB_SCALE = 108 / 794

function Thumb({ tpl, selected, onClick }: { tpl: Tpl; selected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      width: 108, height: 152, borderRadius: 8, overflow: 'hidden',
      border: selected ? '2.5px solid var(--primary)' : '2px solid var(--border)',
      cursor: 'pointer', position: 'relative', flexShrink: 0,
      boxShadow: selected ? '0 0 0 3px rgba(124,58,237,0.22)' : 'var(--shadow-sm)',
      transition: 'border .15s, box-shadow .15s',
    }}>
      {selected && (
        <div style={{
          position: 'absolute', top: 4, right: 4, width: 16, height: 16,
          background: 'var(--primary)', borderRadius: '50%', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>
        </div>
      )}
      <div
        style={{ width: 794, transformOrigin: 'top left', transform: `scale(${THUMB_SCALE})`, pointerEvents: 'none' }}
        dangerouslySetInnerHTML={{ __html: THUMB_HTMLS[tpl.id] }}
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { scanId: string; targetRole: string; isPro: boolean }

export default function TemplateSelector({ scanId, targetRole, isPro }: Props) {
  const [selectedId, setSelectedId] = useState('ats-classic')
  const [filter, setFilter] = useState('all')
  const [dlLoading, setDlLoading] = useState<'pdf' | 'docx' | null>(null)
  const [dlError, setDlError] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  const selected = TEMPLATES.find(t => t.id === selectedId) ?? TEMPLATES[0]
  const visible = filter === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.category === filter)

  const getToken = () => {
    try { const s = localStorage.getItem('atsbrain_user'); return s ? JSON.parse(s).token : null } catch { return null }
  }

  useEffect(() => {
    if (!isPro) {
      setPreviewText('')
      return
    }

    let cancelled = false
    setPreviewLoading(true)
    setDlError('')
    fetch(`/api/analyze/${scanId}/optimized`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(async res => {
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e.detail || 'Could not build resume preview')
        }
        return res.json() as Promise<{ text: string }>
      })
      .then(data => {
        if (!cancelled) setPreviewText(data.text || '')
      })
      .catch(e => {
        if (!cancelled) setDlError(e instanceof Error ? e.message : 'Could not build resume preview')
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => { cancelled = true }
  }, [scanId, isPro])

  const downloadFile = async (type: 'pdf' | 'docx') => {
    if (!isPro) {
      window.location.href = '/pricing'
      return
    }
    setDlLoading(type); setDlError('')
    try {
      const res = await fetch(`/api/analyze/${scanId}/download/${type}?template_id=${selected.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.detail || 'Download failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${targetRole.replace(/\s+/g, '_')}_${selected.id}.${type}`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setDlError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDlLoading(null)
    }
  }

  const previewHtml = buildResumeHtml(previewText || DUMMY, selected)

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <p className="section-title" style={{ marginBottom: 0 }}>Choose Resume Template</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', 'ats', 'standard', 'basic', 'modern'] as const).map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              padding: '3px 11px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${filter === cat ? 'var(--primary)' : 'var(--border)'}`,
              background: filter === cat ? 'var(--primary-light)' : 'transparent',
              color: filter === cat ? 'var(--primary)' : 'var(--muted)',
            }}>
              {cat === 'all' ? `All (${TEMPLATES.length})` : CAT_LABEL[cat]}
            </button>
          ))}
        </div>
      </div>

      {dlError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{dlError}</div>}
      {!isPro && (
        <div className="alert" style={{ marginBottom: 12, background: 'var(--gold-light)', color: 'var(--gold)', border: '1px solid rgba(245,158,11,.35)' }}>
          Preview the designs below. Downloading the optimized resume as PDF or DOCX requires Pro.
        </div>
      )}

      <div className="template-grid">
        {visible.map(tpl => (
          <div key={tpl.id} className="template-item">
            <Thumb tpl={tpl} selected={selectedId === tpl.id} onClick={() => setSelectedId(tpl.id)} />
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: selectedId === tpl.id ? 'var(--primary)' : 'var(--text)', textAlign: 'center', maxWidth: 108, marginTop: 4 }}>
              {tpl.name}
            </div>
            <span style={{ fontSize: '.63rem', fontWeight: 700, color: CAT_COLOR[tpl.category], background: `${CAT_COLOR[tpl.category]}1a`, padding: '1px 6px', borderRadius: 10 }}>
              {CAT_LABEL[tpl.category]}
            </span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 2 }}>Preview: {selected.name}</p>
            <p style={{ color: 'var(--muted)', fontSize: '.75rem' }}>
              {previewLoading
                ? 'Building your ATS-optimized resume preview…'
                : isPro
                  ? 'This preview uses the optimized resume content that will be downloaded.'
                  : 'Sample content is shown until Pro download is enabled.'}
            </p>
          </div>
          {!isPro && <a href="/pricing" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>Upgrade to Pro</a>}
        </div>
        <div className="resume-preview-frame">
          {previewLoading ? (
            <div className="loader-wrap" style={{ minHeight: 260 }}><div className="loader" /></div>
          ) : (
            <iframe
              title={`${selected.name} resume preview`}
              className="resume-preview-iframe"
              srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#e5e7eb;padding:18px;display:flex;justify-content:center}*{box-sizing:border-box}</style></head><body>${previewHtml}</body></html>`}
            />
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 6, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <p style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 2 }}>Selected: {selected.name}</p>
          <p style={{ color: 'var(--muted)', fontSize: '.75rem' }}>
            <span style={{ color: CAT_COLOR[selected.category], fontWeight: 700 }}>{CAT_LABEL[selected.category]}</span>
            &nbsp;·&nbsp;{selected.layout === 'sidebar' ? 'Sidebar layout' : 'Single column'}
          </p>
        </div>
        <button
          className="btn btn-accent btn-sm"
          onClick={() => downloadFile('pdf')}
          disabled={dlLoading !== null}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Download size={13} /> {dlLoading === 'pdf' ? 'Generating PDF…' : isPro ? 'Download PDF' : 'Upgrade for PDF'}
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => downloadFile('docx')}
          disabled={dlLoading !== null}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Download size={13} /> {dlLoading === 'docx' ? 'Generating DOCX…' : isPro ? 'Download DOCX' : 'Upgrade for DOCX'}
        </button>
      </div>
    </div>
  )
}
