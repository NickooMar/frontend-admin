import {api, unwrap} from '@/lib/api'
import type {ApiEnvelope} from '@/types/auth'
import type {AdminBrandSummary, BrandArchitecture, DuplicateKioskRequest, DuplicateKioskResult, MoveKioskRequest} from '@/types/brands'

export const ADMIN_BRANDS_PATH = '/api/v1/admin/brands'

/**
 * HTTP client for the cross-brand admin API. The brand is always a path
 * parameter: switching brands never touches the admin session or any token.
 */
export const adminBrandsService = {
  async list(): Promise<AdminBrandSummary[]> {
    const response = await api.get<ApiEnvelope<AdminBrandSummary[]>>(ADMIN_BRANDS_PATH)
    return unwrap(response)
  },

  async architecture(brandId: string, {includeDeleted = false}: {includeDeleted?: boolean} = {}): Promise<BrandArchitecture> {
    const response = await api.get<ApiEnvelope<BrandArchitecture>>(`${ADMIN_BRANDS_PATH}/${brandId}/architecture`, {
      params: includeDeleted ? {includeDeleted: 'true'} : undefined,
    })
    return unwrap(response)
  },

  async duplicateKiosk(brandId: string, kioskId: string, body: DuplicateKioskRequest): Promise<DuplicateKioskResult> {
    const response = await api.post<ApiEnvelope<DuplicateKioskResult>>(`${ADMIN_BRANDS_PATH}/${brandId}/kiosks/${kioskId}/duplicate`, body)
    return unwrap(response)
  },

  /** Boundary endpoint: today the backend validates everything and answers 501 MOVE_NOT_IMPLEMENTED. */
  async moveKiosk(brandId: string, kioskId: string, body: MoveKioskRequest): Promise<void> {
    await api.post(`${ADMIN_BRANDS_PATH}/${brandId}/kiosks/${kioskId}/move`, body)
  },
}
