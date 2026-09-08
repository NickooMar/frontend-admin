import {PlusIcon, XIcon} from 'lucide-react'
import {useState} from 'react'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {Textarea} from '@/components/ui/textarea'
import {
  AVAILABLE_EXAM_CATALOG,
  AVAILABLE_EXAM_DEVICE_OPTIONS,
  AVAILABLE_EXAM_LIMITS,
  AVAILABLE_EXAM_SUBTYPES,
  normalizeExamType,
} from '@/data/availableExamCatalog'
import {STRINGS} from '@/lib/strings'
import {CUSTOM_EXAM, emptyExamDraft, type ExamDraft} from './kioskEditModel'
import {EntryCard, RemoveButton, SectionTitle, TextField} from './FormBits'

const COPY = STRINGS.brands.edit.exams
const NONE = '__none__'

export function AvailableExamsForm({
  drafts,
  onChange,
  kioskDeviceNames,
  disabled,
}: {
  drafts: ExamDraft[]
  onChange: (drafts: ExamDraft[]) => void
  /** Names of the kiosk's own devices, offered first when linking an exam. */
  kioskDeviceNames: string[]
  disabled?: boolean
}) {
  const update = (uid: string, patch: Partial<ExamDraft>) =>
    onChange(drafts.map((draft) => (draft.uid === uid ? {...draft, ...patch} : draft)))
  const remove = (uid: string) => onChange(drafts.filter((draft) => draft.uid !== uid))
  const add = () => onChange([...drafts, emptyExamDraft()])

  const pickCatalog = (draft: ExamDraft, value: string) => {
    if (value === CUSTOM_EXAM) {
      update(draft.uid, {catalog: CUSTOM_EXAM})
      return
    }
    const entry = AVAILABLE_EXAM_CATALOG.find((candidate) => candidate.type === value)
    if (!entry) return
    update(draft.uid, {catalog: entry.type, type: entry.type, name: entry.label, subtype: entry.subtype ?? '', devices: [...entry.devices]})
  }

  const deviceOptions = [...new Set([...kioskDeviceNames, ...AVAILABLE_EXAM_DEVICE_OPTIONS])]

  return (
    <div className="flex flex-col gap-3">
      {drafts.length === 0 ? <p className="text-sm text-muted-foreground">{COPY.empty}</p> : null}

      {drafts.map((draft, index) => {
        const isCustom = draft.catalog === CUSTOM_EXAM
        const title = draft.name || draft.type || `${COPY.catalog} ${index + 1}`
        const isAi = draft.subtype === 'AI_ASSISTED'

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
                    <SelectItem value={CUSTOM_EXAM}>{COPY.custom}</SelectItem>
                    {AVAILABLE_EXAM_CATALOG.map((entry) => (
                      <SelectItem key={entry.type} value={entry.type}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-5">
                <RemoveButton label={`${COPY.remove} ${title}`} onClick={() => remove(draft.uid)} disabled={disabled} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label={COPY.type}
                value={draft.type}
                onChange={(type) => update(draft.uid, {type: normalizeExamType(type)})}
                maxLength={AVAILABLE_EXAM_LIMITS.type}
                disabled={disabled || !isCustom}
                mono
              />
              <TextField
                label={COPY.name}
                value={draft.name}
                onChange={(name) => update(draft.uid, {name})}
                maxLength={AVAILABLE_EXAM_LIMITS.name}
                disabled={disabled}
              />

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{COPY.subtype}</span>
                <Select
                  value={draft.subtype || NONE}
                  onValueChange={(value) => update(draft.uid, {subtype: value === NONE ? '' : value})}
                  disabled={disabled}>
                  <SelectTrigger aria-label={`${COPY.subtype} ${title}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value={NONE}>{COPY.subtypeNone}</SelectItem>
                    {AVAILABLE_EXAM_SUBTYPES.map((subtype) => (
                      <SelectItem key={subtype} value={subtype}>
                        {subtype}
                      </SelectItem>
                    ))}
                    {draft.subtype && !(AVAILABLE_EXAM_SUBTYPES as readonly string[]).includes(draft.subtype) ? (
                      <SelectItem value={draft.subtype}>{draft.subtype}</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
              <p className="self-end text-xs text-muted-foreground">{COPY.instructions(draft.instructions.length)}</p>
            </div>

            <DevicePicker
              title={title}
              selected={draft.devices}
              options={deviceOptions}
              disabled={disabled}
              onChange={(devices) => update(draft.uid, {devices})}
            />

            {isAi ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{COPY.customPrompt}</span>
                <Textarea
                  aria-label={`${COPY.customPrompt} ${title}`}
                  value={draft.customPrompt}
                  maxLength={AVAILABLE_EXAM_LIMITS.customPrompt}
                  onChange={(event) => update(draft.uid, {customPrompt: event.target.value})}
                  disabled={disabled}
                  rows={3}
                />
                <span className="text-[11px] text-muted-foreground">{COPY.customPromptHint}</span>
              </div>
            ) : null}
          </EntryCard>
        )
      })}

      <div className="flex items-center justify-between">
        <SectionTitle>{`${drafts.length} ${drafts.length === 1 ? 'examen' : 'exámenes'}`}</SectionTitle>
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={disabled}>
          <PlusIcon aria-hidden data-icon="inline-start" />
          {COPY.add}
        </Button>
      </div>
    </div>
  )
}

function DevicePicker({
  title,
  selected,
  options,
  onChange,
  disabled,
}: {
  title: string
  selected: string[]
  options: string[]
  onChange: (devices: string[]) => void
  disabled?: boolean
}) {
  const [custom, setCustom] = useState('')
  const remaining = options.filter((option) => !selected.includes(option))

  const addCustom = () => {
    const name = custom.trim()
    if (!name) return
    if (!selected.includes(name)) onChange([...selected, name])
    setCustom('')
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{COPY.devices}</span>
      <div className="flex flex-wrap gap-1.5">
        {selected.map((device) => (
          <Badge key={device} size="md" variant="neutral" className="gap-1 pr-1 font-mono">
            {device}
            <button
              type="button"
              aria-label={COPY.removeDevice(device)}
              disabled={disabled}
              onClick={() => onChange(selected.filter((entry) => entry !== device))}
              className="grid size-4 place-items-center rounded-full hover:bg-foreground/10">
              <XIcon aria-hidden className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value="" onValueChange={(device) => onChange([...selected, device])} disabled={disabled || remaining.length === 0}>
          <SelectTrigger aria-label={`${COPY.addDevice} ${title}`} size="sm" className="min-w-52">
            <SelectValue placeholder={COPY.addDevice} />
          </SelectTrigger>
          <SelectContent position="popper">
            {remaining.map((device) => (
              <SelectItem key={device} value={device}>
                <span className="font-mono text-xs">{device}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Input
            aria-label={`${COPY.customDevicePlaceholder} ${title}`}
            value={custom}
            placeholder={COPY.customDevicePlaceholder}
            disabled={disabled}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addCustom()
              }
            }}
            className="h-7 w-48 font-mono text-xs"
          />
          <Button type="button" variant="outline" size="sm" onClick={addCustom} disabled={disabled || !custom.trim()}>
            <PlusIcon aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}
