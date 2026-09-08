import {create} from 'zustand'
import {type NormalizedApiError, toApiError} from '@/lib/api'
import {adminBrandsService} from '@/services/adminBrandsService'
import type {AdminBrandSummary, BrandArchitecture} from '@/types/brands'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface BrandsState {
  brands: AdminBrandSummary[]
  brandsStatus: LoadStatus
  brandsError: NormalizedApiError | null

  /** Brand the current `architecture` (or in-flight request) belongs to. */
  architectureBrandId: string | null
  architecture: BrandArchitecture | null
  architectureStatus: LoadStatus
  architectureError: NormalizedApiError | null
  includeDeleted: boolean

  loadBrands: (options?: {force?: boolean}) => Promise<void>
  /** Fetches a brand's architecture. A response for a brand the admin already left is dropped. */
  loadArchitecture: (brandId: string, options?: {force?: boolean}) => Promise<void>
  setIncludeDeleted: (includeDeleted: boolean) => void
  reset: () => void
}

let architectureRequest = 0

const initialState = {
  brands: [] as AdminBrandSummary[],
  brandsStatus: 'idle' as LoadStatus,
  brandsError: null,
  architectureBrandId: null,
  architecture: null,
  architectureStatus: 'idle' as LoadStatus,
  architectureError: null,
  includeDeleted: false,
}

/**
 * Cross-brand admin state. Deliberately separate from `authStore`: switching the
 * selected brand only changes what is fetched here, never the admin session.
 */
export const useBrandsStore = create<BrandsState>()((set, get) => ({
  ...initialState,

  loadBrands: async ({force = false} = {}) => {
    const {brandsStatus} = get()
    if (!force && (brandsStatus === 'loading' || brandsStatus === 'ready')) return

    set({brandsStatus: 'loading', brandsError: null})
    try {
      const brands = await adminBrandsService.list()
      set({brands, brandsStatus: 'ready'})
    } catch (error) {
      set({brandsStatus: 'error', brandsError: toApiError(error)})
    }
  },

  loadArchitecture: async (brandId, {force = false} = {}) => {
    const {architectureBrandId, architectureStatus, includeDeleted, architecture} = get()
    const sameBrand = architectureBrandId === brandId
    const sameOptions = architecture?.includeDeleted === includeDeleted
    if (!force && sameBrand && (architectureStatus === 'loading' || (architectureStatus === 'ready' && sameOptions))) return

    const request = ++architectureRequest
    set({
      architectureBrandId: brandId,
      architectureStatus: 'loading',
      architectureError: null,
      // Keep the previous canvas only while refreshing the same brand.
      architecture: sameBrand ? architecture : null,
    })

    try {
      const result = await adminBrandsService.architecture(brandId, {includeDeleted})
      if (request !== architectureRequest) return
      set({architecture: result, architectureStatus: 'ready'})
    } catch (error) {
      if (request !== architectureRequest) return
      set({architectureStatus: 'error', architectureError: toApiError(error), architecture: null})
    }
  },

  setIncludeDeleted: (includeDeleted) => {
    set({includeDeleted})
    // The flag is part of the query, so the brand on screen is refetched with it.
    const {architectureBrandId} = get()
    if (architectureBrandId) void get().loadArchitecture(architectureBrandId)
  },

  reset: () => {
    architectureRequest++
    set({...initialState})
  },
}))
