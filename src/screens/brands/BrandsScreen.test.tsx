import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {MemoryRouter, Route, Routes} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {useAuthStore} from '@/auth/authStore'
import {useBrandsStore} from '@/brands/brandsStore'
import {adminBrandsService} from '@/services/adminBrandsService'
import type {AdminUser} from '@/types/auth'
import type {AdminBrandSummary, BrandArchitecture, KioskNodeData} from '@/types/brands'
import BrandsScreen, {pickDefaultBrand} from './BrandsScreen'

vi.mock('@/services/adminBrandsService', () => ({
  adminBrandsService: {list: vi.fn(), architecture: vi.fn(), duplicateKiosk: vi.fn(), moveKiosk: vi.fn()},
}))

// React Flow needs ResizeObserver/DOMMatrix; the canvas is covered by buildGraph's tests.
vi.mock('./architecture/ArchitectureCanvas', () => ({
  ArchitectureCanvas: ({architecture}: {architecture: BrandArchitecture}) => (
    <div data-testid="canvas">
      {architecture.brand.name}: {architecture.nodes.length} nodos
    </div>
  ),
}))

const admin: AdminUser = {_id: 'a1', email: 'ada@example.com', name: 'Ada', surname: 'Lovelace', role: 'superadmin', active: true}

const brand = (id: string, extra: Partial<AdminBrandSummary> = {}): AdminBrandSummary => ({
  _id: id,
  name: `Brand ${id}`,
  domainName: `${id}.example.com`,
  alternateDomains: [],
  databaseName: `diagnostica-${id}`,
  active: true,
  tenant: {available: true},
  ...extra,
})

const kiosk: KioskNodeData = {
  _id: 'k1',
  type: 'KIOSK',
  location: 'Cabina Norte',
  status: 'AVAILABLE',
  connected: false,
  lastConnected: null,
  lastDisconnected: null,
  deleted: false,
  keyboardMode: false,
  assistantMode: false,
  softwareVersion: {frontend: null, backend: null},
  examCount: 0,
  examNames: [],
  linkedUsers: [],
}

const architectureOf = (id: string): BrandArchitecture => ({
  brand: {
    _id: id,
    name: `Brand ${id}`,
    domainName: `${id}.example.com`,
    alternateDomains: [],
    databaseName: `diagnostica-${id}`,
    active: true,
  },
  summary: {kiosks: 1, multis: 0, schedules: 0, institutions: 0, linkedUsers: 0, edges: 0},
  nodes: [{id: 'kiosk:k1', kind: 'kiosk', data: kiosk}],
  edges: [],
  includeDeleted: false,
  generatedAt: '2026-09-07T12:00:00.000Z',
})

const apiError = (status: number, body: Record<string, unknown>) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    config: {},
    response: {status, data: body},
    toJSON: () => ({}),
  })

function renderScreen(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/brands" element={<BrandsScreen />} />
        <Route path="/brands/:brandId" element={<BrandsScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BrandsScreen', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useBrandsStore.getState().reset()
    useAuthStore.getState().clearSession()
    useAuthStore.getState().setSession({admin, token: 'access', refreshToken: 'refresh'})
    vi.mocked(adminBrandsService.list)
      .mockReset()
      .mockResolvedValue([
        brand('a'),
        brand('b', {active: false}),
        brand('c', {tenant: {available: false, reason: 'no db'}, databaseName: null}),
      ])
    vi.mocked(adminBrandsService.architecture)
      .mockReset()
      .mockImplementation(async (id) => architectureOf(id))
  })

  it('loads the brand from the URL and renders its architecture without touching the admin session', async () => {
    renderScreen('/brands/b')

    expect(await screen.findByTestId('canvas')).toHaveTextContent('Brand b: 1 nodos')
    expect(adminBrandsService.architecture).toHaveBeenCalledWith('b', {includeDeleted: false})
    expect(screen.getByRole('combobox', {name: 'Marca'})).toHaveTextContent('Brand b')
    expect(screen.getByText('1 cabina')).toBeInTheDocument()
    expect(screen.getByText('diagnostica-b')).toBeInTheDocument()

    expect(useAuthStore.getState().token).toBe('access')
    expect(useAuthStore.getState().admin).toEqual(admin)
    expect(sessionStorage.getItem('adminLastBrandId')).toBe('b')
  })

  it('opens the remembered brand when the URL has none, else the first brand with a tenant', async () => {
    sessionStorage.setItem('adminLastBrandId', 'b')
    renderScreen('/brands')

    expect(await screen.findByTestId('canvas')).toHaveTextContent('Brand b')

    expect(pickDefaultBrand([brand('x', {tenant: {available: false}}), brand('y')], null)?._id).toBe('y')
    expect(pickDefaultBrand([brand('x', {tenant: {available: false}})], null)?._id).toBe('x')
    expect(pickDefaultBrand([], 'x')).toBeUndefined()
  })

  it('switches brands through the selector by navigating, and refetches', async () => {
    renderScreen('/brands/a')
    expect(await screen.findByTestId('canvas')).toHaveTextContent('Brand a')

    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', {name: 'Marca'}))
    await user.click(await screen.findByRole('option', {name: /Brand c/}))

    await waitFor(() => expect(screen.getByTestId('canvas')).toHaveTextContent('Brand c'))
    expect(adminBrandsService.architecture).toHaveBeenLastCalledWith('c', {includeDeleted: false})
    expect(adminBrandsService.list).toHaveBeenCalledTimes(1)
  })

  it('shows the backend error with its code and lets the admin retry', async () => {
    vi.mocked(adminBrandsService.architecture).mockRejectedValueOnce(
      apiError(503, {statusCode: 503, error: 'Service Unavailable', message: 'Brand "c" is unavailable', code: 'TENANT_UNAVAILABLE'}),
    )
    renderScreen('/brands/c')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar la marca')
    expect(alert).toHaveTextContent('no tiene una base de datos accesible')
    expect(alert).toHaveTextContent('TENANT_UNAVAILABLE')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', {name: 'Reintentar'}))
    expect(await screen.findByTestId('canvas')).toHaveTextContent('Brand c')
  })

  it('toggling «Incluir eliminados» refetches with the flag', async () => {
    renderScreen('/brands/a')
    await screen.findByTestId('canvas')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', {name: 'Incluir eliminados'}))

    await waitFor(() => expect(adminBrandsService.architecture).toHaveBeenLastCalledWith('a', {includeDeleted: true}))
    expect(screen.getByRole('button', {name: 'Incluir eliminados'})).toHaveAttribute('aria-pressed', 'true')
  })
})
