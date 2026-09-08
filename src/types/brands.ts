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

/** Editable sections of a kiosk/multi; each maps to one PATCH endpoint. */
export const KIOSK_EDIT_SECTIONS = ['data', 'version', 'devices', 'availableExams', 'params'] as const
export type KioskEditSection = (typeof KIOSK_EDIT_SECTIONS)[number]

export type KioskAction = 'duplicate' | 'move' | `edit:${KioskEditSection}`
export type KioskTransferAction = Exclude<KioskAction, `edit:${string}`>

export const isEditAction = (action: KioskAction): action is `edit:${KioskEditSection}` => action.startsWith('edit:')
export const editSectionOf = (action: `edit:${KioskEditSection}`): KioskEditSection => action.slice('edit:'.length) as KioskEditSection

export interface KioskDevice {
  type?: string
  subType?: string
  name?: string
  nameToShow?: string
  data?: Record<string, unknown>
  ledNumber?: number | null
  isEnabled?: boolean
  videoAnalysis?: boolean
  analysisContext?: string
  compatibleWithKioskMode?: boolean
  [key: string]: unknown
}

export interface InstructionImage {
  key: string
  provider?: string
  bucket?: string
  contentType?: string
  originalName?: string
  /** Signed URL minted on read; never persisted. */
  url?: string
}

export interface AvailableExamInstruction {
  id?: string
  title?: string
  description?: string
  image?: InstructionImage
}

export interface AvailableExam {
  type?: string
  subtype?: string | null
  name?: string
  customPrompt?: string | null
  devices?: string[]
  instructions?: AvailableExamInstruction[]
  /** Derived by the backend from the linked video device; read-only. */
  videoAnalysis?: boolean
  analysisContext?: string
  [key: string]: unknown
}

export interface EcgFilterSetting {
  active: boolean
  value: string | number
}

export interface EcgConfig {
  filter: {frec: EcgFilterSetting; muscle: EcgFilterSetting; baseline: EcgFilterSetting}
  stillHereCountdownPeriod: number
  stillHerePeriod: number
  stillHereStart: number
}

export interface MonitorVital {
  min: number | string
  max: number | string
  isAlarmActive: boolean
  switchOn: boolean
}

export interface MonitorNibp {
  minSys: number | string
  maxSys: number | string
  minDia: number | string
  maxDia: number | string
  measureInterval: number | string
  isAlarmActive: boolean
  switchOn: boolean
}

export interface MonitorConfig {
  ECG: MonitorVital
  RESP: MonitorVital
  SPO2: MonitorVital
  TEMP: MonitorVital
  NIBP: MonitorNibp
}

export interface MultiparametricMonitorParams {
  config: MonitorConfig
  showInstructions: boolean
  alarmInterval: number | string
}

export interface NetworkQualityParams {
  enabled: boolean
  intervalMs: number
  minDownloadKbps: number
  minUploadKbps: number
  maxLatencyMs: number
  maxPacketLossPercent: number
}

export interface KioskWelcomeVideo {
  key: string
  provider?: string
  bucket?: string
  contentType?: string
  originalName?: string
  size?: number
  updatedAt?: string
  url?: string
}

export interface KioskParams {
  ecg?: {config?: Partial<EcgConfig>}
  multiparametricMonitor?: Partial<Omit<MultiparametricMonitorParams, 'config'>> & {config?: Partial<MonitorConfig>}
  networkQuality?: Partial<NetworkQualityParams>
  keyboardMode?: boolean
  assistantMode?: boolean
  welcomeVideo?: KioskWelcomeVideo | null
  [key: string]: unknown
}

/** Full kiosk document served by `GET /brands/:brandId/kiosks/:kioskId` (secrets already redacted). */
export interface AdminKioskDetail {
  _id: string
  type: KioskType
  location: string
  status?: string | null
  connected?: boolean
  lastConnected?: string | null
  lastDisconnected?: string | null
  deleted?: boolean
  softwareVersion: Record<string, unknown>
  devices: KioskDevice[] | Record<string, KioskDevice>
  availableExams: AvailableExam[]
  params: KioskParams
  zoomFactor?: number
  measurementCalibrations?: unknown[]
  reportThirdParty?: {url?: string}
  [key: string]: unknown
}

export interface KioskDataUpdate {
  location: string
  type: KioskType
  status?: string
}

/** Body of each section PATCH, keyed by section. */
export interface KioskSectionBodies {
  data: KioskDataUpdate
  version: {softwareVersion: Record<string, string>}
  devices: {devices: KioskDevice[]}
  availableExams: {availableExams: AvailableExam[]}
  params: {
    params: {
      ecg: {config: EcgConfig}
      multiparametricMonitor: MultiparametricMonitorParams
      networkQuality?: NetworkQualityParams
      keyboardMode?: boolean
      assistantMode?: boolean
    }
  }
}

export const KIOSK_STATUSES = ['AVAILABLE', 'PENDING', 'BUSY', 'MAINTENANCE', 'IN_USE', 'IN_USE_BY_KIOSK_USER', 'DISABLED'] as const
