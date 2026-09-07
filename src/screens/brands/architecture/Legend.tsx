import {CalendarDaysIcon, FolderOpenIcon, MonitorIcon, PanelsTopLeftIcon} from 'lucide-react'
import {STRINGS} from '@/lib/strings'
import {cn} from '@/lib/utils'
import {KIOSK_TILE} from './nodes/KioskNode'
import {SCHEDULE_TILE} from './nodes/ScheduleNode'

const ITEMS = [
  {label: STRINGS.brands.kinds.kiosk, icon: MonitorIcon, tile: KIOSK_TILE.KIOSK},
  {label: STRINGS.brands.kinds.multi, icon: PanelsTopLeftIcon, tile: KIOSK_TILE.MULTI},
  {label: STRINGS.brands.kinds.schedule, icon: CalendarDaysIcon, tile: SCHEDULE_TILE},
  {
    label: STRINGS.brands.kinds.institution,
    icon: FolderOpenIcon,
    tile: 'border border-dashed border-emerald-500/50 text-emerald-700 dark:text-emerald-300',
  },
] as const

export function Legend({className}: {className?: string}) {
  return (
    <aside
      aria-label={STRINGS.brands.legend.title}
      className={cn(
        'flex flex-col gap-1.5 rounded-lg bg-popover/95 p-2.5 text-xs shadow-sm ring-1 ring-foreground/10 backdrop-blur',
        className,
      )}>
      {ITEMS.map(({label, icon: Icon, tile}) => (
        <div key={label} className="flex items-center gap-2">
          <span className={cn('grid size-5 place-items-center rounded-sm', tile)}>
            <Icon aria-hidden className="size-3" />
          </span>
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
      <div className="mt-0.5 flex items-center gap-2 border-t pt-1.5">
        <svg aria-hidden="true" role="presentation" viewBox="0 0 20 8" className="h-2 w-5 shrink-0 text-muted-foreground">
          <path d="M0 4h20" stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 3" />
        </svg>
        <span className="text-muted-foreground">{STRINGS.brands.legend.edge}</span>
      </div>
    </aside>
  )
}
