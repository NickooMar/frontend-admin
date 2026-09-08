/**
 * The hardware a cabin/station can be configured with. Mirrors
 * `frontend-diagnostica/src/data/kioskDeviceCatalog.ts` — the two panels edit the
 * same `kiosks.devices` documents, so the identities (`name`, `type`, `subType`)
 * must stay in sync; only the copy is Spanish here instead of i18n keys.
 */
export interface KioskDeviceCatalogEntry {
  /** Wire identity: frontend-cabina asks backend-cabina for a device by name and exams reference it. */
  name: string
  type: string
  subType: string
  label: string
  defaultLedNumber: number | null
  defaultData: Record<string, unknown>
}

const media = (name: string, subType: 'video' | 'audio', label: string, led: number | null): KioskDeviceCatalogEntry => ({
  name,
  type: 'media',
  subType,
  label,
  defaultLedNumber: led,
  defaultData: {label: ''},
})

const service = (
  name: string,
  label: string,
  led: number | null,
  data: Record<string, unknown> = {label: ''},
): KioskDeviceCatalogEntry => ({
  name,
  type: 'service',
  subType: 'websocket',
  label,
  defaultLedNumber: led,
  defaultData: data,
})

const quiz = (name: string, label: string, quizName: string): KioskDeviceCatalogEntry => ({
  name,
  type: 'service',
  subType: 'quiz',
  label,
  defaultLedNumber: 9,
  defaultData: {initialPlanId: 'personal', applicationId: 'wehealthy', quizName, dependencies: []},
})

const software = (name: string, label: string, data: Record<string, unknown> = {label: ''}): KioskDeviceCatalogEntry => ({
  name,
  type: 'software',
  subType: 'thirdparty',
  label,
  defaultLedNumber: null,
  defaultData: data,
})

export const KIOSK_DEVICE_CATALOG: readonly KioskDeviceCatalogEntry[] = [
  media('main_camera', 'video', 'Cámara principal', null),
  media('hd_camera', 'video', 'Cámara HD', 8),
  media('dermatoscope', 'video', 'Dermatoscopio', 9),
  media('otoscope', 'video', 'Otoscopio', 11),
  media('iriscope', 'video', 'Ojo', 11),
  media('auxiliar_video', 'video', 'Video auxiliar', 12),
  media('breathalyzer', 'video', 'Alcoholímetro', 1),
  media('toxicological_analysis', 'video', 'Análisis toxicológico', 1),
  media('main_microphone', 'audio', 'Micrófono principal', null),
  media('stethoscope', 'audio', 'Estetoscopio', 3),
  media('fetal_detector', 'audio', 'Detector fetal', 1),
  service('pulseoximeter', 'SpO2', 10),
  service('tensiometer', 'Tensión arterial', 7),
  service('scale', 'Balanza', 1),
  service('stadiometer', 'Estadiómetro', null),
  service('thermometer', 'Temperatura', 2),
  service('thermometer_exergen', 'Temperatura Exergen', 2),
  service('thermometer_bluetooth', 'Termómetro Bluetooth', 2),
  service('ecg', 'ECG', 2),
  service('ecg_berry', 'ECG Berry', 2),
  service('multiparametric_monitor', 'Monitoreo', 2),
  service('nutritional_scale', 'Balanza nutricional', 1, {label: 'BF600'}),
  service('dynamometer', 'Dinamómetro', 9),
  quiz('nutritional_quiz', 'Evaluación nutricional', 'nutrihome_cuestionario'),
  quiz('antecedents_quiz', 'Evaluación de antecedentes', 'nutrihome_antecedentes'),
  software('spirometer', 'Espirómetro', {
    label: '',
    softwareWindow: 'MIR Spiro 2.1.6',
    softwareExecutable: 'C:\\Program Files (x86)\\MIR spa Medical International Research\\MIR Spiro\\MIR Spiro.exe',
    resultsDir: 'C:\\MIR\\MirSpiro\\2x',
  }),
  software('optometry_evaluation', 'Evaluación oftalmológica'),
  software('ultrasound', 'Ecografía'),
]

export const DEVICE_TYPES = ['media', 'service', 'quiz', 'software'] as const
export const DEVICE_SUBTYPES: Record<(typeof DEVICE_TYPES)[number], readonly string[]> = {
  media: ['audio', 'video'],
  service: ['websocket', 'quiz'],
  quiz: ['quiz'],
  software: ['thirdparty'],
}

/** `type:subType` pairs rendered on screen instead of driving hardware: no label, no LED. */
export const SCREEN_ONLY_DEVICE_TYPES = new Set(['service:quiz', 'quiz:quiz', 'quiz:survey'])

/** Extra `data` keys per `type:subType`, mirroring backend-cabina's device schemas. */
export const DEVICE_DATA_FIELDS_BY_TYPE: Record<string, readonly string[]> = {
  'software:thirdparty': ['softwareWindow', 'softwareExecutable', 'resultsDir', 'configDir'],
  'service:quiz': ['initialPlanId', 'applicationId', 'quizName', 'dependencies'],
  'quiz:quiz': ['initialPlanId', 'applicationId', 'quizName', 'dependencies'],
}

export const deviceKindKey = (type?: string, subType?: string) => `${type ?? ''}:${subType ?? ''}`

export const kioskDeviceUsesLabel = (type?: string, subType?: string) => !SCREEN_ONLY_DEVICE_TYPES.has(deviceKindKey(type, subType))

export const findKioskDeviceCatalogEntry = (name?: string) => KIOSK_DEVICE_CATALOG.find((entry) => entry.name === (name ?? '').trim())

/** The stored device is a catalog entry only when name, type and subType all agree. */
export const matchKioskDeviceCatalogEntry = (device: {name?: string; type?: string; subType?: string}) => {
  const entry = findKioskDeviceCatalogEntry(device.name)
  return entry && entry.type === device.type && entry.subType === device.subType ? entry : undefined
}
