import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import Jobs from './pages/Jobs'
import Tracker from './pages/Tracker'
import Pricing from './pages/Pricing'

export default function App() {
  const { user } = useAuth()

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/pricing" element={<Pricing />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
