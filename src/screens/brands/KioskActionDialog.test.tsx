import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {adminBrandsService} from '@/services/adminBrandsService'
import type {AdminBrandSummary, KioskNodeData} from '@/types/brands'
import {KioskActionDialog} from './KioskActionDialog'

vi.mock('@/services/adminBrandsService', () => ({
  adminBrandsService: {list: vi.fn(), architecture: vi.fn(), duplicateKiosk: vi.fn(), moveKiosk: vi.fn()},
}))

const brand = (id: string, name: string): AdminBrandSummary => ({
  _id: id,
  name,
  domainName: null,
  alternateDomains: [],
  databaseName: `diagnostica-${id}`,
  active: true,
  tenant: {available: true},
})

const alpha = brand('a', 'Alpha')
const beta = brand('b', 'Beta')

const kiosk: KioskNodeData = {
  _id: 'k1',
  type: 'MULTI',
  location: 'Multi Norte',
  status: 'AVAILABLE',
  connected: false,
  lastConnected: null,
  lastDisconnected: null,
  deleted: false,
  keyboardMode: true,
  assistantMode: false,
  softwareVersion: {frontend: 'dev', backend: 'dev'},
  examCount: 2,
  examNames: ['ECG', 'SPO2'],
  linkedUsers: [],
}

const apiError = (status: number, body: Record<string, unknown>) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    config: {},
    response: {status, data: body},
    toJSON: () => ({}),
  })

describe('KioskActionDialog', () => {
  beforeEach(() => {
    vi.mocked(adminBrandsService.duplicateKiosk).mockReset()
    vi.mocked(adminBrandsService.moveKiosk).mockReset()
  })

  it('duplicates into the chosen brand with a custom location and reports what was not copied', async () => {
    vi.mocked(adminBrandsService.duplicateKiosk).mockResolvedValue({
      kiosk: {...kiosk, _id: 'k2', location: 'Multi Norte (Beta)'},
      sourceBrandId: 'a',
      targetBrandId: 'b',
      omitted: ['params.keyboardModeConfig.accessKey'],
      notCopied: ['station accounts'],
    })
    const onDuplicated = vi.fn()
    const user = userEvent.setup()

    render(
      <KioskActionDialog
        action="duplicate"
        kiosk={kiosk}
        brand={alpha}
        brands={[alpha, beta]}
        onClose={vi.fn()}
        onDuplicated={onDuplicated}
      />,
    )

    expect(screen.getByRole('dialog')).toHaveTextContent('Duplicar en otra marca · Multi Norte')
    expect(screen.getByRole('combobox', {name: 'Marca destino'})).toHaveTextContent('Alpha')

    await user.click(screen.getByRole('combobox', {name: 'Marca destino'}))
    await user.click(await screen.findByRole('option', {name: /Beta/}))

    const location = screen.getByLabelText('Nombre / ubicación de la copia')
    expect(location).toHaveValue('Multi Norte (copia)')
    await user.clear(location)
    await user.type(location, '  Multi Norte (Beta)  ')

    await user.click(screen.getByRole('button', {name: 'Duplicar'}))

    expect(await screen.findByRole('status')).toHaveTextContent('Se creó «Multi Norte (Beta)» en Beta.')
    expect(adminBrandsService.duplicateKiosk).toHaveBeenCalledWith('a', 'k1', {targetBrandId: 'b', location: 'Multi Norte (Beta)'})
    expect(screen.getByText('params.keyboardModeConfig.accessKey')).toBeInTheDocument()
    expect(screen.getByText('station accounts')).toBeInTheDocument()
    expect(onDuplicated).toHaveBeenCalledWith(expect.objectContaining({targetBrandId: 'b'}))
  })

  it('shows the backend error for a failed duplicate', async () => {
    vi.mocked(adminBrandsService.duplicateKiosk).mockRejectedValue(
      apiError(404, {statusCode: 404, error: 'Not Found', message: 'Kiosk k1 not found', code: 'KIOSK_NOT_FOUND'}),
    )
    const user = userEvent.setup()

    render(<KioskActionDialog action="duplicate" kiosk={kiosk} brand={alpha} brands={[alpha, beta]} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', {name: 'Duplicar'}))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('La cabina ya no existe en la marca de origen.')
    expect(alert).toHaveTextContent('KIOSK_NOT_FOUND')
  })

  it('calls the move boundary and explains that migration is not available yet', async () => {
    vi.mocked(adminBrandsService.moveKiosk).mockRejectedValue(
      apiError(501, {statusCode: 501, error: 'Not Implemented', message: 'not yet', code: 'MOVE_NOT_IMPLEMENTED'}),
    )
    const user = userEvent.setup()

    render(<KioskActionDialog action="move" kiosk={kiosk} brand={alpha} brands={[alpha, beta]} onClose={vi.fn()} />)

    expect(screen.queryByLabelText('Nombre / ubicación de la copia')).not.toBeInTheDocument()
    await user.click(screen.getByRole('combobox', {name: 'Marca destino'}))
    await user.click(await screen.findByRole('option', {name: /Beta/}))
    await user.click(screen.getByRole('button', {name: 'Mover'}))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('La migración entre marcas todavía no está disponible')
    expect(alert).toHaveTextContent('MOVE_NOT_IMPLEMENTED')
    expect(adminBrandsService.moveKiosk).toHaveBeenCalledWith('a', 'k1', {targetBrandId: 'b'})
  })
})
