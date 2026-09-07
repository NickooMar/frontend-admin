/**
 * Mirror of backend-diagnostica's `src/types/services/admin-brand.service.types.ts`
 * — the payloads served by `/api/v1/admin/brands/**`.
 */

export interface AdminBrandTenantState {
  available: boolean
  reason?: string
}

export interface AdminBrandSummary {
  _id: string
  name: string
  domainName: string | null
  alternateDomains: string[]
  databaseName: string | null
  active: boolean
  tenant: AdminBrandTenantState
}

export type KioskType = 'KIOSK' | 'MULTI'

export interface LinkedUserSummary {
  _id: string
  email: string
  name: string
  role: string
  isStationAccount: boolean
  scheduleCount: number
}

export type KioskNodeData = {
  _id: string
  type: KioskType
  location: string
  status: string | null
  connected: boolean
  lastConnected: string | null
  lastDisconnected: string | null
  deleted: boolean
  keyboardMode: boolean
  assistantMode: boolean
  softwareVersion: {frontend: string | null; backend: string | null}
  examCount: number
  examNames: string[]
  linkedUsers: LinkedUserSummary[]
}

export interface ScheduleColorPalette {
  iconColor: string | null
  background: string | null
  labelColor: string | null
}

export type ScheduleNodeData = {
  _id: string
  name: string
  institution: {_id: string; name: string} | null
  specialty: string | null
  colorPalette: ScheduleColorPalette | null
  isUrgencyDefault: boolean
  deleted: boolean
  hasAvailability: boolean
  linkedUserCount: number
}

export type InstitutionNodeData = {
  _id: string
  name: string
  scheduleCount: number
}

export interface KioskArchitectureNode {
  id: string
  kind: 'kiosk' | 'multi'
  data: KioskNodeData
}

export interface ScheduleArchitectureNode {
  id: string
  kind: 'schedule'
  parentId?: string
  data: ScheduleNodeData
}

export interface InstitutionArchitectureNode {
  id: string
  kind: 'institution'
  data: InstitutionNodeData
}

export type ArchitectureNode = KioskArchitectureNode | ScheduleArchitectureNode | InstitutionArchitectureNode

export type ArchitectureEdgeKind = 'user-schedule-access'

export interface SchedulePermissions {
  view: boolean
  createAndUpdate: boolean
  startAttention: boolean
}

export interface EdgeAccount {
  userId: string
  email: string
  name: string
  role: string
  isStationAccount: boolean
  permissions: SchedulePermissions
}

export interface ArchitectureEdge {
  id: string
  source: string
  target: string
  kind: ArchitectureEdgeKind
  via: EdgeAccount[]
}

export interface ArchitectureBrand {
  _id: string
  name: string
  domainName: string | null
  alternateDomains: string[]
  databaseName: string | null
  active: boolean
}

export interface ArchitectureSummary {
  kiosks: number
  multis: number
  schedules: number
  institutions: number
  linkedUsers: number
  edges: number
}

export interface BrandArchitecture {
  brand: ArchitectureBrand
  summary: ArchitectureSummary
  nodes: ArchitectureNode[]
  edges: ArchitectureEdge[]
  includeDeleted: boolean
  generatedAt: string
}

export interface DuplicateKioskRequest {
  targetBrandId: string
  location?: string
}

export interface DuplicateKioskResult {
  kiosk: KioskNodeData
  sourceBrandId: string
  targetBrandId: string
  omitted: string[]
  notCopied: string[]
}

export interface MoveKioskRequest {
  targetBrandId: string
}

export const BRAND_ERROR_CODES = {
  BRAND_NOT_FOUND: 'BRAND_NOT_FOUND',
  TENANT_UNAVAILABLE: 'TENANT_UNAVAILABLE',
  KIOSK_NOT_FOUND: 'KIOSK_NOT_FOUND',
  TARGET_BRAND_NOT_FOUND: 'TARGET_BRAND_NOT_FOUND',
  TARGET_TENANT_UNAVAILABLE: 'TARGET_TENANT_UNAVAILABLE',
  KIOSK_BUSY: 'KIOSK_BUSY',
  MOVE_NOT_IMPLEMENTED: 'MOVE_NOT_IMPLEMENTED',
} as const

export type BrandErrorCode = (typeof BRAND_ERROR_CODES)[keyof typeof BRAND_ERROR_CODES]

export type KioskAction = 'edit' | 'duplicate' | 'move'
