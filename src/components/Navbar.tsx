import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

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
          Tools <span style={{ fontSize: '.65em', opacity: 0.75, marginTop: 1 }}>▾</span>
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
              📄 Analyze Resume
            </NavLink>
            <NavLink to="/jobs" onClick={() => setOpen(false)} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
              textDecoration: 'none', fontSize: '.875rem', color: isActive ? 'var(--primary)' : 'var(--text)',
              fontWeight: isActive ? 700 : 500, background: isActive ? 'var(--primary-light)' : 'transparent',
            })}>
              💼 Live Jobs
            </NavLink>
            <NavLink to="/tracker" onClick={() => setOpen(false)} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
              textDecoration: 'none', fontSize: '.875rem', color: isActive ? 'var(--primary)' : 'var(--text)',
              fontWeight: isActive ? 700 : 500, background: isActive ? 'var(--primary-light)' : 'transparent',
            })}>
              📊 App Tracker
            </NavLink>
          </div>
        )}
      </div>

      <div className="navbar-right">
        {user?.plan && <span className={`plan-badge ${planClass}`}>{user.plan}</span>}
        {user?.plan === 'free' && (
          <NavLink to="/pricing" className="btn btn-primary btn-sm">Upgrade ⚡</NavLink>
        )}
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}
