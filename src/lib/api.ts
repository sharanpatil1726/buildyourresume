const getToken = (): string | null => {
  try {
    const s = localStorage.getItem('atsbrain_user')
    return s ? JSON.parse(s).token : null
  } catch {
    return null
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const opts: RequestInit = { method, headers }

  if (body instanceof FormData) {
    opts.body = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(`/api${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  auth: {
    signup: (email: string, password: string, full_name: string) =>
      req<{ message: string; user_id: string | null }>('POST', '/auth/signup', { email, password, full_name }),
    login: (email: string, password: string) =>
      req<{ access_token: string; user_id: string; email: string; plan: string }>('POST', '/auth/login', { email, password }),
    me: () => req<Record<string, unknown>>('GET', '/auth/me'),
  },

  resume: {
    upload: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return req<{ resume_id: string; raw_text: string; char_count: number }>('POST', '/resume/upload', fd)
    },
    list: () => req<{ id: string; file_name: string; created_at: string; is_primary: boolean }[]>('GET', '/resume/list'),
    delete: (id: string) => req<{ message: string }>('DELETE', `/resume/${id}`),
  },

  analyze: {
    run: (data: { resume_text: string; target_role: string; experience_level: string; resume_id?: string }) =>
      req<{ scan_id: string; is_unlocked: boolean; result: Record<string, unknown> }>('POST', '/analyze/', data),
    history: () => req<{ id: string; target_role: string; ats_score: number; experience_level: string; created_at: string; is_unlocked: boolean }[]>('GET', '/analyze/history'),
    get: (id: string) => req<{ scan_id: string; is_unlocked: boolean; target_role: string; experience_level: string; created_at: string; result: Record<string, unknown> }>('GET', `/analyze/${id}`),
    coverLetter: (data: { resume_text: string; target_role: string; company: string }) =>
      req<{ letter: string }>('POST', '/analyze/cover-letter', data),
    createUnlockOrder: (scanId: string) =>
      req<{ order_id: string; amount: number; currency: string; key_id: string }>('POST', `/analyze/${scanId}/unlock`),
    verifyUnlock: (scanId: string, data: Record<string, string>) =>
      req<{ is_unlocked: boolean; result: Record<string, unknown> }>('POST', `/analyze/${scanId}/unlock-verify`, data),
    getOptimized: (scanId: string) =>
      req<{ text: string }>('GET', `/analyze/${scanId}/optimized`),
  },

  jobs: {
    search: (role?: string, location?: string, page?: number) => {
      const q = new URLSearchParams()
      if (role) q.set('role', role)
      if (location) q.set('location', location)
      if (page && page > 1) q.set('page', String(page))
      return req<{ jobs: Record<string, unknown>[]; total: number; pages: number; from_cache: boolean; role_matched: boolean; seeding: boolean }>('GET', `/jobs/?${q}`)
    },
    refresh: () => req<{ fetched: number; inserted: number; source: string; error?: string }>('POST', '/jobs/refresh'),
    save: (id: string) => req<{ saved: boolean }>('POST', `/jobs/${id}/save`),
    saved: () => req<Record<string, unknown>[]>('GET', '/jobs/saved'),
    apply: (id: string) => req<{ apply_url: string; tracked: boolean }>('POST', `/jobs/${id}/apply`),
  },

  tracker: {
    list: () => req<Record<string, unknown>[]>('GET', '/tracker/'),
    create: (data: Record<string, unknown>) => req<Record<string, unknown>>('POST', '/tracker/', data),
    update: (id: string, data: Record<string, unknown>) => req<Record<string, unknown>>('PATCH', `/tracker/${id}`, data),
    delete: (id: string) => req<{ message: string }>('DELETE', `/tracker/${id}`),
    stats: () => req<Record<string, number>>('GET', '/tracker/stats'),
  },

  payment: {
    createOrder: (plan: string) =>
      req<{ order_id: string; amount: number; currency: string; plan_name: string; key_id: string }>('POST', '/payment/create-order', { plan }),
    verify: (data: Record<string, string>) =>
      req<{ success: boolean; plan: string; expires_at: string }>('POST', '/payment/verify', data),
  },

  feedback: {
    list: () => req<{ user_name: string; user_role: string; message: string; rating: number; created_at: string }[]>('GET', '/feedback/'),
    submit: (data: { user_name: string; user_role: string; message: string; rating: number }) =>
      req<{ success: boolean }>('POST', '/feedback/', data),
  },
}
