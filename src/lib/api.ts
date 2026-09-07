import axios, {type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig} from 'axios'
import {useAuthStore} from '@/auth/authStore'
import {env} from '@/config/env'
import {AUTH_ERROR_CODES, type AdminSessionPayload, type ApiEnvelope, type ApiErrorPayload} from '@/types/auth'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Do not attach the admin token (login, refresh). */
    skipAuth?: boolean
    /** Internal: the request was already replayed after a token refresh. */
    _retried?: boolean
  }
}

export const ADMIN_AUTH_PATH = '/api/v1/admin/auth'
const REFRESH_PATH = `${ADMIN_AUTH_PATH}/refresh`

export const api = axios.create({
  baseURL: env.apiEndpoint,
  timeout: 20_000,
})

// ---- Request: bearer token ------------------------------------------------

api.interceptors.request.use((config) => {
  if (config.skipAuth) return config

  const {token} = useAuthStore.getState()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

// ---- Response: transparent refresh, session teardown on a hard 401 --------

/** Single-flight: concurrent 401s share one refresh call instead of racing each other. */
let refreshInFlight: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const {refreshToken} = useAuthStore.getState()
  if (!refreshToken) throw new Error('No refresh token')

  const response = await api.post<ApiEnvelope<AdminSessionPayload>>(REFRESH_PATH, {refreshToken}, {skipAuth: true})
  const session = response.data.data

  useAuthStore.getState().setSession(session)
  return session.token
}

function isTokenExpired(error: AxiosError<ApiErrorPayload>): boolean {
  return error.response?.status === 401 && error.response.data?.code === AUTH_ERROR_CODES.TOKEN_EXPIRED
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const config = error.config as InternalAxiosRequestConfig | undefined
    const status = error.response?.status

    if (!config || status !== 401) return Promise.reject(error)

    // A 401 from the refresh endpoint itself, or from an unauthenticated call
    // (login), is final: nothing to retry.
    const isRefreshCall = config.url?.endsWith(REFRESH_PATH) ?? false
    if (config.skipAuth || isRefreshCall) {
      if (isRefreshCall) useAuthStore.getState().clearSession()
      return Promise.reject(error)
    }

    if (isTokenExpired(error) && !config._retried && useAuthStore.getState().refreshToken) {
      try {
        refreshInFlight ??= refreshAccessToken().finally(() => {
          refreshInFlight = null
        })
        const token = await refreshInFlight

        config._retried = true
        config.headers.set('Authorization', `Bearer ${token}`)
        return api.request(config)
      } catch {
        useAuthStore.getState().clearSession()
        return Promise.reject(error)
      }
    }

    // Invalid signature, disabled admin, brand token, ... — the session is over.
    useAuthStore.getState().clearSession()
    return Promise.reject(error)
  },
)

// ---- Helpers ----------------------------------------------------------------

export interface NormalizedApiError {
  statusCode?: number
  code?: string
  message: string
  isNetworkError: boolean
}

/** Turns whatever axios rejected with into something the UI can switch on. */
export function toApiError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    if (!error.response) return {message: error.message, isNetworkError: true}
    return {
      statusCode: error.response.status,
      code: error.response.data?.code,
      message: error.response.data?.message ?? error.message,
      isNetworkError: false,
    }
  }
  return {message: error instanceof Error ? error.message : String(error), isNetworkError: false}
}

export const unwrap = <T>(response: AxiosResponse<ApiEnvelope<T>>): T => response.data.data
