import {describe, expect, it} from 'vitest'
import type {BrandArchitecture, KioskNodeData, ScheduleNodeData} from '@/types/brands'
import {bandColumns, buildGraph, ORPHAN_GROUP_ID, SIZES} from './buildGraph'

const kiosk = (id: string, type: KioskNodeData['type'], extra: Partial<KioskNodeData> = {}): KioskNodeData => ({
  _id: id,
  type,
  location: `Ubicación ${id}`,
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

const schedule = (id: string, institution: ScheduleNodeData['institution'], extra: Partial<ScheduleNodeData> = {}): ScheduleNodeData => ({
  _id: id,
  name: `Agenda ${id}`,
  institution,
  specialty: null,
  colorPalette: null,
  isUrgencyDefault: false,
  deleted: false,
  hasAvailability: false,
  linkedUserCount: 0,
  ...extra,
})

const architecture: BrandArchitecture = {
  brand: {_id: 'b1', name: 'Alpha', domainName: null, alternateDomains: [], databaseName: 'diagnostica-alpha', active: true},
  summary: {kiosks: 1, multis: 1, schedules: 4, institutions: 1, linkedUsers: 1, edges: 1},
  nodes: [
    {
      id: 'kiosk:k1',
      kind: 'kiosk',
      data: kiosk('k1', 'KIOSK', {
        linkedUsers: [{_id: 'u1', email: 'a@x', name: 'A', role: 'kiosk', isStationAccount: true, scheduleCount: 1}],
      }),
    },
    {id: 'kiosk:m1', kind: 'multi', data: kiosk('m1', 'MULTI')},
    {id: 'institution:i1', kind: 'institution', data: {_id: 'i1', name: 'Hospital', scheduleCount: 3}},
    {id: 'schedule:s1', kind: 'schedule', parentId: 'institution:i1', data: schedule('s1', {_id: 'i1', name: 'Hospital'})},
    {
      id: 'schedule:s2',
      kind: 'schedule',
      parentId: 'institution:i1',
      data: schedule('s2', {_id: 'i1', name: 'Hospital'}, {specialty: 'cardio'}),
    },
    {id: 'schedule:s3', kind: 'schedule', parentId: 'institution:i1', data: schedule('s3', {_id: 'i1', name: 'Hospital'})},
    {id: 'schedule:s4', kind: 'schedule', data: schedule('s4', null)},
  ],
  edges: [
    {
      id: 'edge:kiosk:k1->schedule:s1',
      source: 'kiosk:k1',
      target: 'schedule:s1',
      kind: 'user-schedule-access',
      via: [
        {
          userId: 'u1',
          email: 'a@x',
          name: 'A',
          role: 'kiosk',
          isStationAccount: true,
          permissions: {view: true, createAndUpdate: true, startAttention: true},
        },
      ],
    },
  ],
  includeDeleted: false,
  generatedAt: '2026-09-07T12:00:00.000Z',
}

describe('buildGraph', () => {
  it('lays multis, cabinas and institution groups out in columns from left to right', () => {
    const {nodes} = buildGraph(architecture)
    const byId = Object.fromEntries(nodes.map((node) => [node.id, node]))

    const multi = byId['kiosk:m1']
    const cabina = byId['kiosk:k1']
    const hospital = byId['institution:i1']
    expect(multi?.type).toBe('kiosk')
    expect(multi?.position.x).toBe(0)
    expect(cabina?.position.x).toBe(SIZES.kioskWidth + SIZES.columnGap)
    expect(hospital?.position.x).toBe(2 * (SIZES.kioskWidth + SIZES.columnGap))
    expect(hospital?.type).toBe('institution')
    expect(hospital?.style).toMatchObject({width: 2 * SIZES.scheduleWidth + 3 * SIZES.groupPadding})
  })

  it('nests agendas inside their institution group, parents first, with relative positions', () => {
    const {nodes} = buildGraph(architecture)
    const ids = nodes.map((node) => node.id)

    expect(ids.indexOf('institution:i1')).toBeLessThan(ids.indexOf('schedule:s1'))

    const s1 = nodes.find((node) => node.id === 'schedule:s1')
    const s2 = nodes.find((node) => node.id === 'schedule:s2')
    const s3 = nodes.find((node) => node.id === 'schedule:s3')
    expect(s1).toMatchObject({type: 'schedule', parentId: 'institution:i1', extent: 'parent'})
    // Two columns: s1 and s2 share the first row, s3 wraps to the second one.
    expect(s1?.position).toEqual({x: SIZES.groupPadding, y: SIZES.groupHeader + SIZES.groupPadding})
    expect(s2?.position.x).toBe(SIZES.groupPadding + SIZES.scheduleWidth + SIZES.groupPadding)
    expect(s2?.position.y).toBe(s1?.position.y)
    expect(s3?.position.x).toBe(SIZES.groupPadding)
    expect(s3?.position.y ?? 0).toBeGreaterThan(s1?.position.y ?? 0)
  })

  it('collects agendas without an institution under a synthetic «Sin institución» group', () => {
    const {nodes} = buildGraph(architecture)

    const orphanGroup = nodes.find((node) => node.id === ORPHAN_GROUP_ID)
    expect(orphanGroup?.type).toBe('institution')
    expect(orphanGroup?.data).toMatchObject({synthetic: true, name: 'Sin institución', scheduleCount: 1})
    expect(nodes.find((node) => node.id === 'schedule:s4')?.parentId).toBe(ORPHAN_GROUP_ID)

    // Groups stack vertically in the same column.
    const hospital = nodes.find((node) => node.id === 'institution:i1')
    expect(orphanGroup?.position.x).toBe(hospital?.position.x)
    expect(orphanGroup?.position.y ?? 0).toBeGreaterThan(hospital?.position.y ?? 0)
  })

  it('maps edges to dashed smoothstep connections labelled with the account count', () => {
    const {edges} = buildGraph(architecture)

    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({
      id: 'edge:kiosk:k1->schedule:s1',
      source: 'kiosk:k1',
      target: 'schedule:s1',
      type: 'smoothstep',
      label: '1 cuenta',
    })
    expect(edges[0]?.data?.via[0]?.email).toBe('a@x')
  })

  it('skips empty columns and copes with a brand that has no institutions', () => {
    const onlyMultis: BrandArchitecture = {
      ...architecture,
      nodes: [
        {id: 'kiosk:m1', kind: 'multi', data: kiosk('m1', 'MULTI')},
        {id: 'schedule:s4', kind: 'schedule', data: schedule('s4', null)},
      ],
      edges: [],
    }

    const {nodes, edges} = buildGraph(onlyMultis)
    expect(nodes.find((node) => node.id === 'kiosk:m1')?.position.x).toBe(0)
    expect(nodes.find((node) => node.id === ORPHAN_GROUP_ID)?.position.x).toBe(SIZES.kioskWidth + SIZES.columnGap)
    expect(edges).toEqual([])
    expect(buildGraph({...architecture, nodes: [], edges: []})).toEqual({nodes: [], edges: []})
  })
})

describe('bandColumns', () => {
  it('keeps small fleets in one column and wraps big ones into a grid', () => {
    expect([1, 6, 7, 16, 17, 60].map(bandColumns)).toEqual([1, 1, 2, 2, 3, 3])

    const many: BrandArchitecture = {
      ...architecture,
      nodes: Array.from({length: 8}, (_, index) => ({id: `kiosk:m${index}`, kind: 'multi' as const, data: kiosk(`m${index}`, 'MULTI')})),
      edges: [],
    }
    const {nodes} = buildGraph(many)
    const xs = new Set(nodes.map((node) => node.position.x))
    expect(xs).toEqual(new Set([0, SIZES.kioskWidth + SIZES.bandGap]))
    expect(nodes[0]?.position).toEqual({x: 0, y: 0})
    expect(nodes[1]?.position).toEqual({x: SIZES.kioskWidth + SIZES.bandGap, y: 0})
    expect(nodes[2]?.position.y ?? 0).toBeGreaterThan(0)
  })
})
