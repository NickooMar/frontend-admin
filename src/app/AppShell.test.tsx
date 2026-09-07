import {render, screen} from '@testing-library/react'
import {MemoryRouter, Route, Routes} from 'react-router-dom'
import {beforeEach, describe, expect, it} from 'vitest'
import {useAuthStore} from '@/auth/authStore'
import DashboardScreen from '@/screens/DashboardScreen'
import type {AdminUser} from '@/types/auth'
import AppShell from './AppShell'

const admin: AdminUser = {
  _id: 'a1',
  email: 'ada@example.com',
  name: 'Ada',
  surname: 'Lovelace',
  role: 'superadmin',
  active: true,
  lastLoginAt: '2026-09-05T14:32:00.000Z',
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardScreen />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppShell + DashboardScreen', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useAuthStore.getState().clearSession()
    useAuthStore.getState().setSession({admin, token: 'access', refreshToken: 'refresh'})
  })

  it('renders the signed-in admin and the roadmap modules as disabled entries', () => {
    renderShell()

    expect(screen.getByRole('heading', {level: 1, name: 'Dashboard'})).toBeInTheDocument()
    expect(screen.getByText('Hola, Ada.')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Cuenta'})).toHaveTextContent('Ada Lovelace')

    // Every roadmap module shows up in the nav and as a card, none of them navigable yet.
    for (const label of ['Marcas', 'Kioscos']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    expect(screen.queryByRole('link', {name: /Marcas/})).not.toBeInTheDocument()
    expect(screen.getAllByText('Próximamente')).toHaveLength(3)
    expect(screen.getAllByText('Pronto')).toHaveLength(3)
  })

  it('shows the session card built from the data the app already has', () => {
    renderShell()

    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('superadmin')).toBeInTheDocument()
    expect(screen.getByText('Último ingreso').parentElement).toHaveTextContent(/2026/)
  })

  it('exposes a theme switcher', () => {
    renderShell()

    expect(screen.getByRole('button', {name: 'Tema'})).toBeInTheDocument()
  })
})
