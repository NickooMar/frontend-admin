import {describe, expect, it} from 'vitest'
import type {AdminKioskDetail} from '@/types/brands'
import {
  dataBodyFromDraft,
  deviceDraftFrom,
  deviceFromDraft,
  devicesBodyFromDraft,
  emptyDeviceDraft,
  examDraftFrom,
  examFromDraft,
  examsBodyFromDraft,
  paramsBodyFromDraft,
  paramsDraftFromDetail,
  versionBodyFromDraft,
  versionDraftFromDetail,
} from './kioskEditModel'

const detail = (extra: Partial<AdminKioskDetail> = {}): AdminKioskDetail => ({
  _id: 'k1',
  type: 'KIOSK',
  location: 'Cabina Norte',
  softwareVersion: {},
  devices: [],
  availableExams: [],
  params: {},
  ...extra,
})

describe('software versions', () => {
  it('lists the known keys first (required flagged) and stored extras after them', () => {
    const rows = versionDraftFromDetail(detail({softwareVersion: {frontend: 'dev', test: 'x', berry: 'dev'}}))

    expect(rows.slice(0, 3).map((row) => [row.key, row.value, row.required])).toEqual([
      ['backend', '', true],
      ['frontend', 'dev', true],
      ['berry', 'dev', true],
    ])
    expect(rows.find((row) => row.key === 'test')).toMatchObject({value: 'x', known: false, required: false})
  })

  it('requires backend, frontend and berry, drops empty values and validates extra keys', () => {
    const rows = versionDraftFromDetail(detail({softwareVersion: {frontend: 'dev'}}))
    expect(versionBodyFromDraft(rows)).toEqual({error: 'Completá las versiones obligatorias: backend, berry.'})

    const filled = rows.map((row) => (row.required ? {...row, value: row.value || 'dev'} : row))
    expect(versionBodyFromDraft([...filled, {key: 'keyboard', value: '', required: false, known: true}])).toEqual({
      body: {softwareVersion: {backend: 'dev', frontend: 'dev', berry: 'dev'}},
    })
    expect(versionBodyFromDraft([...filled, {key: 'nuevo comp', value: '1', required: false, known: false}])).toEqual({
      error: 'Cada componente necesita un nombre único, sin espacios.',
    })
    expect(versionBodyFromDraft([...filled, {key: 'custom', value: ' 1.2 ', required: false, known: false}])).toMatchObject({
      body: {softwareVersion: {custom: '1.2'}},
    })
  })
})

describe('devices', () => {
  it('round-trips a catalog device, keeping an empty label and parsing the LED', () => {
    const draft = deviceDraftFrom(
      {
        type: 'media',
        subType: 'video',
        name: 'hd_camera',
        nameToShow: 'Cámara HD',
        ledNumber: 8,
        isEnabled: true,
        data: {label: ''},
        videoAnalysis: true,
        analysisContext: 'piel',
      },
      'hd_camera',
    )
    expect(draft).toMatchObject({catalog: 'hd_camera', ledNumber: '8', data: {label: ''}, videoAnalysis: true})

    expect(deviceFromDraft(draft)).toEqual({
      type: 'media',
      subType: 'video',
      name: 'hd_camera',
      nameToShow: 'Cámara HD',
      isEnabled: true,
      data: {label: ''},
      ledNumber: 8,
      videoAnalysis: true,
      analysisContext: 'piel',
    })
    expect(deviceFromDraft({...draft, ledNumber: ''}).ledNumber).toBeNull()
  })

  it('drops label and LED for screen-only devices and splits quiz dependencies', () => {
    const quiz = deviceDraftFrom(
      {
        type: 'service',
        subType: 'quiz',
        name: 'nutritional_quiz',
        nameToShow: 'Evaluación',
        isEnabled: true,
        data: {quizName: 'q', dependencies: ['a', 'b'], applicationId: 'wehealthy', initialPlanId: 'personal'},
      },
      'nutritional_quiz',
    )
    expect(quiz.data.dependencies).toBe('a, b')

    const device = deviceFromDraft({...quiz, data: {...quiz.data, dependencies: 'a, c ,, d', label: 'ignored'}})
    expect(device.data).toEqual({initialPlanId: 'personal', applicationId: 'wehealthy', quizName: 'q', dependencies: ['a', 'c', 'd']})
    expect('ledNumber' in device).toBe(false)
    expect('videoAnalysis' in device).toBe(false)
  })

  it('rejects incomplete devices with their position', () => {
    const ok = deviceDraftFrom({type: 'service', subType: 'websocket', name: 'ecg', nameToShow: 'ECG', isEnabled: true}, 'ecg')
    expect(devicesBodyFromDraft([ok, emptyDeviceDraft()])).toEqual({
      error: 'El dispositivo 2 necesita tipo, subtipo, nombre y nombre a mostrar.',
    })
    expect(devicesBodyFromDraft([ok])).toMatchObject({body: {devices: [{name: 'ecg', ledNumber: null, data: {label: ''}}]}})
  })
})

describe('available exams', () => {
  it('normalizes the type, omits empty optionals and strips signed urls from instructions', () => {
    const draft = examDraftFrom(
      {
        type: 'ecg',
        name: ' Electro ',
        subtype: '',
        devices: ['ecg', 'ecg', ' '],
        instructions: [
          {id: 'i1', title: 't', description: 'd', image: {key: 'k', bucket: 'b', url: 'https://signed'}},
          {id: 'i2', title: 'no image'},
        ],
      },
      true,
    )
    expect(draft.devices).toEqual(['ecg'])

    expect(examFromDraft({...draft, type: 'ecg berry!'})).toEqual({
      type: 'ECGBERRY',
      name: 'Electro',
      devices: ['ecg'],
      instructions: [{id: 'i1', title: 't', description: 'd', image: {key: 'k', bucket: 'b'}}],
    })
    expect(examFromDraft({...draft, subtype: 'AI_ASSISTED', customPrompt: ' mirar la piel '})).toMatchObject({
      subtype: 'AI_ASSISTED',
      customPrompt: 'mirar la piel',
    })
  })

  it('rejects exams without type, name or devices', () => {
    const valid = examDraftFrom({type: 'SKIN', name: 'Piel', devices: ['dermatoscope']}, true)
    expect(examsBodyFromDraft([valid, {...valid, devices: []}])).toEqual({
      error: 'El examen 2 necesita tipo, nombre y al menos un dispositivo.',
    })
    expect(examsBodyFromDraft([valid])).toEqual({body: {availableExams: [{type: 'SKIN', name: 'Piel', devices: ['dermatoscope']}]}})
  })
})

describe('params', () => {
  it('completes a sparse kiosk from the platform defaults and keeps stored values', () => {
    const draft = paramsDraftFromDetail(
      detail({
        params: {
          keyboardMode: true,
          ecg: {config: {stillHereStart: 90}},
          multiparametricMonitor: {config: {SPO2: {min: 90, max: 99, isAlarmActive: true, switchOn: false}}},
        },
      }),
    )

    expect(draft.keyboardMode).toBe(true)
    expect(draft.assistantMode).toBe(false)
    expect(draft.ecg.stillHereStart).toBe(90)
    expect(draft.ecg.stillHerePeriod).toBe(60)
    expect(draft.ecg.filter.frec).toEqual({active: false, value: 'z'})
    expect(draft.monitor.config.SPO2).toEqual({min: 90, max: 99, isAlarmActive: true, switchOn: false})
    expect(draft.monitor.config.NIBP.minSys).toBe(90)
    expect(draft.networkQuality.intervalMs).toBe(30000)
  })

  it('builds the full params body the backend requires and refuses NaN numbers', () => {
    const draft = paramsDraftFromDetail(detail())
    const result = paramsBodyFromDraft({...draft, assistantMode: true})
    expect('body' in result && result.body.params).toMatchObject({
      ecg: {config: {stillHereStart: 120, filter: {muscle: {active: false, value: 1}}}},
      multiparametricMonitor: {showInstructions: false, alarmInterval: 1, config: {NIBP: {measureInterval: 1}}},
      networkQuality: {enabled: false, maxLatencyMs: 150},
      keyboardMode: false,
      assistantMode: true,
    })

    expect(paramsBodyFromDraft({...draft, networkQuality: {...draft.networkQuality, intervalMs: Number.NaN}})).toEqual({
      error: 'Todos los valores numéricos deben ser números válidos.',
    })
  })
})

describe('data', () => {
  it('requires a location and passes type and status through', () => {
    expect(dataBodyFromDraft({location: '  ', type: 'KIOSK', status: 'AVAILABLE'})).toEqual({error: 'La ubicación es obligatoria.'})
    expect(dataBodyFromDraft({location: ' Norte ', type: 'MULTI', status: 'DISABLED'})).toEqual({
      body: {location: 'Norte', type: 'MULTI', status: 'DISABLED'},
    })
  })
})
