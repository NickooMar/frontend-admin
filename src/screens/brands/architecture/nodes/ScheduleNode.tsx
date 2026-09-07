import {Handle, type NodeProps, Position} from '@xyflow/react'
import {CalendarDaysIcon, ClockIcon, UsersRoundIcon} from 'lucide-react'
import {memo} from 'react'
import {Badge} from '@/components/ui/badge'
import {STRINGS} from '@/lib/strings'
import {cn} from '@/lib/utils'
import type {ScheduleFlowNode} from '../buildGraph'
import {NodeRow} from './NodeRow'

const COPY = STRINGS.brands.schedule

export const SCHEDULE_TILE = 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'

export const ScheduleNode = memo(function ScheduleNode({data, selected}: NodeProps<ScheduleFlowNode>) {
  const palette = data.colorPalette
  const swatch =
    palette?.background || palette?.iconColor
      ? {backgroundColor: palette.background ?? undefined, color: palette.iconColor ?? undefined}
      : undefined

  return (
    <article
      aria-label={`${STRINGS.brands.kinds.schedule} ${data.name}`}
      data-testid={`schedule-node-${data._id}`}
      className={cn(
        'w-62 rounded-xl bg-card text-left text-card-foreground shadow-sm ring-1 transition-shadow',
        selected ? 'shadow-md ring-ring' : 'ring-foreground/10',
        data.deleted && 'opacity-60',
      )}>
      <header className="flex items-start gap-2.5 px-3.5 pt-3 pb-2.5">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-md', !swatch && SCHEDULE_TILE)} style={swatch}>
          <CalendarDaysIcon aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-5 font-semibold">{data.name}</p>
          {data.specialty ? <p className="truncate text-xs text-muted-foreground">{data.specialty}</p> : null}
          {data.isUrgencyDefault || data.deleted ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {data.isUrgencyDefault ? <Badge size="xs">{COPY.urgency}</Badge> : null}
              {data.deleted ? (
                <Badge size="xs" className="bg-destructive/10 text-destructive">
                  {COPY.deleted}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col border-t">
        <NodeRow icon={UsersRoundIcon}>{data.linkedUserCount > 0 ? COPY.users(data.linkedUserCount) : COPY.noUsers}</NodeRow>
        {data.hasAvailability ? <NodeRow icon={ClockIcon}>{COPY.availability}</NodeRow> : null}
      </div>

      <Handle type="target" position={Position.Left} isConnectable={false} />
    </article>
  )
})
