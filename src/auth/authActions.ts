import {adminAuthService} from '@/services/adminAuthService'
import type {LoginCredentials} from '@/types/auth'
import {useAuthStore} from './authStore'

/**
 * Auth use-cases, kept outside React so screens, interceptors and tests share
 * one implementation. Each one drives the store; the router reacts to it.
 */

export async function signIn(credentials: LoginCredentials): Promise<void> {
  const session = await adminAuthService.login(credentials)
  useAuthStore.getState().setSession(session)
}

export async function signOut(): Promise<void> {
  const {token, clearSession} = useAuthStore.getState()

  // Best effort: the JWT is stateless, so a failed logout call must never keep
  // the user "logged in" locally.
  if (token) {
    try {
      await adminAuthService.logout()
    } catch {
      // ignored on purpose
    }
  }

  clearSession()
}

/**
 * Startup revalidation of a persisted session against `/me` (the backend
 * re-reads the admin, so a disabled account is caught here). A 401 is handled
 * by the API interceptor, which already cleared the store.
 */
export async function restoreSession(): Promise<void> {
  const {token, refreshToken, setSession, clearSession, setStatus} = useAuthStore.getState()

  if (!token || !refreshToken) {
    clearSession()
    return
  }

  try {
    const admin = await adminAuthService.me()
    // The interceptor may have rotated the tokens while we waited.
    const current = useAuthStore.getState()
    setSession({admin, token: current.token ?? token, refreshToken: current.refreshToken ?? refreshToken})
  } catch {
    // Network / 5xx: keep the tokens (they may still be valid) but do not
    // grant access on a guess — the user lands on login and can retry.
    if (useAuthStore.getState().status === 'checking') setStatus('anonymous')
  }
}
