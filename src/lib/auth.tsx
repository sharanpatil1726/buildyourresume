import { createContext, useContext, useState, ReactNode } from 'react'

interface User {
  user_id: string
  email: string
  plan: string
  token: string
}

interface AuthCtx {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  loginWithGoogleSession: (token: string, email: string, plan: string, userId: string) => void
  logout: () => void
  refreshPlan: (plan: string) => void
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)

function loadUser(): User | null {
  try {
    const s = localStorage.getItem('atsbrain_user')
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser)

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }))
      throw new Error(err.detail || 'Login failed')
    }
    const data = await res.json()
    const u: User = { user_id: data.user_id, email: data.email, plan: data.plan, token: data.access_token }
    localStorage.setItem('atsbrain_user', JSON.stringify(u))
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('atsbrain_user')
    setUser(null)
  }

  const loginWithGoogleSession = (token: string, email: string, plan: string, userId: string) => {
    const u: User = { user_id: userId, email, plan, token }
    localStorage.setItem('atsbrain_user', JSON.stringify(u))
    setUser(u)
  }

  const refreshPlan = (plan: string) => {
    if (!user) return
    const updated = { ...user, plan }
    localStorage.setItem('atsbrain_user', JSON.stringify(updated))
    setUser(updated)
  }

  return <Ctx.Provider value={{ user, login, loginWithGoogleSession, logout, refreshPlan }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
