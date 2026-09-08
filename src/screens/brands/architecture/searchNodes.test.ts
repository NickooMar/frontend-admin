import {describe, expect, it} from 'vitest'
import type {BrandArchitecture, KioskNodeData, ScheduleNodeData} from '@/types/brands'
import {buildGraph, ORPHAN_GROUP_ID} from './buildGraph'
import {highlightedNodeIds, normalizeText, searchNodes} from './searchNodes'

const kiosk = (id: string, type: KioskNodeData['type'], location: string, extra: Partial<KioskNodeData> = {}): KioskNodeData => ({
  _id: id,
  type,
  location,
  status: 'AVAILABLE',
  connected: false,
  lastConnected: null,
  lastDisconnected: null,
  deleted: false,
  keyboardMode: false,
  assistantMode: false,
  softwareVersion: {frontend: null, backend: null},
  examCount: 0,
  examNames: [],
  linkedUsers: [],
  ...extra,
})

const schedule = (
  id: string,
  name: string,
  institution: ScheduleNodeData['institution'],
  extra: Partial<ScheduleNodeData> = {},
): ScheduleNodeData => ({
  _id: id,
  name,
  institution,
  specialty: null,
  colorPalette: null,
  isUrgencyDefault: false,
  deleted: false,
  hasAvailability: false,
  linkedUserCount: 0,
  ...extra,
})

const hospital = {_id: 'i1', name: 'Hospital Central'}

const architecture: BrandArchitecture = {
  brand: {_id: 'b1', name: 'Alpha', domainName: null, alternateDomains: [], databaseName: null, active: true},
  summary: {kiosks: 2, multis: 1, schedules: 3, institutions: 1, linkedUsers: 1, edges: 0},
  nodes: [
    {
      id: 'kiosk:k1',
      kind: 'kiosk',
      data: kiosk('k1', 'KIOSK', 'Cabina Norte', {
        examNames: ['Electrocardiograma'],
        linkedUsers: [
          {_id: 'u1', email: 'cabina.norte@x.com', name: 'Cabina Norte', role: 'kiosk', isStationAccount: true, scheduleCount: 0},
        ],
      }),
    },
    {id: 'kiosk:k2', kind: 'kiosk', data: kiosk('k2', 'KIOSK', 'Cabina Sur')},
    {id: 'kiosk:m1', kind: 'multi', data: kiosk('m1', 'MULTI', 'Maletín Antártida')},
    {id: 'institution:i1', kind: 'institution', data: {_id: 'i1', name: 'Hospital Central', scheduleCount: 2}},
    {
      id: 'schedule:s1',
      kind: 'schedule',
      parentId: 'institution:i1',
      data: schedule('s1', 'Agenda Cardiología', hospital, {specialty: 'cardio'}),
    },
    {id: 'schedule:s2', kind: 'schedule', parentId: 'institution:i1', data: schedule('s2', 'Agenda Pediatría', hospital)},
    {id: 'schedule:s3', kind: 'schedule', data: schedule('s3', 'Guardia', null)},
  ],
  edges: [],
  includeDeleted: false,
  generatedAt: '2026-09-07T12:00:00.000Z',
}

const nodes = buildGraph(architecture).nodes
const ids = (query: string) => searchNodes(nodes, query).map((result) => result.id)

describe('searchNodes', () => {
  it('normalizes accents and case', () => {
    expect(normalizeText('  Agénda CARDIOLOGÍA ')).toBe('agenda cardiologia')
  })

  it('matches locations, agenda names and institution names ignoring accents', () => {
    expect(ids('cabina')).toEqual(['kiosk:k1', 'kiosk:k2'])
    expect(ids('MALETIN')).toEqual(['kiosk:m1'])
    expect(ids('pediatria')).toEqual(['schedule:s2'])
    expect(ids('hospital')).toEqual(['institution:i1', 'schedule:s1', 'schedule:s2'])
  })

  it('matches kinds, linked accounts, exams and specialties', () => {
    expect(ids('multi')).toEqual(['kiosk:m1'])
    expect(ids('agenda')).toEqual(['schedule:s1', 'schedule:s2', 'schedule:s3'])
    expect(ids('norte@x.com')).toEqual(['kiosk:k1'])
    expect(ids('electro')).toEqual(['kiosk:k1'])
    // The cabina matches too: its exam is «Electrocardiograma».
    expect(ids('cardio')).toEqual(['kiosk:k1', 'schedule:s1'])
  })

  it('describes results with a kind, label and detail, and returns nothing for a blank query', () => {
    const [cardio] = searchNodes(nodes, 'cardiologia')
    expect(cardio).toEqual({id: 'schedule:s1', kind: 'schedule', label: 'Agenda Cardiología', detail: 'Hospital Central'})

    const [multi] = searchNodes(nodes, 'antartida')
    expect(multi).toMatchObject({kind: 'multi', label: 'Maletín Antártida', detail: 'Multi'})

    const [institution] = searchNodes(nodes, 'hospital')
    expect(institution).toMatchObject({kind: 'institution', detail: '2 agendas'})

    expect(searchNodes(nodes, '   ')).toEqual([])
    expect(ids('zzz')).toEqual([])
  })

  it('keeps the group of a matching agenda lit, and the agendas of a matching institution', () => {
    const onlyPediatria = highlightedNodeIds(nodes, searchNodes(nodes, 'pediatria'))
    expect([...onlyPediatria].sort()).toEqual(['institution:i1', 'schedule:s2'])

    const wholeHospital = highlightedNodeIds(nodes, searchNodes(nodes, 'hospital'))
    expect([...wholeHospital].sort()).toEqual(['institution:i1', 'schedule:s1', 'schedule:s2'])

    const guardia = highlightedNodeIds(nodes, searchNodes(nodes, 'guardia'))
    expect([...guardia].sort()).toEqual([ORPHAN_GROUP_ID, 'schedule:s3'])

    expect(highlightedNodeIds(nodes, []).size).toBe(0)
  })
})
