import {api, unwrap} from '@/lib/api'
import type {ApiEnvelope} from '@/types/auth'
import type {
  AdminBrandSummary,
  AdminKioskDetail,
  BrandArchitecture,
  BrandParamsPayload,
  DeleteResourceRequest,
  DeleteResourceResult,
  DuplicateKioskRequest,
  DuplicateKioskResult,
  KioskEditSection,
  KioskSectionBodies,
  MoveKioskRequest,
  UpdateBrandParamsRequest,
  UpdateBrandParamsResult,
} from '@/types/brands'

const SECTION_PATHS: Record<KioskEditSection, string> = {
  data: 'data',
  version: 'version',
  devices: 'devices',
  availableExams: 'available-exams',
  params: 'params',
}

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

  async getKiosk(brandId: string, kioskId: string): Promise<AdminKioskDetail> {
    const response = await api.get<ApiEnvelope<{kiosk: AdminKioskDetail}>>(`${ADMIN_BRANDS_PATH}/${brandId}/kiosks/${kioskId}`)
    return unwrap(response).kiosk
  },

  /** One PATCH per section; the backend validates each body with the brand panel's own schema. */
  async updateKioskSection<S extends KioskEditSection>(
    brandId: string,
    kioskId: string,
    section: S,
    body: KioskSectionBodies[S],
  ): Promise<AdminKioskDetail> {
    const response = await api.patch<ApiEnvelope<{kiosk: AdminKioskDetail}>>(
      `${ADMIN_BRANDS_PATH}/${brandId}/kiosks/${kioskId}/${SECTION_PATHS[section]}`,
      body,
    )
    return unwrap(response).kiosk
  },

  /** Boundary endpoint: today the backend validates everything and answers 501 MOVE_NOT_IMPLEMENTED. */
  async moveKiosk(brandId: string, kioskId: string, body: MoveKioskRequest): Promise<void> {
    await api.post(`${ADMIN_BRANDS_PATH}/${brandId}/kiosks/${kioskId}/move`, body)
  },

  /**
   * Logical deletion (`deleted: true`); the document and its history stay.
   * `confirmName` is the name the admin typed and the server re-checks it, so
   * the request is refused when the panel is showing a stale card.
   */
  async deleteKiosk(brandId: string, kioskId: string, body: DeleteResourceRequest): Promise<DeleteResourceResult> {
    const response = await api.delete<ApiEnvelope<DeleteResourceResult>>(`${ADMIN_BRANDS_PATH}/${brandId}/kiosks/${kioskId}`, {
      data: body,
    })
    return unwrap(response)
  },

  async deleteSchedule(brandId: string, scheduleId: string, body: DeleteResourceRequest): Promise<DeleteResourceResult> {
    const response = await api.delete<ApiEnvelope<DeleteResourceResult>>(`${ADMIN_BRANDS_PATH}/${brandId}/schedules/${scheduleId}`, {
      data: body,
    })
    return unwrap(response)
  },

  /** The brand's `params` with secret leaves masked (see `secretPaths`) and the revision to send back on save. */
  async getParams(brandId: string): Promise<BrandParamsPayload> {
    const response = await api.get<ApiEnvelope<BrandParamsPayload>>(`${ADMIN_BRANDS_PATH}/${brandId}/params`)
    return unwrap(response)
  },

  /**
   * Path-addressed edits, applied as one atomic `$set`/`$unset`. Only the
   * parameters that changed travel, so two admins editing different keys never
   * overwrite each other; a stale `revision` is refused with 409.
   */
  async updateParams(brandId: string, body: UpdateBrandParamsRequest): Promise<UpdateBrandParamsResult> {
    const response = await api.patch<ApiEnvelope<UpdateBrandParamsResult>>(`${ADMIN_BRANDS_PATH}/${brandId}/params`, body)
    return unwrap(response)
  },
}
