import {beforeEach, describe, expect, it, vi} from 'vitest'
import {adminBrandsService} from '@/services/adminBrandsService'
import type {AdminBrandSummary, BrandArchitecture} from '@/types/brands'
import {useBrandsStore} from './brandsStore'

vi.mock('@/services/adminBrandsService', () => ({
  adminBrandsService: {list: vi.fn(), architecture: vi.fn(), duplicateKiosk: vi.fn(), moveKiosk: vi.fn()},
}))

const brand = (id: string): AdminBrandSummary => ({
  _id: id,
  name: `Brand ${id}`,
  domainName: null,
  alternateDomains: [],
  databaseName: `diagnostica-${id}`,
  active: true,
  tenant: {available: true},
})

const architectureOf = (id: string, includeDeleted = false): BrandArchitecture => ({
  brand: {_id: id, name: `Brand ${id}`, domainName: null, alternateDomains: [], databaseName: null, active: true},
  summary: {kiosks: 0, multis: 0, schedules: 0, institutions: 0, linkedUsers: 0, edges: 0},
  nodes: [],
  edges: [],
  includeDeleted,
  generatedAt: '2026-09-07T12:00:00.000Z',
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return {promise, resolve, reject}
}

describe('brandsStore', () => {
  beforeEach(() => {
    useBrandsStore.getState().reset()
    vi.mocked(adminBrandsService.list).mockReset()
    vi.mocked(adminBrandsService.architecture).mockReset()
  })

  it('loads the brand list once and exposes errors', async () => {
    vi.mocked(adminBrandsService.list).mockResolvedValue([brand('a'), brand('b')])

    await useBrandsStore.getState().loadBrands()
    await useBrandsStore.getState().loadBrands()

    expect(adminBrandsService.list).toHaveBeenCalledTimes(1)
    expect(useBrandsStore.getState().brandsStatus).toBe('ready')
    expect(useBrandsStore.getState().brands.map((entry) => entry._id)).toEqual(['a', 'b'])

    vi.mocked(adminBrandsService.list).mockRejectedValue(new Error('boom'))
    await useBrandsStore.getState().loadBrands({force: true})
    expect(useBrandsStore.getState().brandsStatus).toBe('error')
    expect(useBrandsStore.getState().brandsError?.message).toBe('boom')
  })

  it('drops a late response for a brand the admin already left', async () => {
    const slow = deferred<BrandArchitecture>()
    vi.mocked(adminBrandsService.architecture)
      .mockImplementationOnce(() => slow.promise)
      .mockResolvedValueOnce(architectureOf('b'))

    const first = useBrandsStore.getState().loadArchitecture('a')
    const second = useBrandsStore.getState().loadArchitecture('b')
    await second

    expect(useBrandsStore.getState().architecture?.brand._id).toBe('b')
    expect(useBrandsStore.getState().architectureStatus).toBe('ready')

    slow.resolve(architectureOf('a'))
    await first

    expect(useBrandsStore.getState().architecture?.brand._id).toBe('b')
    expect(useBrandsStore.getState().architectureBrandId).toBe('b')
  })

  it('clears the previous canvas when switching brands but keeps it while refreshing the same one', async () => {
    vi.mocked(adminBrandsService.architecture).mockResolvedValue(architectureOf('a'))
    await useBrandsStore.getState().loadArchitecture('a')
    expect(useBrandsStore.getState().architecture?.brand._id).toBe('a')

    const pending = deferred<BrandArchitecture>()
    vi.mocked(adminBrandsService.architecture).mockImplementationOnce(() => pending.promise)
    const refresh = useBrandsStore.getState().loadArchitecture('a', {force: true})
    expect(useBrandsStore.getState().architectureStatus).toBe('loading')
    expect(useBrandsStore.getState().architecture?.brand._id).toBe('a')
    pending.resolve(architectureOf('a'))
    await refresh

    const switching = deferred<BrandArchitecture>()
    vi.mocked(adminBrandsService.architecture).mockImplementationOnce(() => switching.promise)
    const switchTo = useBrandsStore.getState().loadArchitecture('b')
    expect(useBrandsStore.getState().architecture).toBeNull()
    switching.resolve(architectureOf('b'))
    await switchTo
    expect(useBrandsStore.getState().architecture?.brand._id).toBe('b')
  })

  it('refetches when includeDeleted changes and reports API errors with their code', async () => {
    vi.mocked(adminBrandsService.architecture).mockResolvedValue(architectureOf('a'))
    await useBrandsStore.getState().loadArchitecture('a')
    await useBrandsStore.getState().loadArchitecture('a')
    expect(adminBrandsService.architecture).toHaveBeenCalledTimes(1)

    vi.mocked(adminBrandsService.architecture).mockResolvedValue(architectureOf('a', true))
    useBrandsStore.getState().setIncludeDeleted(true)
    await vi.waitFor(() => expect(useBrandsStore.getState().architecture?.includeDeleted).toBe(true))
    expect(adminBrandsService.architecture).toHaveBeenLastCalledWith('a', {includeDeleted: true})
    expect(adminBrandsService.architecture).toHaveBeenCalledTimes(2)

    vi.mocked(adminBrandsService.architecture).mockRejectedValue(
      Object.assign(new Error('Request failed with status code 503'), {
        isAxiosError: true,
        config: {},
        response: {status: 503, data: {statusCode: 503, error: 'Service Unavailable', message: 'unavailable', code: 'TENANT_UNAVAILABLE'}},
        toJSON: () => ({}),
      }),
    )
    await useBrandsStore.getState().loadArchitecture('c')
    expect(useBrandsStore.getState().architectureStatus).toBe('error')
    expect(useBrandsStore.getState().architectureError?.code).toBe('TENANT_UNAVAILABLE')
    expect(useBrandsStore.getState().architecture).toBeNull()
  })
})
