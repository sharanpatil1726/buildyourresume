import { useState, useEffect } from 'react'
import { Download } from './Icons'

declare global {
  interface Window {
    html2pdf: () => HtmlToPdfBuilder
  }
}
type HtmlToPdfBuilder = {
  set(o: Record<string, unknown>): HtmlToPdfBuilder
  from(el: HTMLElement): HtmlToPdfBuilder
  save(): Promise<void>
}

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

// ── HTML renderer for PDF ─────────────────────────────────────────────────────

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

// ── Thumbnail ─────────────────────────────────────────────────────────────────

function Thumb({ tpl, selected, onClick }: { tpl: Tpl; selected: boolean; onClick: () => void }) {
  const sb = tpl.sidebarBg || tpl.primary
  const colorHdr = tpl.headerBg !== '#ffffff'

  return (
    <div onClick={onClick} style={{
      width: 108, minHeight: 140, borderRadius: 8, overflow: 'hidden',
      border: selected ? '2.5px solid var(--primary)' : '2px solid var(--border)',
      cursor: 'pointer', background: '#fff', flexShrink: 0, position: 'relative',
      boxShadow: selected ? '0 0 0 3px rgba(124,58,237,0.22)' : 'var(--shadow-sm)',
      transition: 'all .15s',
    }}>
      {selected && (
        <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>
        </div>
      )}

      {tpl.layout === 'sidebar' ? (
        <div style={{ display: 'flex', minHeight: 140 }}>
          <div style={{ width: 30, minHeight: 140, background: sb, padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.75)', borderRadius: 2, width: '80%' }} />
            <div style={{ height: 3, background: 'rgba(255,255,255,0.5)', borderRadius: 2, width: '65%' }} />
            {[50, 70, 45, 60, 55, 50, 40].map((w, i) => (
              <div key={i} style={{ height: 2, background: 'rgba(255,255,255,0.32)', borderRadius: 2, width: `${w}%`, marginTop: i === 2 ? 3 : 0 }} />
            ))}
          </div>
          <div style={{ flex: 1, padding: '8px 5px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ height: 3, background: tpl.primary, borderRadius: 2, width: '88%', marginBottom: 2, opacity: 0.75 }} />
            {[80, 65, 85, 50, 70, 60, 85, 50, 75, 45].map((w, i) => (
              <div key={i} style={{ height: 2, background: i % 5 === 0 ? tpl.primary : '#e5e7eb', borderRadius: 2, width: `${w}%`, opacity: i % 5 === 0 ? 0.8 : 1, marginTop: i % 5 === 0 ? 3 : 0 }} />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div style={{ background: tpl.headerBg, padding: '8px 7px', borderBottom: colorHdr ? 'none' : `2px solid ${tpl.primary}` }}>
            <div style={{ height: 5, background: colorHdr ? tpl.headerText : tpl.primary, borderRadius: 2, opacity: 0.9, width: '72%', marginBottom: 3 }} />
            <div style={{ height: 2, background: colorHdr ? tpl.headerText : '#9ca3af', borderRadius: 2, opacity: 0.55, width: '52%' }} />
          </div>
          <div style={{ padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[38, 80, 65, 85, 55, 33, 75, 60, 88, 50, 70, 42].map((w, i) => (
              <div key={i} style={{
                height: i % 4 === 0 ? 3 : 2,
                background: i % 4 === 0 ? tpl.primary : '#e5e7eb',
                borderRadius: 2, width: `${w}%`,
                opacity: i % 4 === 0 ? 0.8 : 1,
                marginTop: i % 4 === 0 ? 3 : 0,
              }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { scanId: string; targetRole: string; isPro: boolean }

export default function TemplateSelector({ scanId, targetRole, isPro }: Props) {
  const [selectedId, setSelectedId] = useState('ats-classic')
  const [filter, setFilter] = useState('all')
  const [resumeText, setResumeText] = useState<string | null>(null)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [dlLoading, setDlLoading] = useState<'pdf' | 'docx' | null>(null)
  const [dlError, setDlError] = useState('')

  const selected = TEMPLATES.find(t => t.id === selectedId) ?? TEMPLATES[0]
  const visible = filter === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.category === filter)

  useEffect(() => {
    if (!isPro) return
    setFetchLoading(true)
    const raw = localStorage.getItem('atsbrain_user')
    const token = raw ? (() => { try { return JSON.parse(raw).token } catch { return null } })() : null
    fetch(`/api/analyze/${scanId}/optimized`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Could not load resume')))
      .then(d => setResumeText(d.text))
      .catch(e => setFetchError(e.message))
      .finally(() => setFetchLoading(false))
  }, [scanId, isPro])

  const getToken = () => {
    try { const s = localStorage.getItem('atsbrain_user'); return s ? JSON.parse(s).token : null } catch { return null }
  }

  const downloadPdf = async () => {
    if (!resumeText) return
    if (!window.html2pdf) { setDlError('PDF generator not loaded. Please refresh.'); return }
    setDlLoading('pdf'); setDlError('')
    const el = document.createElement('div')
    try {
      const html = buildResumeHtml(resumeText, selected)
      el.style.cssText = 'position:absolute;left:-9999px;top:0;width:794px;background:#ffffff'
      el.innerHTML = html
      document.body.appendChild(el)
      // wait for browser to paint the element before html2canvas captures it
      await new Promise(resolve => setTimeout(resolve, 200))
      await window.html2pdf()
        .set({
          margin: 0,
          filename: `${targetRole.replace(/\s+/g, '_')}_${selected.id}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2, useCORS: true, letterRendering: true,
            scrollX: 0, scrollY: 0, windowWidth: 794,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(el)
        .save()
    } catch {
      setDlError('PDF generation failed. Please try again.')
    } finally {
      if (document.body.contains(el)) document.body.removeChild(el)
      setDlLoading(null)
    }
  }

  const downloadDocx = async () => {
    setDlLoading('docx'); setDlError('')
    try {
      const res = await fetch(`/api/analyze/${scanId}/download/docx?template_id=${selected.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Download failed') }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${targetRole.replace(/\s+/g, '_')}_${selected.id}.docx`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setDlError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDlLoading(null)
    }
  }

  if (!isPro) return (
    <div className="card" style={{ textAlign: 'center', padding: '24px', background: 'linear-gradient(135deg,#fffbeb,white)', marginBottom: 16 }}>
      <p style={{ fontWeight: 700, marginBottom: 8, fontSize: '.95rem' }}>35 Resume Templates</p>
      <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginBottom: 12 }}>
        Pick a template, download instantly as PDF or DOCX — Pro plan only.
      </p>
      <a href="/pricing" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>Upgrade to Pro</a>
    </div>
  )

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

      {fetchLoading && <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginBottom: 12 }}>Loading your optimized resume…</p>}
      {fetchError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{fetchError}</div>}
      {dlError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{dlError}</div>}

      {/* Template grid */}
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

      {/* Download bar */}
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
          onClick={downloadPdf}
          disabled={!resumeText || dlLoading !== null}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Download size={13} /> {dlLoading === 'pdf' ? 'Generating PDF…' : 'Download PDF'}
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={downloadDocx}
          disabled={dlLoading !== null}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Download size={13} /> {dlLoading === 'docx' ? 'Generating DOCX…' : 'Download DOCX'}
        </button>
      </div>
    </div>
  )
}
