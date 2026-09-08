import {PlusIcon} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Checkbox} from '@/components/ui/checkbox'
import {Label} from '@/components/ui/label'
import {Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from '@/components/ui/select'
import {Switch} from '@/components/ui/switch'
import {Textarea} from '@/components/ui/textarea'
import {
  DEVICE_DATA_FIELDS_BY_TYPE,
  DEVICE_SUBTYPES,
  DEVICE_TYPES,
  deviceKindKey,
  KIOSK_DEVICE_CATALOG,
  kioskDeviceUsesLabel,
} from '@/data/kioskDeviceCatalog'
import {STRINGS} from '@/lib/strings'
import {CUSTOM_DEVICE, type DeviceDraft, emptyDeviceDraft, nextUid} from './kioskEditModel'
import {EntryCard, RemoveButton, SectionTitle, TextField} from './FormBits'

const COPY = STRINGS.brands.edit.devices

const GROUPS = DEVICE_TYPES.flatMap((type) =>
  DEVICE_SUBTYPES[type].map((subType) => ({
    key: deviceKindKey(type, subType),
    label: `${type} · ${subType}`,
    entries: KIOSK_DEVICE_CATALOG.filter((entry) => entry.type === type && entry.subType === subType),
  })),
).filter((group) => group.entries.length > 0)

const DATA_LABELS: Record<string, string> = {
  softwareWindow: COPY.softwareWindow,
  softwareExecutable: COPY.softwareExecutable,
  resultsDir: COPY.resultsDir,
  configDir: COPY.configDir,
  initialPlanId: COPY.initialPlanId,
  applicationId: COPY.applicationId,
  quizName: COPY.quizName,
  dependencies: COPY.dependencies,
}

export function DevicesForm({
  drafts,
  onChange,
  disabled,
}: {
  drafts: DeviceDraft[]
  onChange: (drafts: DeviceDraft[]) => void
  disabled?: boolean
}) {
  const update = (uid: string, patch: Partial<DeviceDraft>) =>
    onChange(drafts.map((draft) => (draft.uid === uid ? {...draft, ...patch} : draft)))
  const remove = (uid: string) => onChange(drafts.filter((draft) => draft.uid !== uid))
  const add = () => onChange([...drafts, emptyDeviceDraft()])

  /** Picking a catalog entry fills identity and defaults; the LED and label stay editable afterwards. */
  const pickCatalog = (draft: DeviceDraft, value: string) => {
    if (value === CUSTOM_DEVICE) {
      update(draft.uid, {catalog: CUSTOM_DEVICE})
      return
    }
    const entry = KIOSK_DEVICE_CATALOG.find((candidate) => candidate.name === value)
    if (!entry) return
    const data = Object.fromEntries(
      Object.entries(entry.defaultData).map(([key, defaultValue]) => [
        key,
        Array.isArray(defaultValue) ? defaultValue.join(', ') : String(defaultValue ?? ''),
      ]),
    )
    update(draft.uid, {
      catalog: entry.name,
      type: entry.type,
      subType: entry.subType,
      name: entry.name,
      nameToShow: draft.nameToShow || entry.label,
      ledNumber: entry.defaultLedNumber === null ? '' : String(entry.defaultLedNumber),
      data: {...data, ...(draft.data.label !== undefined ? {label: draft.data.label} : {})},
      uid: draft.uid || nextUid(),
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {drafts.length === 0 ? <p className="text-sm text-muted-foreground">{COPY.empty}</p> : null}

      {drafts.map((draft, index) => {
        const isCustom = draft.catalog === CUSTOM_DEVICE
        const usesLabel = kioskDeviceUsesLabel(draft.type, draft.subType)
        const extraKeys = DEVICE_DATA_FIELDS_BY_TYPE[deviceKindKey(draft.type, draft.subType)] ?? []
        const isVideo = draft.subType === 'video'
        const subTypes = (DEVICE_SUBTYPES as Record<string, readonly string[]>)[draft.type] ?? []
        const title = draft.nameToShow || draft.name || `${COPY.catalog} ${index + 1}`

        return (
          <EntryCard key={draft.uid}>
            <div className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs text-muted-foreground">{COPY.catalog}</span>
                <Select value={draft.catalog} onValueChange={(value) => pickCatalog(draft, value)} disabled={disabled}>
                  <SelectTrigger aria-label={`${COPY.catalog} ${index + 1}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value={CUSTOM_DEVICE}>{COPY.custom}</SelectItem>
                    {GROUPS.map((group) => (
                      <SelectGroup key={group.key}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.entries.map((entry) => (
                          <SelectItem key={entry.name} value={entry.name}>
                            {entry.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Label className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                  {COPY.enabled}
                  <Switch
                    aria-label={`${COPY.enabled} ${title}`}
                    checked={draft.isEnabled}
                    onCheckedChange={(isEnabled) => update(draft.uid, {isEnabled})}
                    disabled={disabled}
                  />
                </Label>
                <RemoveButton label={`${COPY.remove} ${title}`} onClick={() => remove(draft.uid)} disabled={disabled} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label={COPY.nameToShow}
                value={draft.nameToShow}
                onChange={(nameToShow) => update(draft.uid, {nameToShow})}
                disabled={disabled}
              />
              <TextField
                label={COPY.name}
                value={draft.name}
                onChange={(name) => update(draft.uid, {name})}
                disabled={disabled || !isCustom}
                mono
              />

              {isCustom ? (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{COPY.type}</span>
                    <Select
                      value={draft.type || undefined}
                      onValueChange={(type) => update(draft.uid, {type, subType: ''})}
                      disabled={disabled}>
                      <SelectTrigger aria-label={`${COPY.type} ${index + 1}`} className="w-full">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {DEVICE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{COPY.subType}</span>
                    <Select
                      value={draft.subType || undefined}
                      onValueChange={(subType) => update(draft.uid, {subType})}
                      disabled={disabled || !draft.type}>
                      <SelectTrigger aria-label={`${COPY.subType} ${index + 1}`} className="w-full">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {subTypes.map((subType) => (
                          <SelectItem key={subType} value={subType}>
                            {subType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  {COPY.type}: <span className="font-mono">{draft.type}</span> · {COPY.subType}:{' '}
                  <span className="font-mono">{draft.subType}</span>
                </p>
              )}

              {usesLabel ? (
                <>
                  <TextField
                    label={COPY.label}
                    value={draft.data.label ?? ''}
                    onChange={(label) => update(draft.uid, {data: {...draft.data, label}})}
                    hint={COPY.labelHint}
                    disabled={disabled}
                    mono
                  />
                  <TextField
                    label={COPY.ledNumber}
                    value={draft.ledNumber}
                    onChange={(ledNumber) => update(draft.uid, {ledNumber: ledNumber.replace(/[^0-9]/g, '')})}
                    disabled={disabled}
                  />
                </>
              ) : null}

              {extraKeys.map((key) => (
                <TextField
                  key={key}
                  label={DATA_LABELS[key] ?? key}
                  value={draft.data[key] ?? ''}
                  onChange={(value) => update(draft.uid, {data: {...draft.data, [key]: value}})}
                  disabled={disabled}
                  mono
                  className={key === 'softwareExecutable' || key === 'dependencies' ? 'sm:col-span-2' : undefined}
                />
              ))}
            </div>

            {isVideo ? (
              <div className="flex flex-col gap-2 border-t pt-3">
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id={`${draft.uid}-video-analysis`}
                    checked={draft.videoAnalysis}
                    onCheckedChange={(checked) => update(draft.uid, {videoAnalysis: checked === true})}
                    disabled={disabled}
                  />
                  <Label htmlFor={`${draft.uid}-video-analysis`} className="font-normal">
                    {COPY.videoAnalysis}
                  </Label>
                </div>
                {draft.videoAnalysis ? (
                  <Textarea
                    aria-label={`${COPY.analysisContext} ${title}`}
                    value={draft.analysisContext}
                    placeholder={COPY.analysisContextPlaceholder}
                    onChange={(event) => update(draft.uid, {analysisContext: event.target.value})}
                    disabled={disabled}
                    rows={3}
                  />
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                id={`${draft.uid}-kiosk-mode`}
                checked={draft.compatibleWithKioskMode}
                onCheckedChange={(checked) => update(draft.uid, {compatibleWithKioskMode: checked === true})}
                disabled={disabled}
              />
              <Label htmlFor={`${draft.uid}-kiosk-mode`} className="font-normal">
                {COPY.compatibleWithKioskMode}
              </Label>
            </div>
          </EntryCard>
        )
      })}

      <div className="flex items-center justify-between">
        <SectionTitle>{`${drafts.length} ${drafts.length === 1 ? 'dispositivo' : 'dispositivos'}`}</SectionTitle>
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={disabled}>
          <PlusIcon aria-hidden data-icon="inline-start" />
          {COPY.add}
        </Button>
      </div>
    </div>
  )
}
