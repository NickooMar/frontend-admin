import {Badge} from '@/components/ui/badge'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {formatDateTime} from '@/lib/format'
import {STRINGS} from '@/lib/strings'
import {type AdminKioskDetail, KIOSK_STATUSES} from '@/types/brands'
import type {DataDraft} from './kioskEditModel'
import {SectionTitle, TextField} from './FormBits'

const COPY = STRINGS.brands.edit.data
const KIOSK_COPY = STRINGS.brands.kiosk

export function KioskDataForm({
  draft,
  onChange,
  detail,
  disabled,
}: {
  draft: DataDraft
  onChange: (draft: DataDraft) => void
  detail: AdminKioskDetail
  disabled?: boolean
}) {
  const calibrations = Array.isArray(detail.measurementCalibrations) ? detail.measurementCalibrations.length : 0

  return (
    <div className="flex flex-col gap-4">
      <TextField
        label={COPY.location}
        value={draft.location}
        onChange={(location) => onChange({...draft, location})}
        maxLength={200}
        disabled={disabled}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{COPY.type}</span>
          <Select
            value={draft.type}
            onValueChange={(type) => onChange({...draft, type: type === 'MULTI' ? 'MULTI' : 'KIOSK'})}
            disabled={disabled}>
            <SelectTrigger aria-label={COPY.type} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="KIOSK">{STRINGS.brands.kinds.kiosk}</SelectItem>
              <SelectItem value="MULTI">{STRINGS.brands.kinds.multi}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{COPY.status}</span>
          <Select value={draft.status} onValueChange={(status) => onChange({...draft, status})} disabled={disabled}>
            <SelectTrigger aria-label={COPY.status} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {KIOSK_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {KIOSK_COPY.status[status] ?? status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t pt-3">
        <SectionTitle>{COPY.info}</SectionTitle>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          <dt className="text-muted-foreground">{COPY.id}</dt>
          <dd className="font-mono">{detail._id}</dd>
          <dt className="text-muted-foreground">{COPY.connection}</dt>
          <dd>
            <Badge size="xs" variant={detail.connected ? 'neutral' : 'muted'}>
              {detail.connected ? KIOSK_COPY.connected : KIOSK_COPY.disconnected}
            </Badge>
          </dd>
          <dt className="text-muted-foreground">{COPY.lastConnected}</dt>
          <dd>{formatDateTime(detail.lastConnected) ?? COPY.never}</dd>
          <dt className="text-muted-foreground">{COPY.lastDisconnected}</dt>
          <dd>{formatDateTime(detail.lastDisconnected) ?? COPY.never}</dd>
          <dt className="text-muted-foreground">{COPY.zoom}</dt>
          <dd>{detail.zoomFactor ?? 1}</dd>
          <dt className="text-muted-foreground">{KIOSK_COPY.editSections.devices}</dt>
          <dd>{COPY.calibrations(calibrations)}</dd>
        </dl>
      </div>
    </div>
  )
}
