import {type Edge, MarkerType, type Node} from '@xyflow/react'
import {STRINGS} from '@/lib/strings'
import type {
  ArchitectureEdge,
  BrandArchitecture,
  EdgeAccount,
  InstitutionArchitectureNode,
  KioskArchitectureNode,
  KioskNodeData,
  ScheduleArchitectureNode,
  ScheduleNodeData,
} from '@/types/brands'

/** Data of the group node that wraps an institution's agendas (or the agendas without one). */
export type InstitutionGroupData = {
  _id: string | null
  name: string
  scheduleCount: number
  /** «Sin institución»: not a real institution, just the container for orphan agendas. */
  synthetic: boolean
}

export type KioskFlowNode = Node<KioskNodeData, 'kiosk'>
export type ScheduleFlowNode = Node<ScheduleNodeData, 'schedule'>
export type InstitutionFlowNode = Node<InstitutionGroupData, 'institution'>
export type CanvasNode = KioskFlowNode | ScheduleFlowNode | InstitutionFlowNode

export type EdgeData = {kind: ArchitectureEdge['kind']; via: EdgeAccount[]}
export type CanvasEdge = Edge<EdgeData, 'smoothstep'>

export interface CanvasGraph {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export const ORPHAN_GROUP_ID = 'institution:none'

/** Card widths are fixed by the node components; heights are estimates used only for the initial layout. */
export const SIZES = {
  kioskWidth: 288,
  scheduleWidth: 248,
  columnGap: 96,
  rowGap: 24,
  /** Gap between the columns of one kiosk/multi band when it wraps into a grid. */
  bandGap: 24,
  groupPadding: 16,
  groupHeader: 44,
  groupColumns: 2,
} as const

export function estimateKioskHeight(data: KioskNodeData): number {
  const rows = 2 + (data.linkedUsers.length > 0 ? 1 : 0)
  const badges = data.keyboardMode || data.assistantMode || data.deleted ? 22 : 0
  return 74 + badges + rows * 26
}

export function estimateScheduleHeight(data: ScheduleNodeData): number {
  const rows = 1 + (data.hasAvailability ? 1 : 0)
  return 72 + (data.specialty ? 18 : 0) + rows * 26
}

/** Cards per row for a kiosk/multi band: one column stays readable, big fleets wrap so the overview keeps a screen-like shape. */
export function bandColumns(count: number): number {
  if (count <= 6) return 1
  if (count <= 16) return 2
  return 3
}

interface BandLayout {
  width: number
  positions: Array<{x: number; y: number}>
}

/** Lays a band out top-to-bottom, wrapping into `bandColumns(n)` columns; each row is as tall as its tallest card. */
function layoutBand(heights: number[], x: number): BandLayout {
  const columns = bandColumns(heights.length)
  const positions: BandLayout['positions'] = []
  let y = 0
  for (let index = 0; index < heights.length; index += columns) {
    const row = heights.slice(index, index + columns)
    for (let col = 0; col < row.length; col++) {
      positions.push({x: x + col * (SIZES.kioskWidth + SIZES.bandGap), y})
    }
    y += Math.max(...row) + SIZES.rowGap
  }
  return {width: columns * SIZES.kioskWidth + (columns - 1) * SIZES.bandGap, positions}
}

interface GroupLayout {
  width: number
  height: number
  children: Array<{node: ScheduleArchitectureNode; position: {x: number; y: number}}>
}

/** Lays an institution's agendas out in a fixed-column grid; row height follows the tallest card in that row. */
function layoutGroup(schedules: ScheduleArchitectureNode[]): GroupLayout {
  const {groupColumns, groupPadding, groupHeader, scheduleWidth} = SIZES
  const columns = Math.min(groupColumns, Math.max(schedules.length, 1))
  const width = columns * scheduleWidth + (columns + 1) * groupPadding

  const children: GroupLayout['children'] = []
  let y = groupHeader + groupPadding
  for (let index = 0; index < schedules.length; index += columns) {
    const row = schedules.slice(index, index + columns)
    for (const [col, node] of row.entries()) {
      children.push({node, position: {x: groupPadding + col * (scheduleWidth + groupPadding), y}})
    }
    y += Math.max(...row.map((node) => estimateScheduleHeight(node.data))) + groupPadding
  }

  return {width, height: y, children}
}

const edgeLabel = (via: EdgeAccount[]) => STRINGS.brands.edge.accounts(via.length)

/**
 * Turns the backend payload into React Flow nodes and edges with a deterministic
 * column layout: multis | cabinas | institution groups (agendas inside); big
 * fleets wrap into a 2–3 column grid. The layout is a starting point for the admin to drag around; it is never persisted.
 */
export function buildGraph(architecture: BrandArchitecture): CanvasGraph {
  const kioskNodes = architecture.nodes.filter((node): node is KioskArchitectureNode => node.kind === 'kiosk' || node.kind === 'multi')
  const institutionNodes = architecture.nodes.filter((node): node is InstitutionArchitectureNode => node.kind === 'institution')
  const scheduleNodes = architecture.nodes.filter((node): node is ScheduleArchitectureNode => node.kind === 'schedule')

  const nodes: CanvasNode[] = []
  let x = 0

  for (const kind of ['multi', 'kiosk'] as const) {
    const items = kioskNodes.filter((node) => node.kind === kind)
    if (items.length === 0) continue

    const band = layoutBand(
      items.map((node) => estimateKioskHeight(node.data)),
      x,
    )
    items.forEach((node, index) => {
      nodes.push({id: node.id, type: 'kiosk', position: band.positions[index] ?? {x, y: 0}, data: node.data, draggable: true})
    })
    x += band.width + SIZES.columnGap
  }

  const schedulesByGroup = new Map<string, ScheduleArchitectureNode[]>()
  for (const node of scheduleNodes) {
    const groupId = node.parentId ?? ORPHAN_GROUP_ID
    schedulesByGroup.set(groupId, [...(schedulesByGroup.get(groupId) ?? []), node])
  }

  const groups: Array<{id: string; data: InstitutionGroupData; schedules: ScheduleArchitectureNode[]}> = institutionNodes
    .filter((institution) => schedulesByGroup.has(institution.id))
    .map((institution) => ({
      id: institution.id,
      data: {_id: institution.data._id, name: institution.data.name, scheduleCount: institution.data.scheduleCount, synthetic: false},
      schedules: schedulesByGroup.get(institution.id) ?? [],
    }))

  const orphans = schedulesByGroup.get(ORPHAN_GROUP_ID)
  if (orphans && orphans.length > 0) {
    groups.push({
      id: ORPHAN_GROUP_ID,
      data: {_id: null, name: STRINGS.brands.schedule.noInstitution, scheduleCount: orphans.length, synthetic: true},
      schedules: orphans,
    })
  }

  let y = 0
  for (const group of groups) {
    const layout = layoutGroup(group.schedules)
    // Parents must precede their children in the array for React Flow to resolve `parentId`.
    nodes.push({
      id: group.id,
      type: 'institution',
      position: {x, y},
      data: group.data,
      style: {width: layout.width, height: layout.height},
      draggable: true,
      selectable: false,
    })
    for (const child of layout.children) {
      nodes.push({
        id: child.node.id,
        type: 'schedule',
        position: child.position,
        parentId: group.id,
        extent: 'parent',
        data: child.node.data,
        draggable: true,
      })
    }
    y += layout.height + SIZES.rowGap
  }

  const edges: CanvasEdge[] = architecture.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    label: edgeLabel(edge.via),
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 4,
    labelStyle: {fontSize: 10.5, fill: 'var(--xy-edge-label-color)'},
    markerEnd: {type: MarkerType.ArrowClosed, width: 16, height: 16},
    data: {kind: edge.kind, via: edge.via},
  }))

  return {nodes, edges}
}
