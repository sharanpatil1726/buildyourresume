import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const planClass = user?.plan === 'pro' ? 'pro' : user?.plan === 'career' ? 'career' : ''

  return (
    <nav className="navbar">
      <NavLink to="/dashboard" className="navbar-brand">
        Ats<span>Brain</span>
      </NavLink>
      <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>
      <NavLink to="/analyze"   className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Analyze</NavLink>
      <NavLink to="/jobs"      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Jobs</NavLink>
      <NavLink to="/tracker"   className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Tracker</NavLink>
      <div className="navbar-right">
        {user?.plan && (
          <span className={`plan-badge ${planClass}`}>{user.plan}</span>
        )}
        {user?.plan === 'free' && (
          <NavLink to="/pricing" className="btn btn-primary btn-sm">Upgrade</NavLink>
        )}
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}
