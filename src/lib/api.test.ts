import type {AxiosAdapter, InternalAxiosRequestConfig} from 'axios'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {useAuthStore} from '@/auth/authStore'
import type {AdminUser} from '@/types/auth'
import {ADMIN_AUTH_PATH, api, toApiError} from './api'

const admin: AdminUser = {_id: 'a1', email: 'ada@example.com', name: 'Ada', surname: 'Lovelace', role: 'superadmin', active: true}

type Handler = (config: InternalAxiosRequestConfig) => {status: number; data: unknown}

/** Replaces the network with a scripted adapter so the interceptors run against real axios plumbing. */
function useFakeServer(handler: Handler) {
  const calls: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config)
    const {status, data} = handler(config)
    const response = {status, data, statusText: String(status), headers: {}, config}
    if (status >= 400) {
      const error = Object.assign(new Error(`Request failed with status code ${status}`), {
        isAxiosError: true,
        config,
        response,
        toJSON: () => ({}),
      })
      throw error
    }
    return response
  }
  api.defaults.adapter = adapter
  return calls
}

const authHeader = (config: InternalAxiosRequestConfig | undefined) => config?.headers.get('Authorization')

describe('api client', () => {
  const originalAdapter = api.defaults.adapter

  beforeEach(() => {
    sessionStorage.clear()
    useAuthStore.getState().clearSession()
  })

  afterEach(() => {
    api.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('attaches the admin bearer token, except on skipAuth requests', async () => {
    useAuthStore.getState().setSession({admin, token: 'access', refreshToken: 'refresh'})
    const calls = useFakeServer(() => ({status: 200, data: {success: true, data: null}}))

    await api.get('/x')
    await api.get('/y', {skipAuth: true})

    expect(authHeader(calls[0])).toBe('Bearer access')
    expect(authHeader(calls[1])).toBeUndefined()
  })

  it('on 401 TOKEN_EXPIRED it refreshes once and replays the request with the new token', async () => {
    useAuthStore.getState().setSession({admin, token: 'stale', refreshToken: 'refresh'})
    const calls = useFakeServer((config) => {
      if (config.url?.endsWith(`${ADMIN_AUTH_PATH}/refresh`)) {
        expect(JSON.parse(config.data as string)).toEqual({refreshToken: 'refresh'})
        return {status: 200, data: {success: true, data: {admin, token: 'fresh', refreshToken: 'refresh-2'}}}
      }
      if (authHeader(config) === 'Bearer stale') {
        return {status: 401, data: {statusCode: 401, error: 'Unauthorized', message: 'Token expired', code: 'TOKEN_EXPIRED'}}
      }
      return {status: 200, data: {success: true, data: 'ok'}}
    })

    const response = await api.get('/protected')

    expect(response.data.data).toBe('ok')
    expect(calls.map((call) => call.url)).toEqual(['/protected', `${ADMIN_AUTH_PATH}/refresh`, '/protected'])
    expect(authHeader(calls[2])).toBe('Bearer fresh')
    expect(useAuthStore.getState().token).toBe('fresh')
    expect(useAuthStore.getState().refreshToken).toBe('refresh-2')
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('clears the session when the refresh itself is rejected', async () => {
    useAuthStore.getState().setSession({admin, token: 'stale', refreshToken: 'dead'})
    useFakeServer((config) => {
      if (config.url?.endsWith(`${ADMIN_AUTH_PATH}/refresh`)) {
        return {status: 401, data: {statusCode: 401, error: 'Unauthorized', message: 'expired', code: 'REFRESH_TOKEN_EXPIRED'}}
      }
      return {status: 401, data: {statusCode: 401, error: 'Unauthorized', message: 'Token expired', code: 'TOKEN_EXPIRED'}}
    })

    await expect(api.get('/protected')).rejects.toBeDefined()

    expect(useAuthStore.getState().status).toBe('anonymous')
    expect(useAuthStore.getState().token).toBeNull()
    expect(sessionStorage.getItem('adminToken')).toBeNull()
  })

  it('clears the session on any other 401 (disabled admin, brand token, bad signature)', async () => {
    useAuthStore.getState().setSession({admin, token: 'access', refreshToken: 'refresh'})
    const calls = useFakeServer(() => ({status: 401, data: {statusCode: 401, error: 'Unauthorized', message: 'nope'}}))

    await expect(api.get('/protected')).rejects.toBeDefined()

    expect(calls).toHaveLength(1)
    expect(useAuthStore.getState().status).toBe('anonymous')
  })

  it('a 401 on login does not touch the (empty) session and is surfaced to the caller', async () => {
    useFakeServer(() => ({status: 401, data: {statusCode: 401, error: 'Unauthorized', message: 'Invalid', code: 'INVALID_CREDENTIALS'}}))

    const failure = await api.post(`${ADMIN_AUTH_PATH}/login`, {}, {skipAuth: true}).catch((error: unknown) => error)

    expect(toApiError(failure)).toEqual({statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid', isNetworkError: false})
  })

  it('toApiError flags network failures', () => {
    const error = Object.assign(new Error('Network Error'), {isAxiosError: true, config: {}, toJSON: () => ({})})

    expect(toApiError(error)).toEqual({message: 'Network Error', isNetworkError: true})
  })
})
