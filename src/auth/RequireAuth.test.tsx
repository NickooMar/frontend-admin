import {render, screen} from '@testing-library/react'
import {MemoryRouter, Route, Routes} from 'react-router-dom'
import {beforeEach, describe, expect, it} from 'vitest'
import type {AdminUser} from '@/types/auth'
import {useAuthStore} from './authStore'
import {RedirectIfAuthenticated, RequireAuth} from './RequireAuth'

const admin: AdminUser = {_id: 'a1', email: 'ada@example.com', name: 'Ada', surname: 'Lovelace', role: 'superadmin', active: true}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAuthenticated>
              <p>login screen</p>
            </RedirectIfAuthenticated>
          }
        />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<p>protected dashboard</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('route guards', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useAuthStore.getState().clearSession()
  })

  it('sends an anonymous visitor from a protected route to /login', () => {
    renderAt('/')

    expect(screen.getByText('login screen')).toBeInTheDocument()
    expect(screen.queryByText('protected dashboard')).not.toBeInTheDocument()
  })

  it('renders the protected route for an authenticated admin', () => {
    useAuthStore.getState().setSession({admin, token: 'access', refreshToken: 'refresh'})

    renderAt('/')

    expect(screen.getByText('protected dashboard')).toBeInTheDocument()
  })

  it('keeps an authenticated admin away from /login', () => {
    useAuthStore.getState().setSession({admin, token: 'access', refreshToken: 'refresh'})

    renderAt('/login')

    expect(screen.getByText('protected dashboard')).toBeInTheDocument()
  })

  it('shows a loader, not the login screen, while a persisted session is being checked', () => {
    useAuthStore.setState({status: 'checking', token: 'persisted', refreshToken: 'persisted'})

    renderAt('/')

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('login screen')).not.toBeInTheDocument()
  })
})
