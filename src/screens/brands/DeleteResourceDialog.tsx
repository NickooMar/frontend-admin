import {AlertCircleIcon, Loader2Icon, Trash2Icon, TriangleAlertIcon} from 'lucide-react'
import {type FormEvent, useId, useState} from 'react'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import {Field, FieldGroup, FieldLabel} from '@/components/ui/field'
import {Input} from '@/components/ui/input'
import {type NormalizedApiError, toApiError} from '@/lib/api'
import {STRINGS} from '@/lib/strings'
import {adminBrandsService} from '@/services/adminBrandsService'
import {
  type AdminBrandSummary,
  BRAND_ERROR_CODES,
  type DeleteResourceResult,
  type KioskNodeData,
  type ScheduleNodeData,
} from '@/types/brands'
import {brandErrorMessage} from './KioskActionDialog'

const COPY = STRINGS.brands.delete

/** The card the admin asked to delete, normalized so the dialog does not branch on the node kind. */
export type DeletionTarget = {kind: 'kiosk'; kiosk: KioskNodeData} | {kind: 'schedule'; schedule: ScheduleNodeData}

export const targetId = (target: DeletionTarget): string => (target.kind === 'kiosk' ? target.kiosk._id : target.schedule._id)

export const targetName = (target: DeletionTarget): string => (target.kind === 'kiosk' ? target.kiosk.location : target.schedule.name)

function targetKindLabel(target: DeletionTarget): string {
  if (target.kind === 'schedule') return STRINGS.brands.kinds.schedule
  return target.kiosk.type === 'MULTI' ? STRINGS.brands.kinds.multi : STRINGS.brands.kinds.kiosk
}

/**
 * What stops being reachable once the flag flips. Everything here already comes
 * with the canvas payload, so the dialog never has to fetch to explain itself.
 */
export function deletionImpact(target: DeletionTarget): string[] {
  if (target.kind === 'schedule') {
    const {schedule} = target
    return [
      schedule.linkedUserCount > 0 ? COPY.impact.scheduleUsers(schedule.linkedUserCount) : null,
      schedule.hasAvailability ? COPY.impact.availability : null,
      schedule.isUrgencyDefault ? COPY.impact.urgency : null,
    ].filter((line): line is string => line !== null)
  }

  const {kiosk} = target
  return [
    kiosk.activeSession ? COPY.impact.activeSession : null,
    kiosk.examCount > 0 ? COPY.impact.exams(kiosk.examCount) : null,
    kiosk.linkedUsers.length > 0 ? COPY.impact.accounts(kiosk.linkedUsers.length) : null,
  ].filter((line): line is string => line !== null)
}

/** Same normalization the backend applies, so the button enables exactly when the request would be accepted. */
const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')

export interface DeleteResourceDialogProps {
  target: DeletionTarget
  brand: AdminBrandSummary
  onClose: () => void
  onDeleted?: (result: DeleteResourceResult) => void
}

/**
 * Type-to-confirm deletion. The admin has to write the resource's own name
 * before the button enables, and the same string travels in the request body so
 * the server refuses a stale card instead of trusting the id alone. The write
 * itself is logical — `deleted: true`, nothing is dropped.
 */
export function DeleteResourceDialog({target, brand, onClose, onDeleted}: DeleteResourceDialogProps) {
  const inputId = useId()
  const [confirmName, setConfirmName] = useState('')
  const [error, setError] = useState<NormalizedApiError | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const name = targetName(target)
  const impact = deletionImpact(target)
  const confirmed = normalize(confirmName) === normalize(name) && name.trim().length > 0
  const touched = confirmName.trim().length > 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!confirmed || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      const id = targetId(target)
      const result =
        target.kind === 'kiosk'
          ? await adminBrandsService.deleteKiosk(brand._id, id, {confirmName})
          : await adminBrandsService.deleteSchedule(brand._id, id, {confirmName})
      onDeleted?.(result)
      onClose()
    } catch (caught) {
      setError(toApiError(caught))
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {COPY.title(targetKindLabel(target))} · {name}
          </DialogTitle>
          <DialogDescription>{COPY.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            {error ? (
              <Alert variant="destructive" role="alert">
                <AlertCircleIcon />
                <AlertTitle>{COPY.errorTitle}</AlertTitle>
                <AlertDescription>
                  <p>{error.code === BRAND_ERROR_CODES.KIOSK_BUSY ? COPY.kioskBlocked : brandErrorMessage(error)}</p>
                  {error.code ? <p className="font-mono text-[11px] opacity-70">{error.code}</p> : null}
                </AlertDescription>
              </Alert>
            ) : null}

            {impact.length > 0 ? (
              <Alert role="status" className="border-amber-500/30 bg-amber-500/5">
                <TriangleAlertIcon className="text-amber-600 dark:text-amber-400" />
                <AlertTitle>{COPY.impactTitle}</AlertTitle>
                <AlertDescription>
                  <ul className="flex list-disc flex-col gap-0.5 pl-4">
                    {impact.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <FieldLabel htmlFor={inputId}>{COPY.confirmLabel(name)}</FieldLabel>
              <Input
                id={inputId}
                value={confirmName}
                autoComplete="off"
                placeholder={COPY.confirmPlaceholder}
                maxLength={200}
                disabled={submitting}
                aria-invalid={touched && !confirmed}
                aria-describedby={touched && !confirmed ? `${inputId}-hint` : undefined}
                onChange={(event) => setConfirmName(event.target.value)}
              />
              {touched && !confirmed ? (
                <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
                  {COPY.confirmMismatch}
                </p>
              ) : null}
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                {COPY.cancel}
              </Button>
              <Button type="submit" variant="destructive" disabled={!confirmed || submitting}>
                {submitting ? <Loader2Icon aria-hidden className="animate-spin" /> : <Trash2Icon aria-hidden />}
                {submitting ? COPY.submitting : COPY.submit}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
