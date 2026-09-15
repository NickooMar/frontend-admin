import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {MemoryRouter, Navigate, Route, Routes} from 'react-router-dom'
import {beforeEach, describe, expect, it} from 'vitest'
import {useAuthStore} from '@/auth/authStore'
import type {AdminUser} from '@/types/auth'
import AppShell from './AppShell'
import {SIDEBAR_STORAGE_KEY, useSidebarStore} from './sidebarStore'

const admin: AdminUser = {
  _id: 'a1',
  email: 'ada@example.com',
  name: 'Ada',
  surname: 'Lovelace',
  role: 'superadmin',
  active: true,
  lastLoginAt: '2026-09-05T14:32:00.000Z',
}

function renderShell(initialPath = '/brands') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/brands" replace />} />
          <Route path="/brands" element={<h1>Marcas (pantalla)</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    useSidebarStore.setState({collapsed: false})
    useAuthStore.getState().clearSession()
    useAuthStore.getState().setSession({admin, token: 'access', refreshToken: 'refresh'})
  })

  it('shows Brands as the only navigation entry and marks it active', () => {
    renderShell()

    const nav = screen.getByRole('navigation', {name: 'Principal'})
    const links = nav.querySelectorAll('a')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveTextContent('Marcas')
    expect(links[0]).toHaveAttribute('href', '/brands')
    expect(links[0]).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByText('Kioscos')).not.toBeInTheDocument()
    expect(screen.queryByText('Pronto')).not.toBeInTheDocument()
  })

  it('renders the signed-in admin, the section title and the outlet', () => {
    renderShell()

    expect(screen.getByRole('button', {name: 'Cuenta'})).toHaveTextContent('Ada Lovelace')
    expect(screen.getByRole('heading', {level: 1, name: 'Marcas (pantalla)'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Tema'})).toBeInTheDocument()
  })

  it('sends the index route to /brands', () => {
    renderShell('/')

    expect(screen.getByRole('heading', {level: 1, name: 'Marcas (pantalla)'})).toBeInTheDocument()
  })

  it('collapses the sidebar to an icon rail and expands it again', async () => {
    const user = userEvent.setup()
    renderShell()

    const sidebar = document.getElementById('app-sidebar') as HTMLElement
    expect(sidebar).toHaveClass('w-60')

    await user.click(screen.getByRole('button', {name: 'Contraer menú'}))

    expect(sidebar).toHaveClass('w-14')
    expect(sidebar).toHaveAttribute('data-collapsed', 'true')
    // The label only goes visually hidden: the link keeps its accessible name.
    expect(screen.getByRole('link', {name: 'Marcas'})).toBeInTheDocument()

    const expand = screen.getByRole('button', {name: 'Expandir menú'})
    expect(expand).toHaveAttribute('aria-expanded', 'false')
    expect(expand).toHaveAttribute('aria-controls', 'app-sidebar')

    await user.click(expand)

    expect(sidebar).toHaveClass('w-60')
    expect(sidebar).not.toHaveAttribute('data-collapsed')
  })

  it('persists the choice so the rail survives a remount', async () => {
    const user = userEvent.setup()
    const {unmount} = renderShell()

    await user.click(screen.getByRole('button', {name: 'Contraer menú'}))
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('collapsed')

    unmount()
    renderShell()

    expect(document.getElementById('app-sidebar')).toHaveClass('w-14')
  })
})
