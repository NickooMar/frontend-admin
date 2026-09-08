import {AVAILABLE_EXAM_LIMITS, normalizeExamType} from '@/data/availableExamCatalog'
import {DEVICE_DATA_FIELDS_BY_TYPE, deviceKindKey, kioskDeviceUsesLabel} from '@/data/kioskDeviceCatalog'
import {STRINGS} from '@/lib/strings'
import type {
  AdminKioskDetail,
  AvailableExam,
  AvailableExamInstruction,
  EcgConfig,
  KioskDevice,
  KioskEditSection,
  KioskSectionBodies,
  KioskType,
  MultiparametricMonitorParams,
  NetworkQualityParams,
} from '@/types/brands'

const COPY = STRINGS.brands.edit

// ---- Software versions -------------------------------------------------------

/** Mirrors backend-diagnostica's `softwareVersion.config`: three required keys, known optional ones, extras allowed. */
export const REQUIRED_VERSION_KEYS = ['backend', 'frontend', 'berry'] as const
export const KNOWN_VERSION_KEYS = [
  ...REQUIRED_VERSION_KEYS,
  'backendOffline',
  'mongodb',
  'ecg',
  'board',
  'keyboard',
  'infraredThermometer',
  'nutritionalScale',
] as const

export interface VersionRow {
  key: string
  value: string
  required: boolean
  /** Known keys keep a fixed label and cannot be removed; extras are free rows. */
  known: boolean
}

export function versionDraftFromDetail(detail: AdminKioskDetail): VersionRow[] {
  const stored = detail.softwareVersion ?? {}
  const asString = (value: unknown) => (value === null || value === undefined ? '' : String(value))
  const known: VersionRow[] = KNOWN_VERSION_KEYS.map((key) => ({
    key,
    value: asString(stored[key]),
    required: (REQUIRED_VERSION_KEYS as readonly string[]).includes(key),
    known: true,
  }))
  const extras: VersionRow[] = Object.keys(stored)
    .filter((key) => !(KNOWN_VERSION_KEYS as readonly string[]).includes(key))
    .map((key) => ({key, value: asString(stored[key]), required: false, known: false}))
  return [...known, ...extras]
}

export function versionBodyFromDraft(rows: VersionRow[]): {body: KioskSectionBodies['version']} | {error: string} {
  const missing = rows.filter((row) => row.required && !row.value.trim()).map((row) => row.key)
  if (missing.length > 0) return {error: COPY.version.missingRequired(missing.join(', '))}

  const softwareVersion: Record<string, string> = {}
  for (const row of rows) {
    const key = row.key.trim()
    const value = row.value.trim()
    if (!row.known && (!key || /\s/.test(key) || key in softwareVersion)) return {error: COPY.version.invalidKey}
    if (value) softwareVersion[key] = value
  }
  return {body: {softwareVersion}}
}

// ---- Devices -----------------------------------------------------------------

export const CUSTOM_DEVICE = '__custom__'

export interface DeviceDraft {
  uid: string
  /** Catalog device name, or `CUSTOM_DEVICE`. */
  catalog: string
  type: string
  subType: string
  name: string
  nameToShow: string
  ledNumber: string
  isEnabled: boolean
  videoAnalysis: boolean
  analysisContext: string
  compatibleWithKioskMode: boolean
  /** Every `data` value as text; `dependencies` is comma separated. */
  data: Record<string, string>
}

let uidCounter = 0
export const nextUid = () => `draft-${++uidCounter}`

export const devicesToArray = (devices: AdminKioskDetail['devices']): KioskDevice[] =>
  Array.isArray(devices) ? devices : Object.values(devices ?? {})

const dataToText = (data: Record<string, unknown> | undefined): Record<string, string> =>
  Object.fromEntries(
    Object.entries(data ?? {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(', ') : value === null || value === undefined ? '' : String(value),
    ]),
  )

export function deviceDraftFrom(device: KioskDevice, catalogName: string | undefined): DeviceDraft {
  return {
    uid: nextUid(),
    catalog: catalogName ?? CUSTOM_DEVICE,
    type: device.type ?? '',
    subType: device.subType ?? '',
    name: device.name ?? '',
    nameToShow: device.nameToShow ?? '',
    ledNumber: device.ledNumber === null || device.ledNumber === undefined ? '' : String(device.ledNumber),
    isEnabled: device.isEnabled !== false,
    videoAnalysis: device.videoAnalysis === true,
    analysisContext: device.analysisContext ?? '',
    compatibleWithKioskMode: device.compatibleWithKioskMode === true,
    data: dataToText(device.data),
  }
}

export const emptyDeviceDraft = (): DeviceDraft => ({
  uid: nextUid(),
  catalog: CUSTOM_DEVICE,
  type: '',
  subType: '',
  name: '',
  nameToShow: '',
  ledNumber: '',
  isEnabled: true,
  videoAnalysis: false,
  analysisContext: '',
  compatibleWithKioskMode: false,
  data: {label: ''},
})

/** `data` keys this device may carry, mirroring the brand panel's `allowedDeviceDataFields`. */
export const allowedDeviceDataFields = (type: string, subType: string): string[] => [
  ...(kioskDeviceUsesLabel(type, subType) ? ['label'] : []),
  ...(DEVICE_DATA_FIELDS_BY_TYPE[deviceKindKey(type, subType)] ?? []),
]

export function deviceFromDraft(draft: DeviceDraft): KioskDevice {
  const allowed = allowedDeviceDataFields(draft.type, draft.subType)
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    const raw = draft.data[key] ?? ''
    if (key === 'dependencies') {
      data.dependencies = raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    } else if (key === 'label') {
      // An empty label is meaningful («use whatever the OS offers»), so it always travels.
      data.label = raw.trim()
    } else if (raw.trim()) {
      data[key] = raw.trim()
    }
  }

  const device: KioskDevice = {
    type: draft.type.trim(),
    subType: draft.subType.trim(),
    name: draft.name.trim(),
    nameToShow: draft.nameToShow.trim(),
    isEnabled: draft.isEnabled,
    data,
  }
  if (kioskDeviceUsesLabel(draft.type, draft.subType)) {
    const led = draft.ledNumber.trim()
    device.ledNumber = led === '' ? null : Number.parseInt(led, 10)
  }
  if (draft.subType === 'video') {
    device.videoAnalysis = draft.videoAnalysis
    if (draft.videoAnalysis && draft.analysisContext.trim()) device.analysisContext = draft.analysisContext.trim()
  }
  if (draft.compatibleWithKioskMode) device.compatibleWithKioskMode = true
  return device
}

export function devicesBodyFromDraft(drafts: DeviceDraft[]): {body: KioskSectionBodies['devices']} | {error: string} {
  const devices: KioskDevice[] = []
  for (const [index, draft] of drafts.entries()) {
    const device = deviceFromDraft(draft)
    if (!device.type || !device.subType || !device.name || !device.nameToShow) return {error: COPY.devices.invalid(index + 1)}
    if (device.ledNumber !== undefined && device.ledNumber !== null && Number.isNaN(device.ledNumber))
      return {error: COPY.devices.invalid(index + 1)}
    devices.push(device)
  }
  return {body: {devices}}
}

// ---- Available exams ---------------------------------------------------------

export const CUSTOM_EXAM = '__custom__'

export interface ExamDraft {
  uid: string
  /** Catalog exam type, or `CUSTOM_EXAM`. */
  catalog: string
  type: string
  name: string
  subtype: string
  customPrompt: string
  devices: string[]
  instructions: AvailableExamInstruction[]
}

export function examDraftFrom(exam: AvailableExam, inCatalog: boolean): ExamDraft {
  return {
    uid: nextUid(),
    catalog: inCatalog && exam.type ? exam.type : CUSTOM_EXAM,
    type: exam.type ?? '',
    name: exam.name ?? '',
    subtype: exam.subtype ?? '',
    customPrompt: exam.customPrompt ?? '',
    devices: Array.isArray(exam.devices) ? [...new Set(exam.devices.map((device) => `${device}`.trim()).filter(Boolean))] : [],
    instructions: Array.isArray(exam.instructions) ? exam.instructions : [],
  }
}

export const emptyExamDraft = (): ExamDraft => ({
  uid: nextUid(),
  catalog: CUSTOM_EXAM,
  type: '',
  name: '',
  subtype: '',
  customPrompt: '',
  devices: [],
  instructions: [],
})

/** Instructions travel back untouched, except the signed `url` the API adds on read. */
const persistableInstructions = (instructions: AvailableExamInstruction[]): AvailableExamInstruction[] =>
  instructions
    .filter((instruction) => instruction?.image?.key)
    .map(({image, ...rest}) => {
      const {url: _url, ...persistable} = image as NonNullable<typeof image>
      return {...rest, image: persistable}
    })

export function examFromDraft(draft: ExamDraft): AvailableExam {
  const exam: AvailableExam = {
    type: normalizeExamType(draft.type),
    name: draft.name.trim().slice(0, AVAILABLE_EXAM_LIMITS.name),
    devices: [...new Set(draft.devices.map((device) => device.trim()).filter(Boolean))],
  }
  const subtype = draft.subtype.trim().slice(0, AVAILABLE_EXAM_LIMITS.subtype)
  if (subtype) exam.subtype = subtype
  const customPrompt = draft.customPrompt.trim().slice(0, AVAILABLE_EXAM_LIMITS.customPrompt)
  if (customPrompt) exam.customPrompt = customPrompt
  const instructions = persistableInstructions(draft.instructions)
  if (instructions.length > 0) exam.instructions = instructions
  return exam
}

export function examsBodyFromDraft(drafts: ExamDraft[]): {body: KioskSectionBodies['availableExams']} | {error: string} {
  const availableExams: AvailableExam[] = []
  for (const [index, draft] of drafts.entries()) {
    const exam = examFromDraft(draft)
    if (!exam.type || !exam.name || !exam.devices || exam.devices.length === 0) return {error: COPY.exams.invalid(index + 1)}
    availableExams.push(exam)
  }
  return {body: {availableExams}}
}

// ---- Params ------------------------------------------------------------------

/** Defaults declared on `Kiosk.params` in backend-diagnostica; a kiosk missing a section is completed from here. */
export const DEFAULT_ECG_CONFIG: EcgConfig = {
  filter: {frec: {active: false, value: 'z'}, muscle: {active: false, value: 1}, baseline: {active: false, value: 1}},
  stillHereCountdownPeriod: 20,
  stillHerePeriod: 60,
  stillHereStart: 120,
}

export const DEFAULT_MONITOR: MultiparametricMonitorParams = {
  config: {
    ECG: {min: 0, max: 85, isAlarmActive: false, switchOn: true},
    RESP: {min: 0, max: 10, isAlarmActive: false, switchOn: true},
    SPO2: {min: 95, max: 100, isAlarmActive: false, switchOn: true},
    TEMP: {min: 35, max: 38, isAlarmActive: false, switchOn: true},
    NIBP: {minSys: 90, maxSys: 120, minDia: 60, maxDia: 80, measureInterval: 1, isAlarmActive: false, switchOn: true},
  },
  showInstructions: false,
  alarmInterval: 1,
}

export const DEFAULT_NETWORK_QUALITY: NetworkQualityParams = {
  enabled: false,
  intervalMs: 30000,
  minDownloadKbps: 2000,
  minUploadKbps: 1000,
  maxLatencyMs: 150,
  maxPacketLossPercent: 0,
}

export interface ParamsDraft {
  ecg: EcgConfig
  monitor: MultiparametricMonitorParams
  networkQuality: NetworkQualityParams
  keyboardMode: boolean
  assistantMode: boolean
}

const number = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const filterSetting = (
  value: Partial<{active: boolean; value: string | number}> | undefined,
  fallback: {active: boolean; value: string | number},
) => ({
  active: value?.active === true,
  value: value?.value ?? fallback.value,
})

export function paramsDraftFromDetail(detail: AdminKioskDetail): ParamsDraft {
  const params = detail.params ?? {}
  const ecg = params.ecg?.config ?? {}
  const monitor = params.multiparametricMonitor ?? {}
  const config = {...DEFAULT_MONITOR.config, ...(monitor.config ?? {})}
  const network = params.networkQuality ?? {}

  const vital = (key: 'ECG' | 'RESP' | 'SPO2' | 'TEMP') => ({
    min: number(config[key]?.min, DEFAULT_MONITOR.config[key].min as number),
    max: number(config[key]?.max, DEFAULT_MONITOR.config[key].max as number),
    isAlarmActive: config[key]?.isAlarmActive === true,
    switchOn: config[key]?.switchOn !== false,
  })

  return {
    ecg: {
      filter: {
        frec: filterSetting(ecg.filter?.frec, DEFAULT_ECG_CONFIG.filter.frec),
        muscle: filterSetting(ecg.filter?.muscle, DEFAULT_ECG_CONFIG.filter.muscle),
        baseline: filterSetting(ecg.filter?.baseline, DEFAULT_ECG_CONFIG.filter.baseline),
      },
      stillHereCountdownPeriod: number(ecg.stillHereCountdownPeriod, DEFAULT_ECG_CONFIG.stillHereCountdownPeriod),
      stillHerePeriod: number(ecg.stillHerePeriod, DEFAULT_ECG_CONFIG.stillHerePeriod),
      stillHereStart: number(ecg.stillHereStart, DEFAULT_ECG_CONFIG.stillHereStart),
    },
    monitor: {
      config: {
        ECG: vital('ECG'),
        RESP: vital('RESP'),
        SPO2: vital('SPO2'),
        TEMP: vital('TEMP'),
        NIBP: {
          minSys: number(config.NIBP?.minSys, DEFAULT_MONITOR.config.NIBP.minSys as number),
          maxSys: number(config.NIBP?.maxSys, DEFAULT_MONITOR.config.NIBP.maxSys as number),
          minDia: number(config.NIBP?.minDia, DEFAULT_MONITOR.config.NIBP.minDia as number),
          maxDia: number(config.NIBP?.maxDia, DEFAULT_MONITOR.config.NIBP.maxDia as number),
          measureInterval: number(config.NIBP?.measureInterval, DEFAULT_MONITOR.config.NIBP.measureInterval as number),
          isAlarmActive: config.NIBP?.isAlarmActive === true,
          switchOn: config.NIBP?.switchOn !== false,
        },
      },
      showInstructions: monitor.showInstructions === true,
      alarmInterval: number(monitor.alarmInterval, DEFAULT_MONITOR.alarmInterval as number),
    },
    networkQuality: {
      enabled: network.enabled === true,
      intervalMs: number(network.intervalMs, DEFAULT_NETWORK_QUALITY.intervalMs),
      minDownloadKbps: number(network.minDownloadKbps, DEFAULT_NETWORK_QUALITY.minDownloadKbps),
      minUploadKbps: number(network.minUploadKbps, DEFAULT_NETWORK_QUALITY.minUploadKbps),
      maxLatencyMs: number(network.maxLatencyMs, DEFAULT_NETWORK_QUALITY.maxLatencyMs),
      maxPacketLossPercent: number(network.maxPacketLossPercent, DEFAULT_NETWORK_QUALITY.maxPacketLossPercent),
    },
    keyboardMode: params.keyboardMode === true,
    assistantMode: params.assistantMode === true,
  }
}

const allFinite = (values: unknown[]) => values.every((value) => typeof value === 'number' && Number.isFinite(value))

export function paramsBodyFromDraft(draft: ParamsDraft): {body: KioskSectionBodies['params']} | {error: string} {
  const {ecg, monitor, networkQuality} = draft
  const numbers = [
    ecg.stillHereCountdownPeriod,
    ecg.stillHerePeriod,
    ecg.stillHereStart,
    monitor.alarmInterval,
    ...(['ECG', 'RESP', 'SPO2', 'TEMP'] as const).flatMap((key) => [monitor.config[key].min, monitor.config[key].max]),
    monitor.config.NIBP.minSys,
    monitor.config.NIBP.maxSys,
    monitor.config.NIBP.minDia,
    monitor.config.NIBP.maxDia,
    monitor.config.NIBP.measureInterval,
    networkQuality.intervalMs,
    networkQuality.minDownloadKbps,
    networkQuality.minUploadKbps,
    networkQuality.maxLatencyMs,
    networkQuality.maxPacketLossPercent,
  ]
  if (!allFinite(numbers)) return {error: COPY.params.invalidNumbers}

  return {
    body: {
      params: {
        ecg: {config: ecg},
        multiparametricMonitor: monitor,
        networkQuality,
        keyboardMode: draft.keyboardMode,
        assistantMode: draft.assistantMode,
      },
    },
  }
}

// ---- Data --------------------------------------------------------------------

export interface DataDraft {
  location: string
  type: KioskType
  status: string
}

export const dataDraftFromDetail = (detail: AdminKioskDetail): DataDraft => ({
  location: detail.location ?? '',
  type: detail.type === 'MULTI' ? 'MULTI' : 'KIOSK',
  status: detail.status ?? 'AVAILABLE',
})

export function dataBodyFromDraft(draft: DataDraft): {body: KioskSectionBodies['data']} | {error: string} {
  const location = draft.location.trim()
  if (!location) return {error: COPY.data.locationRequired}
  return {body: {location, type: draft.type, ...(draft.status ? {status: draft.status} : {})}}
}

export const sectionLabel = (section: KioskEditSection): string => STRINGS.brands.kiosk.editSections[section] ?? section
