import {AlertCircleIcon, CheckCircle2Icon, Loader2Icon} from 'lucide-react'
import {type FormEvent, useEffect, useMemo, useState} from 'react'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import {Skeleton} from '@/components/ui/skeleton'
import {findAvailableExamCatalogEntry} from '@/data/availableExamCatalog'
import {matchKioskDeviceCatalogEntry} from '@/data/kioskDeviceCatalog'
import {type NormalizedApiError, toApiError} from '@/lib/api'
import {STRINGS} from '@/lib/strings'
import {adminBrandsService} from '@/services/adminBrandsService'
import type {AdminBrandSummary, AdminKioskDetail, KioskEditSection, KioskNodeData, KioskSectionBodies} from '@/types/brands'
import {brandErrorMessage} from '../KioskActionDialog'
import {AvailableExamsForm} from './AvailableExamsForm'
import {DevicesForm} from './DevicesForm'
import {KioskDataForm} from './KioskDataForm'
import {
  type DataDraft,
  dataBodyFromDraft,
  dataDraftFromDetail,
  type DeviceDraft,
  deviceDraftFrom,
  devicesBodyFromDraft,
  devicesToArray,
  type ExamDraft,
  examDraftFrom,
  examsBodyFromDraft,
  type ParamsDraft,
  paramsBodyFromDraft,
  paramsDraftFromDetail,
  sectionLabel,
  type VersionRow,
  versionBodyFromDraft,
  versionDraftFromDetail,
} from './kioskEditModel'
import {ParamsForm} from './ParamsForm'
import {SoftwareVersionForm} from './SoftwareVersionForm'

const COPY = STRINGS.brands.edit

type Draft =
  | {section: 'data'; value: DataDraft}
  | {section: 'version'; value: VersionRow[]}
  | {section: 'devices'; value: DeviceDraft[]}
  | {section: 'availableExams'; value: ExamDraft[]}
  | {section: 'params'; value: ParamsDraft}

type Phase =
  | {kind: 'loading'}
  | {kind: 'loadError'; error: NormalizedApiError}
  | {kind: 'editing'}
  | {kind: 'saving'}
  | {kind: 'saved'}
  | {kind: 'invalid'; message: string}
  | {kind: 'saveError'; error: NormalizedApiError}

export function draftFromDetail(section: KioskEditSection, detail: AdminKioskDetail): Draft {
  switch (section) {
    case 'data':
      return {section, value: dataDraftFromDetail(detail)}
    case 'version':
      return {section, value: versionDraftFromDetail(detail)}
    case 'devices':
      return {
        section,
        value: devicesToArray(detail.devices).map((device) => deviceDraftFrom(device, matchKioskDeviceCatalogEntry(device)?.name)),
      }
    case 'availableExams':
      return {section, value: detail.availableExams.map((exam) => examDraftFrom(exam, Boolean(findAvailableExamCatalogEntry(exam.type))))}
    case 'params':
      return {section, value: paramsDraftFromDetail(detail)}
  }
}

type BodyResult = {body: KioskSectionBodies[KioskEditSection]} | {error: string}

export function bodyFromDraft(draft: Draft): BodyResult {
  switch (draft.section) {
    case 'data':
      return dataBodyFromDraft(draft.value)
    case 'version':
      return versionBodyFromDraft(draft.value)
    case 'devices':
      return devicesBodyFromDraft(draft.value)
    case 'availableExams':
      return examsBodyFromDraft(draft.value)
    case 'params':
      return paramsBodyFromDraft(draft.value)
  }
}

export interface KioskEditDialogProps {
  section: KioskEditSection
  kiosk: KioskNodeData
  brand: AdminBrandSummary
  onClose: () => void
  /** A section was saved; the canvas refreshes because location/type/status feed the cards. */
  onSaved?: (kiosk: AdminKioskDetail) => void
}

/**
 * One modal per editable section. Loads the full kiosk on open (the canvas
 * payload is a projection), edits a local draft, and saves through the
 * section's own PATCH endpoint — the same contract the brand panel uses.
 */
export function KioskEditDialog({section, kiosk, brand, onClose, onSaved}: KioskEditDialogProps) {
  const [detail, setDetail] = useState<AdminKioskDetail | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [phase, setPhase] = useState<Phase>({kind: 'loading'})

  useEffect(() => {
    let cancelled = false
    setPhase({kind: 'loading'})
    adminBrandsService
      .getKiosk(brand._id, kiosk._id)
      .then((loaded) => {
        if (cancelled) return
        setDetail(loaded)
        setDraft(draftFromDetail(section, loaded))
        setPhase({kind: 'editing'})
      })
      .catch((error: unknown) => {
        if (!cancelled) setPhase({kind: 'loadError', error: toApiError(error)})
      })
    return () => {
      cancelled = true
    }
  }, [brand._id, kiosk._id, section])

  const kioskDeviceNames = useMemo(
    () =>
      detail
        ? devicesToArray(detail.devices)
            .map((device) => device.name?.trim() ?? '')
            .filter(Boolean)
        : [],
    [detail],
  )

  const busy = phase.kind === 'loading' || phase.kind === 'saving'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft || busy) return

    const result = bodyFromDraft(draft)
    if ('error' in result) {
      setPhase({kind: 'invalid', message: result.error})
      return
    }

    setPhase({kind: 'saving'})
    try {
      const updated = await adminBrandsService.updateKioskSection(brand._id, kiosk._id, draft.section, result.body as never)
      setDetail(updated)
      setDraft(draftFromDetail(section, updated))
      setPhase({kind: 'saved'})
      onSaved?.(updated)
    } catch (error) {
      setPhase({kind: 'saveError', error: toApiError(error)})
    }
  }

  const updateDraft = (value: Draft['value']) => {
    setDraft((current) => (current ? ({...current, value} as Draft) : current))
    if (phase.kind === 'saved' || phase.kind === 'invalid' || phase.kind === 'saveError') setPhase({kind: 'editing'})
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {sectionLabel(section)} · {kiosk.location}
          </DialogTitle>
          <DialogDescription>{COPY.descriptions[section]}</DialogDescription>
        </DialogHeader>

        {phase.kind === 'loading' ? (
          <div aria-busy aria-label={COPY.loading} role="status" className="flex flex-col gap-3 py-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : phase.kind === 'loadError' ? (
          <>
            <Alert variant="destructive" role="alert">
              <AlertCircleIcon />
              <AlertTitle>{COPY.loadError}</AlertTitle>
              <AlertDescription>{brandErrorMessage(phase.error)}</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {COPY.close}
              </Button>
            </DialogFooter>
          </>
        ) : detail && draft ? (
          <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
            {phase.kind === 'invalid' ? (
              <Alert variant="destructive" role="alert">
                <AlertCircleIcon />
                <AlertTitle>{COPY.validationTitle}</AlertTitle>
                <AlertDescription>{phase.message}</AlertDescription>
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
            ) : phase.kind === 'saved' ? (
              <Alert role="status">
                <CheckCircle2Icon />
                <AlertTitle>{COPY.saved}</AlertTitle>
              </Alert>
            ) : null}

            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
              {draft.section === 'data' ? (
                <KioskDataForm draft={draft.value} onChange={updateDraft} detail={detail} disabled={busy} />
              ) : draft.section === 'version' ? (
                <SoftwareVersionForm rows={draft.value} onChange={updateDraft} disabled={busy} />
              ) : draft.section === 'devices' ? (
                <DevicesForm drafts={draft.value} onChange={updateDraft} disabled={busy} />
              ) : draft.section === 'availableExams' ? (
                <AvailableExamsForm drafts={draft.value} onChange={updateDraft} kioskDeviceNames={kioskDeviceNames} disabled={busy} />
              ) : (
                <ParamsForm draft={draft.value} onChange={updateDraft} detail={detail} disabled={busy} />
              )}
            </div>

            <DialogFooter className="border-t pt-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={phase.kind === 'saving'}>
                {COPY.cancel}
              </Button>
              <Button type="submit" disabled={busy}>
                {phase.kind === 'saving' ? (
                  <>
                    <Loader2Icon aria-hidden className="animate-spin" />
                    {COPY.saving}
                  </>
                ) : (
                  COPY.save
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
