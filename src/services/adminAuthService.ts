import {ADMIN_AUTH_PATH, api, unwrap} from '@/lib/api'
import type {AdminSessionPayload, AdminUser, ApiEnvelope, LoginCredentials} from '@/types/auth'

/**
 * HTTP client for `backend-diagnostica`'s global admin auth namespace.
 * None of these calls carry a brand — the endpoints resolve admins from the
 * main `diagnostica` database.
 */
export const adminAuthService = {
  async login(credentials: LoginCredentials): Promise<AdminSessionPayload> {
    const response = await api.post<ApiEnvelope<AdminSessionPayload>>(`${ADMIN_AUTH_PATH}/login`, credentials, {skipAuth: true})
    return unwrap(response)
  },

  async me(): Promise<AdminUser> {
    const response = await api.get<ApiEnvelope<{admin: AdminUser}>>(`${ADMIN_AUTH_PATH}/me`)
    return unwrap(response).admin
  },

  async logout(): Promise<void> {
    await api.post(`${ADMIN_AUTH_PATH}/logout`)
  },
}
