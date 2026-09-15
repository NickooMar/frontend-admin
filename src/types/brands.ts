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

/** Latest attention on a live videovisit — where the professional's name comes from. */
export interface ActiveProfessionalSummary {
  fullName: string
  enrollment: string | null
}

/** Videovisit still open (`PENDING` waiting for a professional, `ACCEPTED` in call) on the active session. */
export interface ActiveVideoVisitSummary {
  _id: string
  status: string
  startDate: string | null
  professional: ActiveProfessionalSummary | null
}

/** Multi flows admit anonymous patients as a `-` / `-` record, so `name` can legitimately be empty. */
export interface ActivePatientSummary {
  _id: string
  name: string
  idType: string | null
  idValue: string | null
  unidentified: boolean
}

/** The session currently occupying a kiosk. Only sent while the kiosk's own status says it is busy. */
export interface ActiveSessionSummary {
  _id: string
  type: KioskType
  startDate: string | null
  patientEnteredAt: string | null
  patient: ActivePatientSummary | null
  videoVisit: ActiveVideoVisitSummary | null
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
  activeSession: ActiveSessionSummary | null
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

/** Body of both DELETE endpoints: the name the admin typed, re-checked server-side. */
export interface DeleteResourceRequest {
  confirmName: string
}

export interface DeleteResourceResult {
  _id: string
  kind: 'kiosk' | 'schedule'
  name: string
  deleted: true
}

export const BRAND_ERROR_CODES = {
  BRAND_NOT_FOUND: 'BRAND_NOT_FOUND',
  TENANT_UNAVAILABLE: 'TENANT_UNAVAILABLE',
  KIOSK_NOT_FOUND: 'KIOSK_NOT_FOUND',
  TARGET_BRAND_NOT_FOUND: 'TARGET_BRAND_NOT_FOUND',
  TARGET_TENANT_UNAVAILABLE: 'TARGET_TENANT_UNAVAILABLE',
  KIOSK_BUSY: 'KIOSK_BUSY',
  MOVE_NOT_IMPLEMENTED: 'MOVE_NOT_IMPLEMENTED',
  SCHEDULE_NOT_FOUND: 'SCHEDULE_NOT_FOUND',
  SCHEDULE_HAS_APPOINTMENTS: 'SCHEDULE_HAS_APPOINTMENTS',
  CONFIRMATION_MISMATCH: 'CONFIRMATION_MISMATCH',
  PARAMS_INVALID_VALUE: 'PARAMS_INVALID_VALUE',
  PARAMS_PATH_CONFLICT: 'PARAMS_PATH_CONFLICT',
  PARAMS_PATH_BLOCKED: 'PARAMS_PATH_BLOCKED',
  PARAMS_MASKED_VALUE: 'PARAMS_MASKED_VALUE',
  PARAMS_REVISION_MISMATCH: 'PARAMS_REVISION_MISMATCH',
} as const

export type BrandErrorCode = (typeof BRAND_ERROR_CODES)[keyof typeof BRAND_ERROR_CODES]

/** Editable sections of a kiosk/multi; each maps to one PATCH endpoint. */
export const KIOSK_EDIT_SECTIONS = ['data', 'version', 'devices', 'availableExams', 'params'] as const
export type KioskEditSection = (typeof KIOSK_EDIT_SECTIONS)[number]

export type KioskAction = 'duplicate' | 'move' | 'delete' | `edit:${KioskEditSection}`
export type KioskTransferAction = Extract<KioskAction, 'duplicate' | 'move'>

export const isEditAction = (action: KioskAction): action is `edit:${KioskEditSection}` => action.startsWith('edit:')
export const editSectionOf = (action: `edit:${KioskEditSection}`): KioskEditSection => action.slice('edit:'.length) as KioskEditSection

/** The only agenda operation the admin canvas offers today. */
export type ScheduleAction = 'delete'

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

// ---- Brand params editor ------------------------------------------------------

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | {[key: string]: JsonValue}
export type JsonObject = {[key: string]: JsonValue}

/**
 * One edit on `brand.params`, addressed by object keys (`['smtp', 'host']`).
 * Arrays are always replaced whole, so a path never contains an index. `set`
 * creates missing intermediate objects; `unset` removes the key.
 */
export type ParamsOperation = {op: 'set'; path: string[]; value: JsonValue} | {op: 'unset'; path: string[]}

/** What a secret leaf looks like once it leaves the server; the API refuses to write it back. */
export const SECRET_MASK = '********'

/** `GET /brands/:brandId/params`. */
export interface BrandParamsPayload {
  brandId: string
  name: string
  params: JsonObject
  /** Dotted paths whose value came back masked (`smtp.password`, `metabase.secretKey`, …). */
  secretPaths: string[]
  /** Fingerprint of the stored params; sent back on save so a concurrent edit is refused instead of overwritten. */
  revision: string
}

export interface UpdateBrandParamsRequest {
  revision?: string
  operations: ParamsOperation[]
}

export interface UpdateBrandParamsResult extends BrandParamsPayload {
  /** Operations that changed something; no-ops are dropped server-side. */
  applied: number
  paths: string[]
}
