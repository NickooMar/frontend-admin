import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useState} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {CanvasSearch, MAX_VISIBLE_RESULTS} from './CanvasSearch'
import type {SearchResult} from './searchNodes'

const results: SearchResult[] = [
  {id: 'kiosk:k1', kind: 'kiosk', label: 'Cabina Norte', detail: 'Cabina'},
  {id: 'schedule:s1', kind: 'schedule', label: 'Agenda Cardiología', detail: 'Hospital Central'},
]

function Harness({
  results: provided,
  onFocusResult,
  onFitResults = vi.fn(),
}: {
  results: SearchResult[]
  onFocusResult: (id: string) => void
  onFitResults?: () => void
}) {
  const [query, setQuery] = useState('')
  return (
    <CanvasSearch
      query={query}
      onQueryChange={setQuery}
      results={query ? provided : []}
      total={80}
      onFocusResult={onFocusResult}
      onFitResults={onFitResults}
    />
  )
}

describe('CanvasSearch', () => {
  it('lists results with their kind and detail while typing, and jumps to a clicked result', async () => {
    const onFocusResult = vi.fn()
    const onFitResults = vi.fn()
    const user = userEvent.setup()
    render(<Harness results={results} onFocusResult={onFocusResult} onFitResults={onFitResults} />)

    expect(screen.queryByText('Cabina Norte')).not.toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', {name: 'Buscar en la marca'}), 'ca')

    expect(screen.getByText('2 de 80')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: /Cabina Norte/})).toHaveTextContent('Cabina')
    expect(screen.getByRole('button', {name: /Agenda Cardiología/})).toHaveTextContent('Hospital Central')

    await user.click(screen.getByRole('button', {name: /Agenda Cardiología/}))
    expect(onFocusResult).toHaveBeenCalledWith('schedule:s1')

    await user.click(screen.getByRole('button', {name: 'Encuadrar resultados'}))
    expect(onFitResults).toHaveBeenCalledTimes(1)
  })

  it('Enter goes to the first result, Escape and the clear button empty the query', async () => {
    const onFocusResult = vi.fn()
    const user = userEvent.setup()
    render(<Harness results={results} onFocusResult={onFocusResult} />)

    const input = screen.getByRole('searchbox', {name: 'Buscar en la marca'})
    await user.type(input, 'nor{Enter}')
    expect(onFocusResult).toHaveBeenCalledWith('kiosk:k1')

    await user.keyboard('{Escape}')
    expect(input).toHaveValue('')
    expect(screen.queryByText('2 de 80')).not.toBeInTheDocument()

    await user.type(input, 'x')
    await user.click(screen.getByRole('button', {name: 'Limpiar búsqueda'}))
    expect(input).toHaveValue('')
  })

  it('shows an empty state and caps the visible list', async () => {
    const user = userEvent.setup()
    const {rerender} = render(<Harness results={[]} onFocusResult={vi.fn()} />)

    await user.type(screen.getByRole('searchbox', {name: 'Buscar en la marca'}), 'zzz')
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()

    const many = Array.from({length: MAX_VISIBLE_RESULTS + 3}, (_, index) => ({
      id: `kiosk:k${index}`,
      kind: 'kiosk' as const,
      label: `Cabina ${index}`,
      detail: null,
    }))
    rerender(<Harness results={many} onFocusResult={vi.fn()} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(MAX_VISIBLE_RESULTS)
    expect(screen.getByText('+3 más')).toBeInTheDocument()
  })
})
