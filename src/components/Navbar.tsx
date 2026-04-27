import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { FileText, Briefcase, BarChart, ChevronDown, Zap, LogOut } from './Icons'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => { logout(); navigate('/login') }
  const planClass = user?.plan === 'pro' ? 'pro' : ''

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <nav className="navbar">
      <NavLink to="/dashboard" className="navbar-brand">
        Ats<span>Brain</span>
      </NavLink>

      <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        Dashboard
      </NavLink>

      {/* Tools dropdown */}
      <div style={{ position: 'relative' }} ref={dropRef}>
        <button
          className={`nav-link${open ? ' active' : ''}`}
          onClick={() => setOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}
        >
          Tools <ChevronDown size={12} style={{ opacity: 0.7 }} />
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1000,
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.14)',
            minWidth: 180, padding: '6px 0', animation: 'fadeIn .12s ease',
          }}>
            <NavLink to="/analyze" onClick={() => setOpen(false)} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
              textDecoration: 'none', fontSize: '.875rem', color: isActive ? 'var(--primary)' : 'var(--text)',
              fontWeight: isActive ? 700 : 500, background: isActive ? 'var(--primary-light)' : 'transparent',
            })}>
              <FileText size={15} /> Analyze Resume
            </NavLink>
            <NavLink to="/jobs" onClick={() => setOpen(false)} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
              textDecoration: 'none', fontSize: '.875rem', color: isActive ? 'var(--primary)' : 'var(--text)',
              fontWeight: isActive ? 700 : 500, background: isActive ? 'var(--primary-light)' : 'transparent',
            })}>
              <Briefcase size={15} /> Live Jobs
            </NavLink>
            <NavLink to="/tracker" onClick={() => setOpen(false)} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
              textDecoration: 'none', fontSize: '.875rem', color: isActive ? 'var(--primary)' : 'var(--text)',
              fontWeight: isActive ? 700 : 500, background: isActive ? 'var(--primary-light)' : 'transparent',
            })}>
              <BarChart size={15} /> App Tracker
            </NavLink>
          </div>
        )}
      </div>

      <div className="navbar-right">
        {user?.plan && <span className={`plan-badge ${planClass}`}>{user.plan}</span>}
        {user?.plan === 'free' && (
          <NavLink to="/pricing" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Zap size={13} /> Upgrade
          </NavLink>
        )}
        <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <LogOut size={13} /> Logout
        </button>
      </div>
    </nav>
  )
}
