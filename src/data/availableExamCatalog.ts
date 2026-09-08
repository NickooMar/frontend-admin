/**
 * Exams a cabin/station can offer. Mirrors
 * `frontend-diagnostica/src/data/availableExamCatalog.ts`; `type` is what the
 * platform switches on, `devices` are catalog device names.
 */
export interface AvailableExamCatalogEntry {
  type: string
  label: string
  devices: readonly string[]
  subtype?: string
}

export const AVAILABLE_EXAM_CATALOG: readonly AvailableExamCatalogEntry[] = [
  {type: 'SKIN', label: 'Piel', devices: ['dermatoscope', 'hd_camera']},
  {type: 'EAR', label: 'Oído', devices: ['otoscope']},
  {type: 'LUNGS', label: 'Pulmones', devices: ['stethoscope']},
  {type: 'THROAT', label: 'Garganta', devices: ['hd_camera']},
  {type: 'WEIGHT_HEIGHT', label: 'Peso y altura', devices: ['scale']},
  {type: 'TEMPERATURE', label: 'Temperatura', devices: ['thermometer']},
  {type: 'SPO2', label: 'Saturación y ritmo cardíaco', devices: ['pulseoximeter']},
  {type: 'BLOOD_PRESSURE', label: 'Tensión arterial', devices: ['tensiometer']},
  {type: 'EYE', label: 'Ojos', devices: ['iriscope']},
  {type: 'ECG', label: 'Electrocardiograma', devices: ['ecg']},
  {type: 'MULTIPARAMETRIC_MONITOR', label: 'Monitor multiparamétrico', devices: ['multiparametric_monitor']},
  {type: 'AUXILIAR_VIDEO', label: 'Video auxiliar', devices: ['auxiliar_video']},
  {type: 'ECG_BERRY', label: 'Electrocardiograma Berry', devices: ['ecg_berry']},
  {type: 'TEMPERATURE_EXERGEN', label: 'Temperatura Exergen', devices: ['thermometer_exergen']},
  {type: 'ULTRASOUND', label: 'Ultrasonido', devices: ['ultrasound']},
  {type: 'DISPENSER', label: 'Dispensador', devices: ['dispenser']},
  {type: 'QUIZ', label: 'Cuestionario', devices: ['nutritional_quiz']},
  {type: 'BODY_COMPOSITION', label: 'Composición corporal', devices: ['nutritional_scale', 'stadiometer']},
  {type: 'SPIROMETER', label: 'Espirometría', devices: ['spirometer']},
  {type: 'ECG_ECOSUR', label: 'Electrocardiograma Ecosur', devices: ['electrocardiogram_berry']},
  {type: 'ANTECEDENTS_QUIZ', label: 'Cuestionario de antecedentes', devices: ['antecedents_quiz']},
  {type: 'FETAL_DETECTOR', label: 'Detector fetal', devices: ['fetal_detector']},
  {type: 'OPTOMETRY_EVALUATION', label: 'Evaluación optométrica', devices: ['optometry_evaluation']},
  {type: 'BREATHALYZER', label: 'Alcoholímetro', devices: ['hd_camera'], subtype: 'AI_ASSISTED'},
  {type: 'TOXICOLOGICAL_ANALYSIS', label: 'Análisis toxicológico', devices: ['hd_camera'], subtype: 'AI_ASSISTED'},
  {type: 'VITAL_PROFILE', label: 'Perfil vital', devices: ['vital_profile']},
  {type: 'DYNAMOMETER', label: 'Dinamómetro', devices: ['dynamometer']},
  {type: 'TEMPERATURE_BLUETOOTH', label: 'Temperatura Bluetooth', devices: ['thermometer_bluetooth']},
]

export const AVAILABLE_EXAM_SUBTYPES = ['AI_ASSISTED', 'IMAGE_CAPTURE'] as const

export const AVAILABLE_EXAM_LIMITS = {type: 25, subtype: 30, name: 30, customPrompt: 2000} as const

/** Device names the exam form offers, beyond the kiosk's own devices. */
export const AVAILABLE_EXAM_DEVICE_OPTIONS: readonly string[] = [...new Set(AVAILABLE_EXAM_CATALOG.flatMap((exam) => exam.devices))].sort(
  (a, b) => a.localeCompare(b),
)

export const findAvailableExamCatalogEntry = (type?: string) => AVAILABLE_EXAM_CATALOG.find((exam) => exam.type === (type ?? '').trim())

/** `type` is upper-case `[A-Z0-9_]`, like the brand panel enforces. */
export const normalizeExamType = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '')
    .slice(0, AVAILABLE_EXAM_LIMITS.type)
