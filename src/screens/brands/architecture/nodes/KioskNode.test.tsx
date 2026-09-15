import {type NodeProps, ReactFlowProvider} from '@xyflow/react'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {ActiveSessionSummary, KioskAction, KioskNodeData} from '@/types/brands'
import {KioskActionsContext} from '../../canvasActions'
import type {KioskFlowNode} from '../buildGraph'
import {KioskNode} from './KioskNode'

const NOW = new Date('2026-09-08T18:20:00.000Z')

const data = (extra: Partial<KioskNodeData> = {}): KioskNodeData => ({
  _id: 'k1',
  type: 'MULTI',
  location: 'Multi Ambiente Local Nicolas',
  status: 'IN_USE',
  connected: true,
  lastConnected: null,
  lastDisconnected: null,
  deleted: false,
  keyboardMode: false,
  assistantMode: false,
  softwareVersion: {frontend: null, backend: null},
  examCount: 27,
  examNames: [],
  linkedUsers: [],
  activeSession: null,
  ...extra,
})

const session = (extra: Partial<ActiveSessionSummary> = {}): ActiveSessionSummary => ({
  _id: 's1',
  type: 'MULTI',
  startDate: '2026-09-08T18:02:36.000Z',
  patientEnteredAt: null,
  patient: {_id: 'p1', name: 'Nicolas Marsili', idType: 'dni', idValue: '43717722', unidentified: false},
  videoVisit: null,
  ...extra,
})

/** `KioskNode` only reads `data`, but its `Handle` needs the flow store and the prop type demands the whole node. */
const renderNode = (kiosk: KioskNodeData, onAction: (_action: KioskAction, _kiosk: KioskNodeData) => void = () => {}) =>
  render(
    <ReactFlowProvider>
      <KioskActionsContext.Provider value={onAction}>
        <KioskNode {...({data: kiosk, selected: false} as unknown as NodeProps<KioskFlowNode>)} />
      </KioskActionsContext.Provider>
    </ReactFlowProvider>,
  )

describe('KioskNode', () => {
  afterEach(() => vi.useRealTimers())

  it('shows nothing about a session when the kiosk is idle', () => {
    renderNode(data({status: 'AVAILABLE'}))

    expect(screen.getByText('Conectada · Disponible')).toBeInTheDocument()
    expect(screen.queryByText(/Marsili/)).not.toBeInTheDocument()
    expect(screen.queryByText(/videoconsulta/i)).not.toBeInTheDocument()
  })

  it('names the patient in the current session and how long they have been in it', () => {
    vi.setSystemTime(NOW)
    renderNode(data({activeSession: session()}))

    expect(screen.getByText('Nicolas Marsili')).toBeInTheDocument()
    expect(screen.getByText('hace 17 minutos')).toBeInTheDocument()
    // The document stays in the tooltip so the row keeps the name readable at 288px.
    expect(screen.getByTitle(/DNI 43717722/)).toBeInTheDocument()
  })

  it('measures the wait from the moment the patient was admitted, not from the session start', () => {
    vi.setSystemTime(NOW)
    renderNode(data({activeSession: session({patientEnteredAt: '2026-09-08T18:18:00.000Z'})}))

    expect(screen.getByText('hace 2 minutos')).toBeInTheDocument()
  })

  it('marks the anonymous record a multi creates instead of printing it as a name', () => {
    renderNode(data({activeSession: session({patient: {_id: 'p2', name: '', idType: 'nn', idValue: 'g2ujp', unidentified: true}})}))

    expect(screen.getByText('Paciente sin identificar')).toBeInTheDocument()
    expect(screen.queryByText(/g2ujp/)).not.toBeInTheDocument()
  })

  it('separates waiting for a professional from being in the call', () => {
    const waiting = renderNode(
      data({activeSession: session({videoVisit: {_id: 'v1', status: 'PENDING', startDate: null, professional: null}})}),
    )
    expect(screen.getByText('Esperando profesional')).toBeInTheDocument()
    waiting.unmount()

    renderNode(
      data({
        activeSession: session({
          videoVisit: {
            _id: 'v1',
            status: 'ACCEPTED',
            startDate: '2026-09-08T18:10:00.000Z',
            professional: {fullName: 'Paula Fernández', enrollment: 'MP - Santa Fe 6365436'},
          },
        }),
      }),
    )
    expect(screen.getByText('En videoconsulta')).toBeInTheDocument()
    expect(screen.getByText('con Paula Fernández')).toBeInTheDocument()
  })

  it('raises the delete action from the card menu, and hides it on an already deleted card', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    const open = renderNode(data(), onAction)

    await user.click(screen.getByRole('button', {name: /Acciones/}))
    await user.click(await screen.findByRole('menuitem', {name: 'Eliminar'}))
    expect(onAction).toHaveBeenCalledWith('delete', expect.objectContaining({_id: 'k1'}))
    open.unmount()

    renderNode(data({deleted: true}), onAction)
    await user.click(screen.getByRole('button', {name: /Acciones/}))
    expect(screen.queryByRole('menuitem', {name: 'Eliminar'})).not.toBeInTheDocument()
  })
})
