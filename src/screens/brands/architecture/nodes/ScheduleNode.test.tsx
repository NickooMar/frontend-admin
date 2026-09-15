import {type NodeProps, ReactFlowProvider} from '@xyflow/react'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import type {ScheduleAction, ScheduleNodeData} from '@/types/brands'
import {ScheduleActionsContext} from '../../canvasActions'
import type {ScheduleFlowNode} from '../buildGraph'
import {ScheduleNode} from './ScheduleNode'

const data = (extra: Partial<ScheduleNodeData> = {}): ScheduleNodeData => ({
  _id: 's1',
  name: 'Agenda Cardiología',
  institution: null,
  specialty: null,
  colorPalette: null,
  isUrgencyDefault: false,
  deleted: false,
  hasAvailability: false,
  linkedUserCount: 2,
  ...extra,
})

const renderNode = (schedule: ScheduleNodeData, onAction: (_action: ScheduleAction, _schedule: ScheduleNodeData) => void = () => {}) =>
  render(
    <ReactFlowProvider>
      <ScheduleActionsContext.Provider value={onAction}>
        <ScheduleNode {...({data: schedule, selected: false} as unknown as NodeProps<ScheduleFlowNode>)} />
      </ScheduleActionsContext.Provider>
    </ReactFlowProvider>,
  )

describe('ScheduleNode', () => {
  it('raises the delete action from the card menu', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    renderNode(data(), onAction)

    await user.click(screen.getByRole('button', {name: /Acciones Agenda Cardiología/}))
    await user.click(await screen.findByRole('menuitem', {name: 'Eliminar'}))

    expect(onAction).toHaveBeenCalledWith('delete', expect.objectContaining({_id: 's1'}))
  })

  it('offers no menu on an agenda that is already deleted', () => {
    renderNode(data({deleted: true}))

    expect(screen.queryByRole('button', {name: /Acciones/})).not.toBeInTheDocument()
    expect(screen.getByText('Eliminada')).toBeInTheDocument()
  })
})
