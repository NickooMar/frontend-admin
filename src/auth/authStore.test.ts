import {beforeEach, describe, expect, it} from 'vitest'
import type {AdminUser} from '@/types/auth'
import {useAuthStore} from './authStore'
import {tokenStorage} from './tokenStorage'

const admin: AdminUser = {_id: 'a1', email: 'ada@example.com', name: 'Ada', surname: 'Lovelace', role: 'superadmin', active: true}

describe('authStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useAuthStore.getState().clearSession()
  })

  it('setSession authenticates and persists both tokens to sessionStorage', () => {
    useAuthStore.getState().setSession({admin, token: 'access', refreshToken: 'refresh'})

    const state = useAuthStore.getState()
    expect(state.status).toBe('authenticated')
    expect(state.admin).toEqual(admin)
    expect(state.token).toBe('access')
    expect(tokenStorage.read()).toEqual({token: 'access', refreshToken: 'refresh'})
  })

  it('setTokens rotates the tokens without touching the admin', () => {
    useAuthStore.getState().setSession({admin, token: 'access', refreshToken: 'refresh'})

    useAuthStore.getState().setTokens({token: 'access-2', refreshToken: 'refresh-2'})

    expect(useAuthStore.getState().admin).toEqual(admin)
    expect(useAuthStore.getState().token).toBe('access-2')
    expect(sessionStorage.getItem('adminToken')).toBe('access-2')
  })

  it('clearSession wipes memory and storage', () => {
    useAuthStore.getState().setSession({admin, token: 'access', refreshToken: 'refresh'})

    useAuthStore.getState().clearSession()

    expect(useAuthStore.getState()).toMatchObject({status: 'anonymous', admin: null, token: null, refreshToken: null})
    expect(tokenStorage.read()).toBeNull()
  })

  it('tokenStorage only reports a session when both tokens are present', () => {
    sessionStorage.setItem('adminToken', 'access')

    expect(tokenStorage.read()).toBeNull()
  })
})
