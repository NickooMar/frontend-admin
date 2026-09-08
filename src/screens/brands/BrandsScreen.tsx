import {AlertCircleIcon, DatabaseIcon, GlobeIcon, RefreshCwIcon, Trash2Icon} from 'lucide-react'
import {useEffect, useState} from 'react'
import {Navigate, useNavigate, useParams} from 'react-router-dom'
import {lastBrandStorage} from '@/brands/lastBrand'
import {useBrandsStore} from '@/brands/brandsStore'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Skeleton} from '@/components/ui/skeleton'
import {formatDateTime} from '@/lib/format'
import {STRINGS} from '@/lib/strings'
import {cn} from '@/lib/utils'
import {
  type AdminBrandSummary,
  type BrandArchitecture,
  editSectionOf,
  isEditAction,
  type KioskAction,
  type KioskNodeData,
} from '@/types/brands'
import {ArchitectureCanvas} from './architecture/ArchitectureCanvas'
import {BrandSelector} from './BrandSelector'
import {KioskEditDialog} from './edit/KioskEditDialog'
import {brandErrorMessage, KioskActionDialog} from './KioskActionDialog'
import {KioskActionsContext} from './kioskActions'

const COPY = STRINGS.brands

const brandPath = (brandId: string) => `/brands/${brandId}`

/** Brand to open when the URL has none: the last one visited, else the first with a reachable tenant, else the first. */
export function pickDefaultBrand(brands: AdminBrandSummary[], remembered: string | null): AdminBrandSummary | undefined {
  if (brands.length === 0) return undefined
  return brands.find((brand) => brand._id === remembered) ?? brands.find((brand) => brand.tenant.available) ?? brands[0]
}

function SummaryChips({architecture}: {architecture: BrandArchitecture}) {
  const {brand, summary} = architecture
  const generated = formatDateTime(architecture.generatedAt)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
      {brand.domainName ? (
        <span className="flex items-center gap-1">
          <GlobeIcon aria-hidden className="size-3.5" />
          {brand.domainName}
        </span>
      ) : null}
      {brand.databaseName ? (
        <span className="flex items-center gap-1 font-mono">
          <DatabaseIcon aria-hidden className="size-3.5" />
          {brand.databaseName}
        </span>
      ) : null}
      <span aria-hidden className="hidden h-3 w-px bg-border sm:block" />
      <Badge size="sm" variant="neutral">
        {COPY.summary.kiosks(summary.kiosks)}
      </Badge>
      <Badge size="sm" variant="neutral">
        {COPY.summary.multis(summary.multis)}
      </Badge>
      <Badge size="sm" variant="neutral">
        {COPY.summary.schedules(summary.schedules)}
      </Badge>
      <Badge size="sm" variant="neutral">
        {COPY.summary.edges(summary.edges)}
      </Badge>
      {generated ? <span className="ml-auto hidden md:inline">{COPY.generatedAt(generated)}</span> : null}
    </div>
  )
}

function CanvasSkeleton() {
  return (
    <div
      role="status"
      aria-busy
      aria-label={COPY.loadingArchitecture}
      className="grid h-full w-full grid-cols-3 gap-6 rounded-xl p-8 ring-1 ring-foreground/10">
      <div className="flex flex-col gap-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  )
}

export default function BrandsScreen() {
  const {brandId} = useParams<{brandId: string}>()
  const navigate = useNavigate()

  const brands = useBrandsStore((state) => state.brands)
  const brandsStatus = useBrandsStore((state) => state.brandsStatus)
  const brandsError = useBrandsStore((state) => state.brandsError)
  const architecture = useBrandsStore((state) => state.architecture)
  const architectureBrandId = useBrandsStore((state) => state.architectureBrandId)
  const architectureStatus = useBrandsStore((state) => state.architectureStatus)
  const architectureError = useBrandsStore((state) => state.architectureError)
  const includeDeleted = useBrandsStore((state) => state.includeDeleted)
  const loadBrands = useBrandsStore((state) => state.loadBrands)
  const loadArchitecture = useBrandsStore((state) => state.loadArchitecture)
  const setIncludeDeleted = useBrandsStore((state) => state.setIncludeDeleted)

  const [dialog, setDialog] = useState<{action: KioskAction; kiosk: KioskNodeData} | null>(null)

  useEffect(() => {
    void loadBrands()
  }, [loadBrands])

  useEffect(() => {
    if (!brandId) return
    lastBrandStorage.write(brandId)
    void loadArchitecture(brandId)
  }, [brandId, loadArchitecture])

  const selectedBrand = brands.find((brand) => brand._id === brandId) ?? null

  if (!brandId && brandsStatus === 'ready') {
    const fallback = pickDefaultBrand(brands, lastBrandStorage.read())
    if (fallback) return <Navigate to={brandPath(fallback._id)} replace />
  }

  const loading = architectureStatus === 'loading' || (brandId !== undefined && architectureBrandId !== brandId)
  const current = architecture && architectureBrandId === brandId ? architecture : null
  const isEmpty = current !== null && current.nodes.length === 0

  const handleAction = (action: KioskAction, kiosk: KioskNodeData) => setDialog({action, kiosk})

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.021em] md:text-2xl md:leading-8">{COPY.title}</h1>
          <p className="max-w-xl text-sm text-pretty text-muted-foreground">{COPY.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BrandSelector
            brands={brands}
            value={brandId ?? null}
            onChange={(id) => navigate(brandPath(id))}
            disabled={brandsStatus !== 'ready'}
          />
          <Button
            type="button"
            variant="outline"
            size="default"
            aria-pressed={includeDeleted}
            onClick={() => setIncludeDeleted(!includeDeleted)}
            className={cn(includeDeleted && 'bg-muted text-foreground')}>
            <Trash2Icon aria-hidden data-icon="inline-start" />
            {COPY.includeDeleted}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={COPY.refresh}
            disabled={!brandId || loading}
            onClick={() => {
              if (brandId) void loadArchitecture(brandId, {force: true})
            }}>
            <RefreshCwIcon aria-hidden className={cn(loading && 'animate-spin')} />
          </Button>
        </div>
      </header>

      {brandsStatus === 'error' && brandsError ? (
        <Alert variant="destructive" role="alert">
          <AlertCircleIcon />
          <AlertTitle>{COPY.brandsErrorTitle}</AlertTitle>
          <AlertDescription>
            <p>{brandErrorMessage(brandsError)}</p>
            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => void loadBrands({force: true})}>
              {COPY.retry}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {brandsStatus === 'ready' && brands.length === 0 ? <p className="text-sm text-muted-foreground">{COPY.noBrands}</p> : null}

      {current ? <SummaryChips architecture={current} /> : null}

      <section className="relative min-h-[440px] flex-1">
        {brandId && architectureStatus === 'error' && architectureError && architectureBrandId === brandId ? (
          <div className="grid h-full place-items-center rounded-xl p-6 ring-1 ring-foreground/10">
            <Alert variant="destructive" role="alert" className="max-w-md">
              <AlertCircleIcon />
              <AlertTitle>{COPY.errorTitle}</AlertTitle>
              <AlertDescription>
                <p>{brandErrorMessage(architectureError)}</p>
                {architectureError.code ? <p className="font-mono text-[11px] opacity-70">{architectureError.code}</p> : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => void loadArchitecture(brandId, {force: true})}>
                  {COPY.retry}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : current ? (
          isEmpty ? (
            <div className="grid h-full place-items-center rounded-xl p-6 text-center ring-1 ring-foreground/10">
              <div className="flex max-w-sm flex-col gap-1">
                <p className="text-sm font-medium">{COPY.emptyTitle}</p>
                <p className="text-sm text-muted-foreground">{COPY.emptyDescription}</p>
              </div>
            </div>
          ) : (
            <KioskActionsContext.Provider value={handleAction}>
              <ArchitectureCanvas architecture={current} />
            </KioskActionsContext.Provider>
          )
        ) : brandId || brandsStatus !== 'ready' ? (
          <CanvasSkeleton />
        ) : null}
      </section>

      {dialog && selectedBrand && isEditAction(dialog.action) ? (
        <KioskEditDialog
          key={`${dialog.action}:${dialog.kiosk._id}`}
          section={editSectionOf(dialog.action)}
          kiosk={dialog.kiosk}
          brand={selectedBrand}
          onClose={() => setDialog(null)}
          onSaved={() => {
            if (brandId) void loadArchitecture(brandId, {force: true})
          }}
        />
      ) : dialog && selectedBrand && !isEditAction(dialog.action) ? (
        <KioskActionDialog
          key={`${dialog.action}:${dialog.kiosk._id}`}
          action={dialog.action}
          kiosk={dialog.kiosk}
          brand={selectedBrand}
          brands={brands}
          onClose={() => setDialog(null)}
          onDuplicated={(result) => {
            if (result.targetBrandId === brandId) void loadArchitecture(brandId, {force: true})
          }}
        />
      ) : null}
    </div>
  )
}
