import {CalendarDaysIcon, FolderOpenIcon, MonitorIcon, PanelsTopLeftIcon, ScanSearchIcon, SearchIcon, XIcon} from 'lucide-react'
import {type KeyboardEvent, useId} from 'react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {STRINGS} from '@/lib/strings'
import {cn} from '@/lib/utils'
import {KIOSK_TILE} from './nodes/KioskNode'
import {SCHEDULE_TILE} from './nodes/ScheduleNode'
import type {SearchResult, SearchResultKind} from './searchNodes'

const COPY = STRINGS.brands.search

/** Results shown in the list; the rest is summarized as «+n más». */
export const MAX_VISIBLE_RESULTS = 12

const KIND_META: Record<SearchResultKind, {icon: typeof MonitorIcon; tile: string}> = {
  kiosk: {icon: MonitorIcon, tile: KIOSK_TILE.KIOSK},
  multi: {icon: PanelsTopLeftIcon, tile: KIOSK_TILE.MULTI},
  schedule: {icon: CalendarDaysIcon, tile: SCHEDULE_TILE},
  institution: {icon: FolderOpenIcon, tile: 'border border-dashed border-emerald-500/50 text-emerald-700 dark:text-emerald-300'},
}

export interface CanvasSearchProps {
  query: string
  onQueryChange: (query: string) => void
  results: SearchResult[]
  /** Total nodes on the canvas, for the «n de total» counter. */
  total: number
  onFocusResult: (id: string) => void
  onFitResults: () => void
}

/**
 * Search box floating over the canvas. Typing dims what does not match (the
 * canvas handles that); picking a result pans and zooms to it.
 */
export function CanvasSearch({query, onQueryChange, results, total, onFocusResult, onFitResults}: CanvasSearchProps) {
  const inputId = useId()
  const active = query.trim().length > 0
  const visible = results.slice(0, MAX_VISIBLE_RESULTS)
  const hidden = results.length - visible.length

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && query) {
      event.preventDefault()
      onQueryChange('')
    }
    if (event.key === 'Enter' && results[0]) {
      event.preventDefault()
      onFocusResult(results[0].id)
    }
  }

  return (
    <search className="nodrag nopan flex flex-col gap-1.5 rounded-lg bg-popover/95 p-1.5 shadow-sm ring-1 ring-foreground/10 backdrop-blur">
      <div className="relative flex items-center">
        <SearchIcon aria-hidden className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
        <Input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={COPY.placeholder}
          aria-label={COPY.label}
          autoComplete="off"
          spellCheck={false}
          className="h-8 border-transparent bg-transparent pr-24 pl-8 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent [&::-webkit-search-cancel-button]:hidden"
        />
        <div className="absolute right-1 flex items-center gap-1">
          {active ? (
            <span className="text-[11px] tabular-nums text-muted-foreground" aria-live="polite">
              {COPY.results(results.length, total)}
            </span>
          ) : null}
          {active ? (
            <Button type="button" variant="ghost" size="icon-xs" aria-label={COPY.clear} onClick={() => onQueryChange('')}>
              <XIcon aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>

      {active ? (
        <div className="flex flex-col gap-1 border-t pt-1.5">
          {results.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">{COPY.noResults}</p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto" aria-label={COPY.label}>
              {visible.map((result) => {
                const {icon: Icon, tile} = KIND_META[result.kind]
                return (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => onFocusResult(result.id)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                      <span className={cn('grid size-5 shrink-0 place-items-center rounded-sm', tile)}>
                        <Icon aria-hidden className="size-3" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{result.label}</span>
                      {result.detail ? <span className="shrink-0 truncate text-xs text-muted-foreground">{result.detail}</span> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="flex items-center justify-between gap-2 px-2 pb-0.5 text-[11px] text-muted-foreground">
            <span>{hidden > 0 ? COPY.more(hidden) : COPY.hint}</span>
            {results.length > 1 ? (
              <Button type="button" variant="ghost" size="xs" onClick={onFitResults} className="-mr-1.5 text-muted-foreground">
                <ScanSearchIcon aria-hidden data-icon="inline-start" />
                {COPY.fitResults}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </search>
  )
}
