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
  useReactFlow,
} from '@xyflow/react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {STRINGS} from '@/lib/strings'
import type {BrandArchitecture} from '@/types/brands'
import {buildGraph, type CanvasEdge, type CanvasNode} from './buildGraph'
import {CanvasSearch} from './CanvasSearch'
import {highlightedNodeIds, type SearchResult, searchNodes} from './searchNodes'
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

const DIM = 'canvas-dim'

/** Lives inside <ReactFlow> so it can drive the viewport; the search state itself belongs to the canvas. */
function CanvasSearchPanel({
  query,
  onQueryChange,
  results,
  total,
  onFocusResult,
}: {
  query: string
  onQueryChange: (query: string) => void
  results: SearchResult[]
  total: number
  onFocusResult: (id: string) => void
}) {
  const {fitView} = useReactFlow()

  const focus = (id: string) => {
    onFocusResult(id)
    void fitView({nodes: [{id}], duration: 500, maxZoom: 1.1, padding: 0.6})
  }

  const fitResults = () => {
    void fitView({nodes: results.map((result) => ({id: result.id})), duration: 500, maxZoom: 1, padding: 0.25})
  }

  return (
    <Panel position="top-center" className="!m-3 w-[min(440px,calc(100%-6.5rem))]">
      <CanvasSearch
        query={query}
        onQueryChange={onQueryChange}
        results={results}
        total={total}
        onFocusResult={focus}
        onFitResults={fitResults}
      />
    </Panel>
  )
}

/**
 * The architecture board: draggable cards on a dotted canvas with pan/zoom.
 * Positions come from `buildGraph` every time the payload changes and are kept
 * only in memory — dragging is for reading the diagram, not for saving a layout.
 */
export function ArchitectureCanvas({architecture}: {architecture: BrandArchitecture}) {
  const graph = useMemo(() => buildGraph(architecture), [architecture])
  const [nodes, setNodes] = useState<CanvasNode[]>(graph.nodes)
  const [query, setQuery] = useState('')

  useEffect(() => {
    setNodes(graph.nodes)
    setQuery('')
  }, [graph])

  const onNodesChange = useCallback((changes: NodeChange<CanvasNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current))
  }, [])

  const results = useMemo(() => searchNodes(nodes, query), [nodes, query])
  const searching = query.trim().length > 0

  const {displayNodes, displayEdges} = useMemo(() => {
    if (!searching) return {displayNodes: nodes, displayEdges: graph.edges}
    const lit = highlightedNodeIds(nodes, results)
    const displayNodes: CanvasNode[] = nodes.map((node) => ({...node, className: lit.has(node.id) ? undefined : DIM}) as CanvasNode)
    const displayEdges: CanvasEdge[] = graph.edges.map((edge) => ({
      ...edge,
      className: lit.has(edge.source) && lit.has(edge.target) ? undefined : DIM,
    }))
    return {displayNodes, displayEdges}
  }, [nodes, graph.edges, results, searching])

  const focusResult = useCallback((id: string) => {
    setNodes((current) => current.map((node) => ({...node, selected: node.id === id}) as CanvasNode))
  }, [])

  return (
    <section
      className="architecture-canvas h-full w-full overflow-hidden rounded-xl ring-1 ring-foreground/10"
      aria-label={STRINGS.brands.canvasLabel}>
      <ReactFlow
        key={`${architecture.brand._id}:${architecture.generatedAt}`}
        nodes={displayNodes}
        edges={displayEdges}
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
        <CanvasSearchPanel query={query} onQueryChange={setQuery} results={results} total={nodes.length} onFocusResult={focusResult} />
        {/* Bottom-left keeps the legend clear of the search results (top-center) and the minimap (bottom-right). */}
        <Panel position="bottom-left" className="!m-3">
          <Legend />
        </Panel>
      </ReactFlow>
    </section>
  )
}
