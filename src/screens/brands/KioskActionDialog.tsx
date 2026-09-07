import {AlertCircleIcon, CheckCircle2Icon, Loader2Icon} from 'lucide-react'
import {type FormEvent, useState} from 'react'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import {Field, FieldGroup, FieldLabel} from '@/components/ui/field'
import {Input} from '@/components/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {type NormalizedApiError, toApiError} from '@/lib/api'
import {STRINGS} from '@/lib/strings'
import {adminBrandsService} from '@/services/adminBrandsService'
import {type AdminBrandSummary, BRAND_ERROR_CODES, type DuplicateKioskResult, type KioskAction, type KioskNodeData} from '@/types/brands'

const COPY = STRINGS.brands.dialog

export function brandErrorMessage(error: NormalizedApiError): string {
  if (error.isNetworkError) return STRINGS.errors.NETWORK
  if (error.code && STRINGS.brands.errors[error.code]) return STRINGS.brands.errors[error.code] as string
  return error.message || STRINGS.errors.UNKNOWN
}

export interface KioskActionDialogProps {
  action: KioskAction
  kiosk: KioskNodeData
  /** Brand the kiosk currently belongs to. */
  brand: AdminBrandSummary
  brands: AdminBrandSummary[]
  onClose: () => void
  /** A copy landed in `targetBrandId`; the screen refreshes when that is the brand on screen. */
  onDuplicated?: (result: DuplicateKioskResult) => void
}

type Phase =
  | {kind: 'form'}
  | {kind: 'submitting'}
  | {kind: 'duplicated'; result: DuplicateKioskResult}
  | {kind: 'error'; error: NormalizedApiError}

const kindLabel = (kiosk: KioskNodeData) => (kiosk.type === 'MULTI' ? STRINGS.brands.kinds.multi : STRINGS.brands.kinds.kiosk)

/**
 * Contextual kiosk/multi operations. `edit` is a placeholder; `duplicate` is
 * wired end to end; `move` calls the backend boundary and surfaces its answer.
 */
export function KioskActionDialog({action, kiosk, brand, brands, onClose, onDuplicated}: KioskActionDialogProps) {
  const targets = brands.filter((candidate) => candidate.tenant.available)
  const [targetBrandId, setTargetBrandId] = useState(brand._id)
  const [location, setLocation] = useState(`${kiosk.location} (copia)`)
  const [phase, setPhase] = useState<Phase>({kind: 'form'})

  const title = action === 'edit' ? COPY.editTitle : action === 'duplicate' ? COPY.duplicateTitle : COPY.moveTitle
  const submitting = phase.kind === 'submitting'
  const targetBrand = brands.find((candidate) => candidate._id === targetBrandId)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || !targetBrandId) return

    setPhase({kind: 'submitting'})
    try {
      if (action === 'duplicate') {
        const trimmed = location.trim()
        const result = await adminBrandsService.duplicateKiosk(brand._id, kiosk._id, {
          targetBrandId,
          ...(trimmed ? {location: trimmed} : {}),
        })
        setPhase({kind: 'duplicated', result})
        onDuplicated?.(result)
      } else {
        await adminBrandsService.moveKiosk(brand._id, kiosk._id, {targetBrandId})
        // The backend has no success path yet; reaching here means the contract changed.
        onClose()
      }
    } catch (error) {
      setPhase({kind: 'error', error: toApiError(error)})
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {title} · {kiosk.location}
          </DialogTitle>
          <DialogDescription>
            {action === 'edit' ? COPY.editSoon : action === 'duplicate' ? COPY.duplicateDescription : COPY.moveDescription}
          </DialogDescription>
        </DialogHeader>

        {action === 'edit' ? (
          <DialogFooter>
            <Button type="button" onClick={onClose}>
              {COPY.close}
            </Button>
          </DialogFooter>
        ) : phase.kind === 'duplicated' ? (
          <DuplicatedResult result={phase.result} targetName={targetBrand?.name ?? phase.result.targetBrandId} onClose={onClose} />
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              {phase.kind === 'error' ? <OperationError action={action} error={phase.error} /> : null}

              <Field>
                <FieldLabel htmlFor="kiosk-action-target">{COPY.targetBrand}</FieldLabel>
                <Select value={targetBrandId} onValueChange={setTargetBrandId} disabled={submitting}>
                  <SelectTrigger id="kiosk-action-target" className="w-full">
                    <SelectValue placeholder={STRINGS.brands.selectPlaceholder} />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {targets.map((candidate) => (
                      <SelectItem key={candidate._id} value={candidate._id}>
                        <span className="truncate">{candidate.name}</span>
                        {candidate._id === brand._id ? <Badge size="xs">{kindLabel(kiosk)} actual</Badge> : null}
                        {!candidate.active ? <Badge size="xs">{STRINGS.brands.inactive}</Badge> : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {action === 'duplicate' ? (
                <Field>
                  <FieldLabel htmlFor="kiosk-action-location">{COPY.location}</FieldLabel>
                  <Input
                    id="kiosk-action-location"
                    value={location}
                    maxLength={200}
                    onChange={(event) => setLocation(event.target.value)}
                    disabled={submitting}
                  />
                </Field>
              ) : null}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  {COPY.cancel}
                </Button>
                <Button type="submit" disabled={submitting || !targetBrandId}>
                  {submitting ? (
                    <>
                      <Loader2Icon aria-hidden className="animate-spin" />
                      {COPY.submitting}
                    </>
                  ) : action === 'duplicate' ? (
                    COPY.submitDuplicate
                  ) : (
                    COPY.submitMove
                  )}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function OperationError({action, error}: {action: KioskAction; error: NormalizedApiError}) {
  const notImplemented = action === 'move' && error.code === BRAND_ERROR_CODES.MOVE_NOT_IMPLEMENTED

  return (
    <Alert variant={notImplemented ? 'default' : 'destructive'} role="alert">
      <AlertCircleIcon />
      <AlertTitle>{notImplemented ? COPY.moveTitle : COPY.resultErrorTitle}</AlertTitle>
      <AlertDescription>
        <p>{notImplemented ? COPY.moveNotImplemented : brandErrorMessage(error)}</p>
        {error.code ? <p className="font-mono text-[11px] opacity-70">{error.code}</p> : null}
      </AlertDescription>
    </Alert>
  )
}

function DuplicatedResult({result, targetName, onClose}: {result: DuplicateKioskResult; targetName: string; onClose: () => void}) {
  return (
    <div className="flex flex-col gap-4">
      <Alert role="status">
        <CheckCircle2Icon />
        <AlertTitle>{COPY.duplicated(result.kiosk.location, targetName)}</AlertTitle>
        <AlertDescription>
          <span className="font-mono text-[11px]">{result.kiosk._id}</span>
        </AlertDescription>
      </Alert>

      {result.omitted.length > 0 ? <ResultList title={COPY.omittedTitle} items={result.omitted} mono /> : null}
      <ResultList title={COPY.notCopiedTitle} items={result.notCopied} />

      <DialogFooter>
        <Button type="button" onClick={onClose}>
          {COPY.close}
        </Button>
      </DialogFooter>
    </div>
  )
}

function ResultList({title, items, mono = false}: {title: string; items: string[]; mono?: boolean}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">{title}</p>
      <ul className={mono ? 'flex flex-col gap-1 font-mono text-xs' : 'flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground'}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
