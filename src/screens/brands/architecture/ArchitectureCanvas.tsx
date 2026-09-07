import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type NodeChange,
  type NodeTypes,
  Panel,
  ReactFlow,
} from '@xyflow/react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {STRINGS} from '@/lib/strings'
import type {BrandArchitecture} from '@/types/brands'
import {buildGraph, type CanvasNode} from './buildGraph'
import {Legend} from './Legend'
import {InstitutionGroupNode} from './nodes/InstitutionGroupNode'
import {KioskNode} from './nodes/KioskNode'
import {ScheduleNode} from './nodes/ScheduleNode'

const nodeTypes: NodeTypes = {kiosk: KioskNode, schedule: ScheduleNode, institution: InstitutionGroupNode}

const MINIMAP_DEFAULT = 'color-mix(in oklch, var(--foreground) 45%, transparent)'
const MINIMAP_COLORS: Record<string, string> = {
  kiosk: MINIMAP_DEFAULT,
  schedule: 'color-mix(in oklch, var(--foreground) 25%, transparent)',
  institution: 'color-mix(in oklch, var(--foreground) 8%, transparent)',
}

/**
 * The architecture board: draggable cards on a dotted canvas with pan/zoom.
 * Positions come from `buildGraph` every time the payload changes and are kept
 * only in memory — dragging is for reading the diagram, not for saving a layout.
 */
export function ArchitectureCanvas({architecture}: {architecture: BrandArchitecture}) {
  const graph = useMemo(() => buildGraph(architecture), [architecture])
  const [nodes, setNodes] = useState<CanvasNode[]>(graph.nodes)

  useEffect(() => {
    setNodes(graph.nodes)
  }, [graph])

  const onNodesChange = useCallback((changes: NodeChange<CanvasNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current))
  }, [])

  return (
    <section
      className="architecture-canvas h-full w-full overflow-hidden rounded-xl ring-1 ring-foreground/10"
      aria-label={STRINGS.brands.canvasLabel}>
      <ReactFlow
        key={`${architecture.brand._id}:${architecture.generatedAt}`}
        nodes={nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView
        fitViewOptions={{padding: 0.18, maxZoom: 1}}
        minZoom={0.15}
        maxZoom={1.6}
        nodesConnectable={false}
        edgesFocusable={false}
        deleteKeyCode={null}
        panOnScroll
        zoomOnDoubleClick={false}>
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} />
        <Controls position="top-left" showInteractive={false} />
        <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => MINIMAP_COLORS[node.type ?? 'kiosk'] ?? MINIMAP_DEFAULT} />
        <Panel position="top-right" className="!m-3">
          <Legend />
        </Panel>
      </ReactFlow>
    </section>
  )
}
