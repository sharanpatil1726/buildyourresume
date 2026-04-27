import { CSSProperties } from 'react'

interface P { size?: number; color?: string; style?: CSSProperties; className?: string }
const svg = (paths: string, size = 16, p: P = {}) => (
  <svg width={p.size ?? size} height={p.size ?? size} viewBox="0 0 24 24"
    fill="none" stroke={p.color ?? 'currentColor'} strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    style={p.style} className={p.className}>
    <g dangerouslySetInnerHTML={{ __html: paths }} />
  </svg>
)

export const MapPin      = (p: P) => svg('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>', 16, p)
export const IndianRupee = (p: P) => svg('<path d="M6 3h12M6 8h12M15 21 6 8"/><path d="M6 13h3a4 4 0 000-8"/>', 16, p)
export const Bookmark    = (p: P) => svg('<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>', 16, p)
export const BookmarkFill= (p: P) => <svg width={p.size??16} height={p.size??16} viewBox="0 0 24 24" fill={p.color??"currentColor"} style={p.style}><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
export const Star        = (p: P) => svg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>', 16, p)
export const StarFill    = (p: P) => <svg width={p.size??16} height={p.size??16} viewBox="0 0 24 24" fill={p.color??"currentColor"} style={p.style}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
export const Search      = (p: P) => svg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>', 16, p)
export const FileText    = (p: P) => svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>', 16, p)
export const Briefcase   = (p: P) => svg('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>', 16, p)
export const BarChart    = (p: P) => svg('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>', 16, p)
export const Lock        = (p: P) => svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>', 16, p)
export const Unlock      = (p: P) => svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/>', 16, p)
export const Check       = (p: P) => svg('<polyline points="20 6 9 17 4 12"/>', 16, p)
export const CheckCircle = (p: P) => svg('<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>', 16, p)
export const X           = (p: P) => svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', 16, p)
export const Send        = (p: P) => svg('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>', 16, p)
export const Users       = (p: P) => svg('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>', 16, p)
export const Award       = (p: P) => svg('<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>', 16, p)
export const Zap         = (p: P) => svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>', 16, p)
export const Mail        = (p: P) => svg('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>', 16, p)
export const Download    = (p: P) => svg('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>', 16, p)
export const ExternalLink= (p: P) => svg('<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>', 16, p)
export const RefreshCw   = (p: P) => svg('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>', 16, p)
export const ShieldCheck = (p: P) => svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>', 16, p)
export const RotateCcw   = (p: P) => svg('<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>', 16, p)
export const CreditCard  = (p: P) => svg('<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>', 16, p)
export const Smartphone  = (p: P) => svg('<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>', 16, p)
export const Building    = (p: P) => svg('<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>', 16, p)
export const Wallet      = (p: P) => svg('<path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>', 16, p)
export const Target      = (p: P) => svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>', 16, p)
export const ClipboardList=(p: P) => svg('<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/>', 16, p)
export const TrendingUp  = (p: P) => svg('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>', 16, p)
export const Clock       = (p: P) => svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', 16, p)
export const ArrowRight  = (p: P) => svg('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>', 16, p)
export const Plus        = (p: P) => svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 16, p)
export const QrCode      = (p: P) => svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><line x1="14" y1="20" x2="20" y2="20"/><line x1="20" y1="14" x2="20" y2="17"/><rect x="5" y="5" width="3" height="3"/><rect x="16" y="5" width="3" height="3"/><rect x="5" y="16" width="3" height="3"/>', 16, p)
export const ChevronDown = (p: P) => svg('<polyline points="6 9 12 15 18 9"/>', 16, p)
export const LogOut      = (p: P) => svg('<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>', 16, p)
