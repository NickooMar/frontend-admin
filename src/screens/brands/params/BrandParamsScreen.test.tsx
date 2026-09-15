import {render, screen, waitFor, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {MemoryRouter, Route, Routes} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {useBrandsStore} from '@/brands/brandsStore'
import {adminBrandsService} from '@/services/adminBrandsService'
import {type AdminBrandSummary, type BrandParamsPayload, type JsonObject, SECRET_MASK, type UpdateBrandParamsRequest} from '@/types/brands'
import BrandParamsScreen from './BrandParamsScreen'
import {applyOperations} from './paramsModel'

vi.mock('@/services/adminBrandsService', () => ({
  adminBrandsService: {list: vi.fn(), getParams: vi.fn(), updateParams: vi.fn()},
}))

const brand = (id: string): AdminBrandSummary => ({
  _id: id,
  name: `Brand ${id}`,
  domainName: null,
  alternateDomains: [],
  databaseName: `diagnostica-${id}`,
  active: true,
  tenant: {available: true},
})

const payload = (): BrandParamsPayload => ({
  brandId: 'a',
  name: 'Alpha',
  revision: 'rev-1',
  secretPaths: ['smtp.password'],
  params: {
    defaultLanguage: 'ES',
    smtp: {host: 'mail.example.com', port: 465, password: SECRET_MASK},
    videovisit: {earlyConnectionOffset: 20, lateConnectionOffset: 20},
    faceLogin: true,
    legacy: 'drop me',
  },
})

/** What the server answers: the operations applied, secrets masked again. */
const saved = (body: UpdateBrandParamsRequest, revision = 'rev-2') => {
  const params = applyOperations(payload().params, body.operations)
  const smtp = params.smtp as JsonObject | undefined
  if (smtp && typeof smtp.password === 'string' && smtp.password) params.smtp = {...smtp, password: SECRET_MASK}
  return {...payload(), params, revision, applied: body.operations.length, paths: body.operations.map((op) => op.path.join('.'))}
}

const apiError = (status: number, body: Record<string, unknown>) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    config: {},
    response: {status, data: body},
    toJSON: () => ({}),
  })

function renderScreen(initialPath = '/brands/a/params') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/brands/:brandId" element={<div data-testid="brand-screen" />} />
        <Route path="/brands/:brandId/params" element={<BrandParamsScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

const expandSmtp = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', {name: 'Expandir o contraer smtp'}))
  return screen.findByRole('spinbutton', {name: 'smtp.port'})
}

describe('BrandParamsScreen', () => {
  beforeEach(() => {
    useBrandsStore.getState().reset()
    vi.mocked(adminBrandsService.list)
      .mockReset()
      .mockResolvedValue([brand('a'), brand('b')])
    vi.mocked(adminBrandsService.getParams).mockReset().mockResolvedValue(payload())
    vi.mocked(adminBrandsService.updateParams)
      .mockReset()
      .mockImplementation(async (_brandId, body) => saved(body))
  })

  it('loads the params collapsed, edits a nested value, adds and removes keys, and saves only the difference', async () => {
    const user = userEvent.setup()
    renderScreen()

    expect(await screen.findByRole('heading', {level: 1})).toHaveTextContent('Parámetros · Alpha')
    expect(adminBrandsService.getParams).toHaveBeenCalledWith('a')
    expect(screen.getByText('smtp')).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton', {name: 'smtp.port'})).not.toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Guardar cambios'})).toBeDisabled()

    const port = await expandSmtp(user)
    expect(port).toHaveValue(465)
    expect(screen.getByRole('button', {name: 'Reemplazar smtp.password'})).toBeInTheDocument()
    await user.clear(port)
    await user.type(port, '587')
    // Both the edited leaf and its container are flagged.
    expect(screen.getAllByText('Modificado')).toHaveLength(2)

    await user.click(screen.getByRole('button', {name: 'Agregar parámetro'}))
    const form = screen.getByRole('form', {name: 'Agregar parámetro'})
    await user.type(within(form).getByRole('textbox', {name: 'Nombre'}), 'newFlag')
    await user.click(within(form).getByRole('combobox', {name: 'Tipo'}))
    await user.click(await screen.findByRole('option', {name: 'Booleano'}))
    await user.click(within(form).getByRole('button', {name: 'Agregar'}))
    expect(screen.getByRole('switch', {name: 'newFlag'})).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('Nuevo')).toBeInTheDocument()

    await user.click(screen.getByRole('button', {name: 'Acciones de legacy'}))
    await user.click(await screen.findByRole('menuitem', {name: 'Eliminar'}))
    expect(screen.queryByRole('textbox', {name: 'legacy'})).not.toBeInTheDocument()

    expect(screen.getByText('3 cambios sin guardar')).toBeInTheDocument()
    await user.click(screen.getByRole('button', {name: 'Ver cambios'}))
    expect(screen.getByRole('button', {name: 'Deshacer legacy'})).toBeInTheDocument()

    await user.click(screen.getByRole('button', {name: 'Guardar cambios'}))
    expect(await screen.findByRole('status')).toHaveTextContent('Se guardaron 3 cambios.')
    expect(adminBrandsService.updateParams).toHaveBeenCalledWith('a', {
      revision: 'rev-1',
      operations: [
        {op: 'unset', path: ['legacy']},
        {op: 'set', path: ['smtp', 'port'], value: 587},
        {op: 'set', path: ['newFlag'], value: false},
      ],
    })
    expect(screen.queryByText(/cambios sin guardar/)).not.toBeInTheDocument()
    expect(screen.getByRole('spinbutton', {name: 'smtp.port'})).toHaveValue(587)
  })

  it('replacing a secret needs a real value; the mask itself never travels', async () => {
    const user = userEvent.setup()
    renderScreen()
    await expandSmtp(user)

    await user.click(screen.getByRole('button', {name: 'Reemplazar smtp.password'}))
    const secret = screen.getByRole('textbox', {name: 'smtp.password'})
    expect(secret).toHaveValue('')

    await user.click(screen.getByRole('button', {name: 'Cancelar reemplazo smtp.password'}))
    expect(screen.getByRole('button', {name: 'Reemplazar smtp.password'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Guardar cambios'})).toBeDisabled()

    await user.click(screen.getByRole('button', {name: 'Reemplazar smtp.password'}))
    await user.click(screen.getByRole('button', {name: 'Guardar cambios'}))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ingresá un valor para estos secretos o cancelá el reemplazo: smtp.password.',
    )
    expect(adminBrandsService.updateParams).not.toHaveBeenCalled()

    await user.type(screen.getByRole('textbox', {name: 'smtp.password'}), 'new-secret')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', {name: 'Guardar cambios'}))

    await waitFor(() =>
      expect(adminBrandsService.updateParams).toHaveBeenCalledWith('a', {
        revision: 'rev-1',
        operations: [{op: 'set', path: ['smtp', 'password'], value: 'new-secret'}],
      }),
    )
    expect(await screen.findByRole('button', {name: 'Reemplazar smtp.password'})).toBeInTheDocument()
  })

  it('rebases the draft on a newer version when someone else saved first', async () => {
    vi.mocked(adminBrandsService.updateParams).mockRejectedValueOnce(
      apiError(409, {statusCode: 409, error: 'Conflict', message: 'changed', code: 'PARAMS_REVISION_MISMATCH'}),
    )
    const theirs = payload()
    theirs.params.defaultLanguage = 'PT'
    theirs.revision = 'rev-9'
    vi.mocked(adminBrandsService.getParams).mockResolvedValueOnce(payload()).mockResolvedValueOnce(theirs)

    const user = userEvent.setup()
    renderScreen()
    const port = await expandSmtp(user)
    await user.clear(port)
    await user.type(port, '587')
    await user.click(screen.getByRole('button', {name: 'Guardar cambios'}))

    expect(await screen.findByRole('alert')).toHaveTextContent('Los parámetros cambiaron mientras editabas')
    expect(screen.getByRole('textbox', {name: 'defaultLanguage'})).toHaveValue('PT')
    expect(screen.getByRole('spinbutton', {name: 'smtp.port'})).toHaveValue(587)
    expect(screen.getByText('1 cambio sin guardar')).toBeInTheDocument()

    await user.click(screen.getByRole('button', {name: 'Guardar cambios'}))
    await waitFor(() =>
      expect(adminBrandsService.updateParams).toHaveBeenLastCalledWith('a', {
        revision: 'rev-9',
        operations: [{op: 'set', path: ['smtp', 'port'], value: 587}],
      }),
    )
  })

  it('filters the tree by name or value and expands the matches', async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('smtp')

    await user.type(screen.getByRole('textbox', {name: 'Buscar parámetro'}), 'port')
    expect(await screen.findByRole('spinbutton', {name: 'smtp.port'})).toBeInTheDocument()
    expect(screen.queryByText('videovisit')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', {name: 'Limpiar búsqueda'}))
    expect(screen.getByText('videovisit')).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton', {name: 'smtp.port'})).not.toBeInTheDocument()
  })

  it('discarding asks first and restores the loaded values', async () => {
    const user = userEvent.setup()
    renderScreen()
    const port = await expandSmtp(user)
    await user.clear(port)
    await user.type(port, '1')

    await user.click(screen.getByRole('button', {name: 'Descartar'}))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Vas a perder 1 cambio sin guardar.')
    await user.click(within(dialog).getByRole('button', {name: 'Descartar'}))

    expect(screen.getByRole('spinbutton', {name: 'smtp.port'})).toHaveValue(465)
    expect(screen.queryByText(/cambios sin guardar/)).not.toBeInTheDocument()
  })

  it('leaving with unsaved changes asks for confirmation', async () => {
    const user = userEvent.setup()
    renderScreen()
    const port = await expandSmtp(user)
    await user.clear(port)
    await user.type(port, '1')

    await user.click(screen.getByRole('link', {name: 'Volver a la arquitectura'}))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Salir sin guardar')
    await user.click(within(dialog).getByRole('button', {name: 'Cancelar'}))
    expect(screen.getByRole('spinbutton', {name: 'smtp.port'})).toHaveValue(1)

    await user.click(screen.getByRole('link', {name: 'Volver a la arquitectura'}))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', {name: 'Salir sin guardar'}))
    expect(await screen.findByTestId('brand-screen')).toBeInTheDocument()
  })

  it('reports a load failure with the backend message and retries', async () => {
    vi.mocked(adminBrandsService.getParams).mockRejectedValueOnce(
      apiError(404, {statusCode: 404, error: 'Not Found', message: 'Brand a not found', code: 'BRAND_NOT_FOUND'}),
    )
    const user = userEvent.setup()
    renderScreen()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar los parámetros de la marca.')
    expect(alert).toHaveTextContent('La marca ya no existe.')
    await user.click(screen.getByRole('button', {name: 'Reintentar'}))
    expect(await screen.findByText('smtp')).toBeInTheDocument()
  })
})
