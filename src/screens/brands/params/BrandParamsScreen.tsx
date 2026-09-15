import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  InfoIcon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  SearchIcon,
  Undo2Icon,
  XIcon,
} from 'lucide-react'
import {type MouseEvent, useCallback, useEffect, useMemo, useState} from 'react'
import {Link, useNavigate, useParams} from 'react-router-dom'
import {useBrandsStore} from '@/brands/brandsStore'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import {Input} from '@/components/ui/input'
import {Skeleton} from '@/components/ui/skeleton'
import {type NormalizedApiError, toApiError} from '@/lib/api'
import {STRINGS} from '@/lib/strings'
import {adminBrandsService} from '@/services/adminBrandsService'
import {BRAND_ERROR_CODES, type BrandParamsPayload, type JsonObject, type JsonValue, type ParamsOperation} from '@/types/brands'
import {BrandSelector} from '../BrandSelector'
import {brandErrorMessage} from '../KioskActionDialog'
import {
  applyOperations,
  collectIssues,
  containerPathKeys,
  diffParams,
  type DraftIssue,
  dottedPath,
  emptyValueForKind,
  getAtPath,
  isContainer,
  pathKey,
  removeAtPath,
  renameAtPath,
  setAtPath,
  type TreePath,
  type ValueKind,
  visiblePathKeys,
} from './paramsModel'
import {ParamsTree} from './ParamsTree'

const COPY = STRINGS.brands.params

type Phase =
  | {kind: 'loading'}
  | {kind: 'loadError'; error: NormalizedApiError}
  | {kind: 'editing'}
  | {kind: 'saving'}
  | {kind: 'saved'; applied: number}
  | {kind: 'invalid'; issues: DraftIssue[]}
  | {kind: 'saveError'; error: NormalizedApiError}
  | {kind: 'conflict'}

type Confirm = {kind: 'discard'} | {kind: 'leave'; to: string}

/** Outcomes that an edit clears; loading and saving are never interrupted by a keystroke. */
const SETTLED_PHASES: ReadonlySet<Phase['kind']> = new Set(['saved', 'invalid', 'saveError', 'conflict'])

const brandPath = (brandId: string) => `/brands/${brandId}`
const paramsPath = (brandId: string) => `${brandPath(brandId)}/params`

/** One line per issue kind, listing the paths it applies to. */
export function issueMessages(issues: DraftIssue[]): string[] {
  const grouped = new Map<DraftIssue['kind'], string[]>()
  for (const issue of issues) grouped.set(issue.kind, [...(grouped.get(issue.kind) ?? []), issue.path])
  return [...grouped.entries()].map(([kind, paths]) => COPY.issues[kind]([...new Set(paths)].join(', ')))
}

const changeLabel = (base: JsonObject, operation: ParamsOperation): string => {
  if (operation.op === 'unset') return COPY.change.removed
  return getAtPath(base, operation.path) === undefined ? COPY.change.added : COPY.change.modified
}

/**
 * Editor for a brand's `params`, the free-form configuration document in the
 * master database. Loads the masked params once, edits a local draft tree and
 * saves only the difference as path operations, so a save never touches keys
 * the admin did not change and a concurrent edit is detected, not overwritten.
 */
export default function BrandParamsScreen() {
  const {brandId = ''} = useParams<{brandId: string}>()
  const navigate = useNavigate()

  const brands = useBrandsStore((state) => state.brands)
  const brandsStatus = useBrandsStore((state) => state.brandsStatus)
  const loadBrands = useBrandsStore((state) => state.loadBrands)

  const [loaded, setLoaded] = useState<BrandParamsPayload | null>(null)
  const [draft, setDraft] = useState<JsonObject | null>(null)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())
  const [query, setQuery] = useState('')
  const [addingAtRoot, setAddingAtRoot] = useState(false)
  const [showPending, setShowPending] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [phase, setPhase] = useState<Phase>({kind: 'loading'})

  useEffect(() => {
    void loadBrands()
  }, [loadBrands])

  const load = useCallback(async (id: string) => {
    setPhase({kind: 'loading'})
    try {
      const payload = await adminBrandsService.getParams(id)
      setLoaded(payload)
      setDraft(payload.params)
      setExpanded(new Set())
      setQuery('')
      setAddingAtRoot(false)
      setPhase({kind: 'editing'})
    } catch (error) {
      setLoaded(null)
      setDraft(null)
      setPhase({kind: 'loadError', error: toApiError(error)})
    }
  }, [])

  useEffect(() => {
    if (brandId) void load(brandId)
  }, [brandId, load])

  const base = loaded?.params ?? null
  const secretPaths = useMemo(() => new Set(loaded?.secretPaths ?? []), [loaded])
  const operations = useMemo(() => (base && draft ? diffParams(base, draft) : []), [base, draft])
  const dirty = operations.length > 0
  const visible = useMemo(() => (draft ? visiblePathKeys(draft, query) : null), [draft, query])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const brandName = loaded?.name ?? brands.find((brand) => brand._id === brandId)?.name ?? ''
  const busy = phase.kind === 'loading' || phase.kind === 'saving'

  /** Any edit after a save outcome or a validation message takes the screen back to plain editing. */
  const updateDraft = useCallback((updater: (current: JsonObject) => JsonValue) => {
    setDraft((current) => {
      if (!current) return current
      const next = updater(current)
      return isContainer(next) && !Array.isArray(next) ? next : current
    })
    setPhase((current) => (SETTLED_PHASES.has(current.kind) ? {kind: 'editing'} : current))
  }, [])

  const onSet = useCallback((path: TreePath, value: JsonValue) => updateDraft((current) => setAtPath(current, path, value)), [updateDraft])
  const onRemove = useCallback((path: TreePath) => updateDraft((current) => removeAtPath(current, path)), [updateDraft])
  const onRename = useCallback((path: TreePath, key: string) => updateDraft((current) => renameAtPath(current, path, key)), [updateDraft])
  const onRevert = useCallback(
    (path: TreePath) =>
      updateDraft((current) => {
        const before = base ? getAtPath(base, path) : undefined
        return before === undefined ? removeAtPath(current, path) : setAtPath(current, path, before)
      }),
    [base, updateDraft],
  )
  const onToggle = useCallback((path: TreePath) => {
    setExpanded((current) => {
      const next = new Set(current)
      const key = pathKey(path)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])
  const onExpand = useCallback((path: TreePath) => {
    setExpanded((current) => (current.has(pathKey(path)) ? current : new Set([...current, pathKey(path)])))
  }, [])
  const onAdd = useCallback(
    (parentPath: TreePath, key: string | null, kind: ValueKind) => {
      const parent = draft ? getAtPath(draft, parentPath) : undefined
      const childKey: string | number = key ?? (Array.isArray(parent) ? parent.length : 0)
      const childPath = [...parentPath, childKey]
      updateDraft((current) => setAtPath(current, childPath, emptyValueForKind(kind)))
      setExpanded(
        (current) => new Set([...current, pathKey(parentPath), ...(kind === 'object' || kind === 'array' ? [pathKey(childPath)] : [])]),
      )
    },
    [draft, updateDraft],
  )

  const expandAll = () => draft && setExpanded(new Set(containerPathKeys(draft)))
  const collapseAll = () => setExpanded(new Set())

  const save = async () => {
    if (!loaded || !base || !draft || busy || !dirty) return

    const issues = collectIssues(base, draft, secretPaths)
    if (issues.length > 0) {
      setPhase({kind: 'invalid', issues})
      return
    }

    setPhase({kind: 'saving'})
    try {
      const result = await adminBrandsService.updateParams(brandId, {revision: loaded.revision, operations})
      setLoaded(result)
      setDraft(result.params)
      setPhase({kind: 'saved', applied: result.applied})
    } catch (error) {
      const apiError = toApiError(error)
      if (apiError.code !== BRAND_ERROR_CODES.PARAMS_REVISION_MISMATCH) {
        setPhase({kind: 'saveError', error: apiError})
        return
      }
      // Someone else saved first: rebase this draft on what they stored and let the admin review it.
      try {
        const fresh = await adminBrandsService.getParams(brandId)
        setLoaded(fresh)
        setDraft(applyOperations(fresh.params, operations))
        setPhase({kind: 'conflict'})
      } catch (reloadError) {
        setPhase({kind: 'saveError', error: toApiError(reloadError)})
      }
    }
  }

  const discard = () => {
    if (base) setDraft(base)
    setAddingAtRoot(false)
    setConfirm(null)
    setPhase({kind: 'editing'})
  }

  const guardedNavigate = (to: string) => {
    if (dirty) setConfirm({kind: 'leave', to})
    else navigate(to)
  }

  const handleBackClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!dirty) return
    event.preventDefault()
    setConfirm({kind: 'leave', to: brandPath(brandId)})
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            to={brandPath(brandId)}
            onClick={handleBackClick}
            className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon aria-hidden className="size-3.5" />
            {COPY.back}
          </Link>
          <h1 className="truncate text-[22px] leading-7 font-semibold tracking-[-0.021em] md:text-2xl md:leading-8">
            {COPY.title}
            {brandName ? ` · ${brandName}` : ''}
          </h1>
          <p className="max-w-xl text-sm text-pretty text-muted-foreground">{COPY.subtitle(brandName || '…')}</p>
        </div>
        <BrandSelector
          brands={brands}
          value={brandId || null}
          onChange={(id) => guardedNavigate(paramsPath(id))}
          disabled={brandsStatus !== 'ready' || phase.kind === 'saving'}
        />
      </header>

      {phase.kind === 'loading' ? (
        <div aria-busy aria-label={COPY.loading} role="status" className="flex flex-col gap-2 rounded-xl p-4 ring-1 ring-foreground/10">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-5/6" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : phase.kind === 'loadError' ? (
        <Alert variant="destructive" role="alert" className="max-w-lg">
          <AlertCircleIcon />
          <AlertTitle>{COPY.loadError}</AlertTitle>
          <AlertDescription>
            <p>{brandErrorMessage(phase.error)}</p>
            {phase.error.code ? <p className="font-mono text-[11px] opacity-70">{phase.error.code}</p> : null}
            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => void load(brandId)}>
              {STRINGS.brands.retry}
            </Button>
          </AlertDescription>
        </Alert>
      ) : base && draft ? (
        <>
          <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 bg-background/95 px-1 py-2 backdrop-blur supports-backdrop-filter:bg-background/80">
            <div className="relative min-w-56 max-w-md flex-1">
              <SearchIcon
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label={COPY.search}
                placeholder={COPY.searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-8 pr-8 pl-8"
              />
              {query ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={COPY.clearSearch}
                  onClick={() => setQuery('')}
                  className="absolute top-1/2 right-1 -translate-y-1/2">
                  <XIcon aria-hidden />
                </Button>
              ) : null}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={expandAll} disabled={visible !== null}>
              <ChevronsUpDownIcon aria-hidden data-icon="inline-start" />
              {COPY.expandAll}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={collapseAll} disabled={visible !== null}>
              <ChevronsDownUpIcon aria-hidden data-icon="inline-start" />
              {COPY.collapseAll}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setAddingAtRoot(true)} disabled={busy || addingAtRoot}>
              <PlusIcon aria-hidden data-icon="inline-start" />
              {COPY.addRoot}
            </Button>
            <div className="ml-auto flex items-center gap-2">
              {dirty ? (
                <Badge size="sm" variant="neutral" className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  {COPY.pending(operations.length)}
                </Badge>
              ) : null}
              <Button type="button" variant="outline" size="sm" disabled={!dirty || busy} onClick={() => setConfirm({kind: 'discard'})}>
                {COPY.discard}
              </Button>
              <Button type="button" size="sm" disabled={!dirty || busy} onClick={() => void save()}>
                {phase.kind === 'saving' ? (
                  <>
                    <Loader2Icon aria-hidden className="animate-spin" />
                    {COPY.saving}
                  </>
                ) : (
                  <>
                    <SaveIcon aria-hidden data-icon="inline-start" />
                    {COPY.save}
                  </>
                )}
              </Button>
            </div>
          </div>

          {phase.kind === 'invalid' ? (
            <Alert variant="destructive" role="alert">
              <AlertCircleIcon />
              <AlertTitle>{COPY.validationTitle}</AlertTitle>
              <AlertDescription>
                <ul className="flex list-disc flex-col gap-0.5 pl-4">
                  {issueMessages(phase.issues).map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : phase.kind === 'saveError' ? (
            <Alert variant="destructive" role="alert">
              <AlertCircleIcon />
              <AlertTitle>{COPY.saveErrorTitle}</AlertTitle>
              <AlertDescription>
                <p>{brandErrorMessage(phase.error)}</p>
                {phase.error.code ? <p className="font-mono text-[11px] opacity-70">{phase.error.code}</p> : null}
              </AlertDescription>
            </Alert>
          ) : phase.kind === 'conflict' ? (
            <Alert role="alert" className="border-amber-500/30 bg-amber-500/5">
              <InfoIcon className="text-amber-600 dark:text-amber-400" />
              <AlertTitle>{COPY.conflictTitle}</AlertTitle>
              <AlertDescription>{COPY.conflictDescription}</AlertDescription>
            </Alert>
          ) : phase.kind === 'saved' ? (
            <Alert role="status">
              <CheckCircle2Icon />
              <AlertTitle>{COPY.saved(phase.applied)}</AlertTitle>
            </Alert>
          ) : null}

          {dirty ? (
            <section className="rounded-xl border bg-card/40">
              <header className="flex items-center justify-between gap-3 px-4 py-2">
                <h2 className="text-sm font-semibold">
                  {COPY.pendingTitle} · {operations.length}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-expanded={showPending}
                  onClick={() => setShowPending((current) => !current)}>
                  {showPending ? COPY.hidePending : COPY.showPending}
                </Button>
              </header>
              {showPending ? (
                <ul className="divide-y border-t">
                  {operations.map((operation) => {
                    const dotted = dottedPath(operation.path)
                    return (
                      <li key={dotted} className="flex items-center justify-between gap-3 px-4 py-1.5 text-xs">
                        <span className="flex min-w-0 items-center gap-2">
                          <Badge size="xs" variant="neutral">
                            {changeLabel(base, operation)}
                          </Badge>
                          <span className="truncate font-mono">{dotted}</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          aria-label={COPY.undo(dotted)}
                          onClick={() => onRevert(operation.path)}
                          disabled={busy}>
                          <Undo2Icon aria-hidden data-icon="inline-start" />
                          {COPY.revert}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-xl p-2 ring-1 ring-foreground/10">
            <ParamsTree
              draft={draft}
              base={base}
              secretPaths={secretPaths}
              expanded={expanded}
              visible={visible}
              disabled={busy}
              addingAtRoot={addingAtRoot}
              onCloseRootAdd={() => setAddingAtRoot(false)}
              onSet={onSet}
              onRemove={onRemove}
              onRename={onRename}
              onAdd={onAdd}
              onRevert={onRevert}
              onToggle={onToggle}
              onExpand={onExpand}
            />
          </section>
        </>
      ) : null}

      {confirm ? (
        <Dialog open onOpenChange={(open) => (open ? null : setConfirm(null))}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{confirm.kind === 'discard' ? COPY.discardTitle : COPY.leaveTitle}</DialogTitle>
              <DialogDescription>
                {confirm.kind === 'discard' ? COPY.discardDescription(operations.length) : COPY.leaveDescription(operations.length)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                {COPY.cancel}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (confirm.kind === 'discard') discard()
                  else {
                    const {to} = confirm
                    setConfirm(null)
                    navigate(to)
                  }
                }}>
                {confirm.kind === 'discard' ? COPY.discardConfirm : COPY.leaveConfirm}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
