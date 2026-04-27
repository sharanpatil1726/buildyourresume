const SUPABASE_URL = 'https://rroulemkubkrvntqrhuh.supabase.co'

export function signInWithGoogle() {
  const redirectTo = encodeURIComponent(window.location.origin + '/auth/callback')
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`
}
