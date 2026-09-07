import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {MemoryRouter, Route, Routes} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {useAuthStore} from '@/auth/authStore'
import {adminAuthService} from '@/services/adminAuthService'
import type {AdminUser} from '@/types/auth'
import LoginScreen from './LoginScreen'

vi.mock('@/services/adminAuthService', () => ({
  adminAuthService: {login: vi.fn(), me: vi.fn(), logout: vi.fn()},
}))

const admin: AdminUser = {_id: 'a1', email: 'ada@example.com', name: 'Ada', surname: 'Lovelace', role: 'superadmin', active: true}

const apiError = (status: number, body: Record<string, unknown>) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    config: {},
    response: {status, data: body},
    toJSON: () => ({}),
  })

function renderLogin(initialPath = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/" element={<h1>Admin Dashboard</h1>} />
        <Route path="/brands" element={<h1>Brands</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', {name: 'Ingresar'}))
}

describe('LoginScreen', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useAuthStore.getState().clearSession()
    vi.mocked(adminAuthService.login).mockReset()
  })

  it('logs in against the global admin endpoint, persists the session and enters the dashboard', async () => {
    vi.mocked(adminAuthService.login).mockResolvedValue({admin, token: 'access', refreshToken: 'refresh'})
    renderLogin()

    await fillAndSubmit(' ada@example.com ', 'secret-pass')

    await waitFor(() => expect(screen.getByRole('heading', {name: 'Admin Dashboard'})).toBeInTheDocument())
    expect(adminAuthService.login).toHaveBeenCalledWith({email: 'ada@example.com', password: 'secret-pass'})
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().admin).toEqual(admin)
    expect(sessionStorage.getItem('adminToken')).toBe('access')
  })

  it('shows the invalid-credentials message on a 401 and stays on the form', async () => {
    vi.mocked(adminAuthService.login).mockRejectedValue(apiError(401, {code: 'INVALID_CREDENTIALS', message: 'Invalid email or password'}))
    renderLogin()

    await fillAndSubmit('ada@example.com', 'wrong')

    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña inválidos.')
    expect(useAuthStore.getState().status).toBe('anonymous')
    expect(screen.getByRole('button', {name: 'Ingresar'})).toBeEnabled()
  })

  it('tells a disabled admin why the login was refused', async () => {
    vi.mocked(adminAuthService.login).mockRejectedValue(apiError(401, {code: 'ADMIN_DISABLED', message: 'Admin account is disabled'}))
    renderLogin()

    await fillAndSubmit('off@example.com', 'secret-pass')

    expect(await screen.findByRole('alert')).toHaveTextContent('deshabilitada')
  })

  it('does not call the API with empty fields', async () => {
    renderLogin()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', {name: 'Ingresar'}))

    expect(await screen.findByRole('alert')).toHaveTextContent('Completá el email y la contraseña.')
    expect(adminAuthService.login).not.toHaveBeenCalled()
  })
})
