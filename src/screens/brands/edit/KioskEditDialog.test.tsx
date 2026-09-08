import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {adminBrandsService} from '@/services/adminBrandsService'
import type {AdminBrandSummary, AdminKioskDetail, KioskNodeData} from '@/types/brands'
import {KioskEditDialog} from './KioskEditDialog'

vi.mock('@/services/adminBrandsService', () => ({
  adminBrandsService: {
    list: vi.fn(),
    architecture: vi.fn(),
    duplicateKiosk: vi.fn(),
    moveKiosk: vi.fn(),
    getKiosk: vi.fn(),
    updateKioskSection: vi.fn(),
  },
}))

const brand: AdminBrandSummary = {
  _id: 'a',
  name: 'Alpha',
  domainName: null,
  alternateDomains: [],
  databaseName: 'diagnostica-a',
  active: true,
  tenant: {available: true},
}

const kiosk: KioskNodeData = {
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
}

const detail: AdminKioskDetail = {
  _id: 'k1',
  type: 'KIOSK',
  location: 'Cabina Norte',
  status: 'AVAILABLE',
  connected: false,
  softwareVersion: {frontend: 'dev'},
  devices: [{type: 'service', subType: 'websocket', name: 'ecg', nameToShow: 'ECG', isEnabled: true, ledNumber: 2, data: {label: ''}}],
  availableExams: [{type: 'ECG', name: 'Electro', devices: ['ecg']}],
  params: {keyboardMode: false},
}

describe('KioskEditDialog', () => {
  beforeEach(() => {
    vi.mocked(adminBrandsService.getKiosk).mockReset().mockResolvedValue(detail)
    vi.mocked(adminBrandsService.updateKioskSection)
      .mockReset()
      .mockImplementation(async (_brand, _kiosk, _section, body) => ({...detail, ...(body as object)}))
  })

  it('loads the kiosk, edits the device information and saves through the data endpoint', async () => {
    const onSaved = vi.fn()
    const user = userEvent.setup()
    render(<KioskEditDialog section="data" kiosk={kiosk} brand={brand} onClose={vi.fn()} onSaved={onSaved} />)

    expect(screen.getByRole('dialog')).toHaveTextContent('Datos del dispositivo · Cabina Norte')
    const location = await screen.findByLabelText('Nombre / ubicación')
    expect(location).toHaveValue('Cabina Norte')
    expect(adminBrandsService.getKiosk).toHaveBeenCalledWith('a', 'k1')

    await user.clear(location)
    await user.type(location, 'Cabina Norte 2')
    await user.click(screen.getByRole('combobox', {name: 'Estado'}))
    await user.click(await screen.findByRole('option', {name: 'En mantenimiento'}))
    await user.click(screen.getByRole('button', {name: 'Guardar cambios'}))

    expect(await screen.findByRole('status')).toHaveTextContent('Cambios guardados.')
    expect(adminBrandsService.updateKioskSection).toHaveBeenCalledWith('a', 'k1', 'data', {
      location: 'Cabina Norte 2',
      type: 'KIOSK',
      status: 'MAINTENANCE',
    })
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({location: 'Cabina Norte 2'}))
  })

  it('blocks a versions save until the required components are filled', async () => {
    const user = userEvent.setup()
    render(<KioskEditDialog section="version" kiosk={kiosk} brand={brand} onClose={vi.fn()} />)

    expect(await screen.findByLabelText('Versión frontend')).toHaveValue('dev')
    await user.click(screen.getByRole('button', {name: 'Guardar cambios'}))

    expect(await screen.findByRole('alert')).toHaveTextContent('Completá las versiones obligatorias: backend, berry.')
    expect(adminBrandsService.updateKioskSection).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Versión backend'), 'dev')
    await user.type(screen.getByLabelText('Versión berry'), '1.4.0')
    await user.click(screen.getByRole('button', {name: 'Agregar componente'}))
    await user.type(screen.getByLabelText(/^Componente \d+$/), 'nutritionalScale')
    await user.type(screen.getAllByLabelText(/^Versión/).at(-1) as HTMLElement, 'dev')
    await user.click(screen.getByRole('button', {name: 'Guardar cambios'}))

    await waitFor(() =>
      expect(adminBrandsService.updateKioskSection).toHaveBeenCalledWith('a', 'k1', 'version', {
        softwareVersion: {backend: 'dev', frontend: 'dev', berry: '1.4.0', nutritionalScale: 'dev'},
      }),
    )
  })

  it('saves the whole params object with defaults filled in after toggling a mode', async () => {
    const user = userEvent.setup()
    render(<KioskEditDialog section="params" kiosk={kiosk} brand={brand} onClose={vi.fn()} />)

    const keyboard = await screen.findByRole('switch', {name: 'Modo teclado'})
    expect(keyboard).toHaveAttribute('aria-checked', 'false')
    await user.click(keyboard)
    await user.click(screen.getByRole('button', {name: 'Guardar cambios'}))

    await waitFor(() => expect(adminBrandsService.updateKioskSection).toHaveBeenCalled())
    const [, , section, body] = vi.mocked(adminBrandsService.updateKioskSection).mock.calls[0] as [
      string,
      string,
      string,
      {params: Record<string, unknown>},
    ]
    expect(section).toBe('params')
    expect(body.params).toMatchObject({
      keyboardMode: true,
      assistantMode: false,
      ecg: {config: {stillHereStart: 120}},
      multiparametricMonitor: {alarmInterval: 1},
    })
    expect('keyboardModeConfig' in body.params).toBe(false)
  })

  it('shows the devices and exams of the loaded kiosk and surfaces a backend error on save', async () => {
    vi.mocked(adminBrandsService.updateKioskSection).mockRejectedValueOnce(
      Object.assign(new Error('Request failed with status code 400'), {
        isAxiosError: true,
        config: {},
        response: {status: 400, data: {statusCode: 400, error: 'Bad Request', message: '"devices[0].name" is required'}},
        toJSON: () => ({}),
      }),
    )
    const user = userEvent.setup()
    render(<KioskEditDialog section="devices" kiosk={kiosk} brand={brand} onClose={vi.fn()} />)

    expect(await screen.findByLabelText('Nombre a mostrar')).toHaveValue('ECG')
    expect(screen.getByLabelText('LED')).toHaveValue('2')
    await user.click(screen.getByRole('button', {name: 'Guardar cambios'}))

    expect(await screen.findByRole('alert')).toHaveTextContent('"devices[0].name" is required')
  })

  it('reports a load failure and offers to close', async () => {
    vi.mocked(adminBrandsService.getKiosk).mockRejectedValueOnce(new Error('Network Error'))
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<KioskEditDialog section="availableExams" kiosk={kiosk} brand={brand} onClose={onClose} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la configuración de la cabina.')
    await user.click(screen.getByRole('button', {name: 'Cerrar'}))
    expect(onClose).toHaveBeenCalled()
  })
})
