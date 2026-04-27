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
import ScanResult from './pages/ScanResult'
import AuthCallback from './pages/AuthCallback'

const TECH_WORDS = [
  'Python', 'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes',
  'TypeScript', 'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL',
  'FastAPI', 'Next.js', 'TensorFlow', 'PyTorch', 'Git', 'CI/CD',
  'Google', 'Amazon', 'Meta', 'Netflix', 'Flipkart', 'Swiggy',
  'SQL', 'Microservices', 'LLM', 'RAG', 'MLOps', 'Kafka',
  'Figma', 'Terraform', 'Linux', 'Spark', 'Airflow',
  'TCS', 'Infosys', 'Wipro', 'Razorpay', 'CRED', 'Zomato',
  'Spring Boot', 'Go', 'Rust', 'Flutter', 'Elasticsearch',
  'DevOps', 'Agile', 'Scrum', 'System Design', 'API',
  'Django', 'Vue.js', 'Angular', 'Kotlin', 'Swift',
  'Pandas', 'NumPy', 'Scikit-learn', 'Spark', 'dbt',
]

function TechBg() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {TECH_WORDS.map((word, i) => (
        <span
          key={word}
          style={{
            position: 'absolute',
            top: `${(i * 1733 + 500) % 9200 / 100}%`,
            left: `${(i * 2341 + 200) % 9400 / 100}%`,
            fontSize: `${0.7 + (i % 4) * 0.12}rem`,
            fontWeight: 800,
            letterSpacing: '.02em',
            color: `rgba(124,58,237,${0.05 + (i % 3) * 0.025})`,
            animation: `floatAround ${7 + (i % 6)}s ease-in-out ${(i * 0.35) % 4}s infinite`,
            userSelect: 'none',
          }}
        >
          {word}
        </span>
      ))}
    </div>
  )
}

export default function App() {
  const { user } = useAuth()

  return (
    <>
      {user && <TechBg />}
      {user && <Navbar />}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/scan/:id" element={<ScanResult />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/pricing" element={<Pricing />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  )
}
