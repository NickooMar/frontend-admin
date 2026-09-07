import {create} from 'zustand'
import type {AdminSessionPayload, AdminTokens, AdminUser, AuthStatus} from '@/types/auth'
import {tokenStorage} from './tokenStorage'

export interface AuthState {
  status: AuthStatus
  admin: AdminUser | null
  token: string | null
  refreshToken: string | null
  /** Login / refresh / restore succeeded: persist the tokens and mark the session authenticated. */
  setSession: (session: AdminSessionPayload) => void
  /** Tokens rotated by a refresh; the admin stays as is. */
  setTokens: (tokens: AdminTokens) => void
  /** Logout, expired refresh token, or a 401 the server will not lift: wipe everything. */
  clearSession: () => void
  setStatus: (status: AuthStatus) => void
}

const persisted = tokenStorage.read()

/**
 * Same startup rule as frontend-diagnostica's `authRuntime` store: a persisted
 * token is not trusted until `/me` confirms it (`checking`), so protected
 * routes neither flash the login screen nor render for a revoked admin.
 */
const initialStatus: AuthStatus = persisted ? 'checking' : 'anonymous'

export const useAuthStore = create<AuthState>()((set) => ({
  status: initialStatus,
  admin: null,
  token: persisted?.token ?? null,
  refreshToken: persisted?.refreshToken ?? null,

  setSession: ({admin, token, refreshToken}) => {
    tokenStorage.write({token, refreshToken})
    set({status: 'authenticated', admin, token, refreshToken})
  },

  setTokens: ({token, refreshToken}) => {
    tokenStorage.write({token, refreshToken})
    set({token, refreshToken})
  },

  clearSession: () => {
    tokenStorage.clear()
    set({status: 'anonymous', admin: null, token: null, refreshToken: null})
  },

  setStatus: (status) => set({status}),
}))
