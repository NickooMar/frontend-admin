import {Trash2Icon} from 'lucide-react'
import {useId} from 'react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Switch} from '@/components/ui/switch'
import {cn} from '@/lib/utils'

/** Small building blocks shared by the kiosk edit forms. */

export function SectionTitle({children, className}: {children: React.ReactNode; className?: string}) {
  return <h3 className={cn('text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase', className)}>{children}</h3>
}

export function SwitchRow({
  label,
  checked,
  onCheckedChange,
  disabled,
  hint,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  hint?: string
}) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex min-w-0 flex-col">
        <Label htmlFor={id} className="text-sm font-normal">
          {label}
        </Label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}

/** Numeric input bound to a number in the draft; an unparsable value becomes NaN so validation can catch it. */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled,
  className,
}: {
  label: string
  value: number | string
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isNaN(value) ? '' : value}
        min={min}
        max={max}
        step={step ?? 'any'}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))}
        className="h-8"
      />
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  maxLength,
  hint,
  className,
  mono = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  hint?: string
  className?: string
  mono?: boolean
}) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className={cn('h-8', mono && 'font-mono text-xs')}
      />
      {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
    </div>
  )
}

export function RemoveButton({label, onClick, disabled}: {label: string; onClick: () => void; disabled?: boolean}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="text-muted-foreground hover:text-destructive">
      <Trash2Icon aria-hidden />
    </Button>
  )
}

/** Bordered block for one list entry (a device, an exam). */
export function EntryCard({children, className}: {children: React.ReactNode; className?: string}) {
  return <div className={cn('flex flex-col gap-3 rounded-lg border bg-card/50 p-3', className)}>{children}</div>
}
