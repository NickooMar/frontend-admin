/** Public projection of a global admin, as returned by `/api/v1/admin/auth/*`. Never carries a password hash. */
export interface AdminUser {
  _id: string
  email: string
  name: string
  surname: string
  role: string
  active: boolean
  lastLoginAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface AdminTokens {
  token: string
  refreshToken: string
}

export interface AdminSessionPayload extends AdminTokens {
  admin: AdminUser
}

export interface LoginCredentials {
  email: string
  password: string
}

/** `successReponse` envelope used by backend-diagnostica. */
export interface ApiEnvelope<T> {
  statusCode: number
  success: boolean
  data: T
}

/** Boom error payload serialized by backend-diagnostica's `clientErrorHandler`. */
export interface ApiErrorPayload {
  statusCode: number
  error: string
  message: string
  code?: string
  message_tag?: string
}

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ADMIN_DISABLED: 'ADMIN_DISABLED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
} as const

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous'
