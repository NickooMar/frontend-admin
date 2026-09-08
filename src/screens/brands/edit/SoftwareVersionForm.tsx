import {PlusIcon} from 'lucide-react'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {STRINGS} from '@/lib/strings'
import type {VersionRow} from './kioskEditModel'
import {RemoveButton} from './FormBits'

const COPY = STRINGS.brands.edit.version

export function SoftwareVersionForm({
  rows,
  onChange,
  disabled,
}: {
  rows: VersionRow[]
  onChange: (rows: VersionRow[]) => void
  disabled?: boolean
}) {
  const update = (index: number, patch: Partial<VersionRow>) => onChange(rows.map((row, i) => (i === index ? {...row, ...patch} : row)))
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index))
  const add = () => onChange([...rows, {key: '', value: '', required: false, known: false}])

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-x-3 gap-y-2 text-xs">
        <span className="text-muted-foreground">{COPY.key}</span>
        <span className="text-muted-foreground">{COPY.value}</span>
        <span aria-hidden className="w-7" />

        {rows.map((row, index) => (
          <RowFields
            key={row.known ? row.key : `extra-${index}`}
            row={row}
            index={index}
            disabled={disabled}
            onUpdate={update}
            onRemove={remove}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={add} disabled={disabled} className="self-start">
        <PlusIcon aria-hidden data-icon="inline-start" />
        {COPY.add}
      </Button>
    </div>
  )
}

function RowFields({
  row,
  index,
  disabled,
  onUpdate,
  onRemove,
}: {
  row: VersionRow
  index: number
  disabled?: boolean
  onUpdate: (index: number, patch: Partial<VersionRow>) => void
  onRemove: (index: number) => void
}) {
  const keyLabel = `${COPY.key} ${index + 1}`
  const valueLabel = `${COPY.value} ${row.key || index + 1}`

  return (
    <>
      {row.known ? (
        <span className="flex min-w-0 items-center gap-1.5 font-mono text-xs">
          <span className="truncate">{row.key}</span>
          {row.required ? <Badge size="xs">{COPY.required}</Badge> : null}
        </span>
      ) : (
        <Input
          aria-label={keyLabel}
          value={row.key}
          placeholder={COPY.keyPlaceholder}
          disabled={disabled}
          onChange={(event) => onUpdate(index, {key: event.target.value})}
          className="h-8 font-mono text-xs"
        />
      )}
      <Input
        aria-label={valueLabel}
        value={row.value}
        placeholder={COPY.valuePlaceholder}
        disabled={disabled}
        aria-required={row.required}
        onChange={(event) => onUpdate(index, {value: event.target.value})}
        className="h-8 font-mono text-xs"
      />
      {row.known ? (
        <span aria-hidden className="w-7" />
      ) : (
        <RemoveButton label={`${COPY.remove} ${row.key || index + 1}`} onClick={() => onRemove(index)} disabled={disabled} />
      )}
    </>
  )
}
