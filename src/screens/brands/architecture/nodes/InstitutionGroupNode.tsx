import type {NodeProps} from '@xyflow/react'
import {FolderIcon, FolderOpenIcon} from 'lucide-react'
import {memo} from 'react'
import {Badge} from '@/components/ui/badge'
import {STRINGS} from '@/lib/strings'
import {cn} from '@/lib/utils'
import type {InstitutionFlowNode} from '../buildGraph'

/** Dashed container for an institution's agendas — the «Metabase» folder in the reference design. */
export const InstitutionGroupNode = memo(function InstitutionGroupNode({data}: NodeProps<InstitutionFlowNode>) {
  const Icon = data.synthetic ? FolderIcon : FolderOpenIcon

  return (
    <section
      aria-label={`${STRINGS.brands.kinds.institution} ${data.name}`}
      data-testid={`institution-node-${data._id ?? 'none'}`}
      className={cn(
        'h-full w-full rounded-2xl border border-dashed bg-muted/30 dark:bg-muted/15',
        data.synthetic ? 'border-foreground/15' : 'border-emerald-500/40',
      )}>
      <header className="flex h-11 items-center gap-2 px-3.5 text-xs">
        <Icon
          aria-hidden
          className={cn('size-3.5 shrink-0', data.synthetic ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-300')}
        />
        <span className="truncate font-medium text-foreground">{data.name}</span>
        <Badge size="xs" className="ml-auto">
          {STRINGS.brands.institution.schedules(data.scheduleCount)}
        </Badge>
      </header>
    </section>
  )
})
