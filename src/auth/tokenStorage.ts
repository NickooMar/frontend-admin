import type {AdminTokens} from '@/types/auth'

/**
 * Token persistence. `sessionStorage` on purpose: it survives a page refresh
 * (the requirement) but not closing the tab, the same trade-off
 * frontend-diagnostica makes for its `userToken`. Every access is guarded —
 * storage can throw in private windows and some embedded contexts.
 */
const TOKEN_KEY = 'adminToken'
const REFRESH_TOKEN_KEY = 'adminRefreshToken'

export const tokenStorage = {
  read(): AdminTokens | null {
    try {
      const token = sessionStorage.getItem(TOKEN_KEY)
      const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY)
      if (!token || !refreshToken) return null
      return {token, refreshToken}
    } catch {
      return null
    }
  },

  write({token, refreshToken}: AdminTokens): void {
    try {
      sessionStorage.setItem(TOKEN_KEY, token)
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    } catch {
      // Storage unavailable: the session then lives only in memory for this page load.
    }
  },

  clear(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(REFRESH_TOKEN_KEY)
    } catch {
      // nothing to clear
    }
  },
}
