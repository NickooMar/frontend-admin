import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {adminBrandsService} from '@/services/adminBrandsService'
import type {AdminBrandSummary, KioskNodeData, ScheduleNodeData} from '@/types/brands'
import {DeleteResourceDialog, type DeletionTarget, deletionImpact} from './DeleteResourceDialog'

vi.mock('@/services/adminBrandsService', () => ({
  adminBrandsService: {deleteKiosk: vi.fn(), deleteSchedule: vi.fn()},
}))

const brand: AdminBrandSummary = {
  _id: 'b1',
  name: 'Alpha',
  domainName: null,
  alternateDomains: [],
  databaseName: 'diagnostica-alpha',
  active: true,
  tenant: {available: true},
}

const kiosk = (extra: Partial<KioskNodeData> = {}): KioskNodeData => ({
  _id: 'k1',
  type: 'KIOSK',
  location: 'Cabina Norte',
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
  activeSession: null,
  ...extra,
})

const schedule = (extra: Partial<ScheduleNodeData> = {}): ScheduleNodeData => ({
  _id: 's1',
  name: 'Agenda Cardiología',
  institution: null,
  specialty: null,
  colorPalette: null,
  isUrgencyDefault: false,
  deleted: false,
  hasAvailability: false,
  linkedUserCount: 0,
  ...extra,
})

const renderDialog = (target: DeletionTarget, onDeleted = vi.fn()) => {
  render(<DeleteResourceDialog target={target} brand={brand} onClose={vi.fn()} onDeleted={onDeleted} />)
  return {onDeleted, submit: screen.getByRole('button', {name: /Eliminar definitivamente/})}
}

describe('deletionImpact', () => {
  it('lists only what the resource actually has', () => {
    expect(deletionImpact({kind: 'kiosk', kiosk: kiosk()})).toEqual([])
    expect(
      deletionImpact({
        kind: 'kiosk',
        kiosk: kiosk({
          examCount: 7,
          linkedUsers: [{_id: 'u1', email: 'a@x', name: 'A', role: 'kiosk', isStationAccount: true, scheduleCount: 0}],
          activeSession: {_id: 'x', type: 'KIOSK', startDate: null, patientEnteredAt: null, patient: null, videoVisit: null},
        }),
      }),
    ).toEqual(['Hay una sesión en curso en esta cabina', '7 exámenes configurados', '1 cuenta de estación asociada'])

    expect(deletionImpact({kind: 'schedule', schedule: schedule({linkedUserCount: 3, isUrgencyDefault: true})})).toEqual([
      '3 usuarios con acceso a la agenda',
      'Es la agenda por defecto de urgencias',
    ])
  })
})

describe('DeleteResourceDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps the delete button disabled until the exact name is typed', async () => {
    const user = userEvent.setup()
    const {submit} = renderDialog({kind: 'kiosk', kiosk: kiosk()})
    const input = screen.getByLabelText(/Escribí «Cabina Norte»/)

    expect(submit).toBeDisabled()

    await user.type(input, 'Cabina')
    expect(submit).toBeDisabled()
    expect(screen.getByText('Todavía no coincide con el nombre del elemento.')).toBeInTheDocument()

    await user.type(input, ' Sur')
    expect(submit).toBeDisabled()

    await user.clear(input)
    await user.type(input, '  cabina   norte ')
    expect(submit).toBeEnabled()
    expect(adminBrandsService.deleteKiosk).not.toHaveBeenCalled()
  })

  it('sends the typed confirmation with the delete so the server can re-check it', async () => {
    const user = userEvent.setup()
    vi.mocked(adminBrandsService.deleteKiosk).mockResolvedValue({_id: 'k1', kind: 'kiosk', name: 'Cabina Norte', deleted: true})
    const {onDeleted, submit} = renderDialog({kind: 'kiosk', kiosk: kiosk()})

    await user.type(screen.getByLabelText(/Escribí/), 'Cabina Norte')
    await user.click(submit)

    await waitFor(() => expect(adminBrandsService.deleteKiosk).toHaveBeenCalledWith('b1', 'k1', {confirmName: 'Cabina Norte'}))
    expect(onDeleted).toHaveBeenCalledWith({_id: 'k1', kind: 'kiosk', name: 'Cabina Norte', deleted: true})
  })

  it('routes an agenda to the schedule endpoint', async () => {
    const user = userEvent.setup()
    vi.mocked(adminBrandsService.deleteSchedule).mockResolvedValue({_id: 's1', kind: 'schedule', name: 'Agenda', deleted: true})
    const {submit} = renderDialog({kind: 'schedule', schedule: schedule()})

    await user.type(screen.getByLabelText(/Escribí/), 'Agenda Cardiología')
    await user.click(submit)

    await waitFor(() => expect(adminBrandsService.deleteSchedule).toHaveBeenCalledWith('b1', 's1', {confirmName: 'Agenda Cardiología'}))
    expect(adminBrandsService.deleteKiosk).not.toHaveBeenCalled()
  })

  it('explains a busy kiosk instead of the raw conflict, and stays open to retry', async () => {
    const user = userEvent.setup()
    vi.mocked(adminBrandsService.deleteKiosk).mockRejectedValue({
      isAxiosError: true,
      response: {status: 409, data: {code: 'KIOSK_BUSY', message: 'busy'}},
    })
    const {onDeleted, submit} = renderDialog({kind: 'kiosk', kiosk: kiosk()})

    await user.type(screen.getByLabelText(/Escribí/), 'Cabina Norte')
    await user.click(submit)

    expect(await screen.findByRole('alert')).toHaveTextContent(/Esta cabina está en uso/)
    expect(onDeleted).not.toHaveBeenCalled()
    expect(screen.getByRole('button', {name: /Eliminar definitivamente/})).toBeEnabled()
  })
})
