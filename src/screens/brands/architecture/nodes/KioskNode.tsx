import {Handle, type NodeProps, Position} from '@xyflow/react'
import {
  ActivityIcon,
  CopyIcon,
  CpuIcon,
  IdCardIcon,
  type LucideIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  MoveRightIcon,
  PanelsTopLeftIcon,
  PencilIcon,
  SlidersHorizontalIcon,
  StethoscopeIcon,
  TagIcon,
  Trash2Icon,
  UserRoundIcon,
  UsersRoundIcon,
  VideoIcon,
  WifiIcon,
  WifiOffIcon,
} from 'lucide-react'
import {memo} from 'react'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {formatDateTime, formatElapsed} from '@/lib/format'
import {STRINGS} from '@/lib/strings'
import {cn} from '@/lib/utils'
import {type ActiveSessionSummary, KIOSK_EDIT_SECTIONS, type KioskNodeData} from '@/types/brands'
import {useKioskActions} from '../../canvasActions'
import type {KioskFlowNode} from '../buildGraph'
import {NodeRow} from './NodeRow'

const COPY = STRINGS.brands.kiosk

const SECTION_ICONS: Record<(typeof KIOSK_EDIT_SECTIONS)[number], LucideIcon> = {
  data: IdCardIcon,
  version: TagIcon,
  devices: CpuIcon,
  availableExams: StethoscopeIcon,
  params: SlidersHorizontalIcon,
}

/** Colour per resource type — reused by the legend and the minimap. */
export const KIOSK_TILE = {
  KIOSK: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
  MULTI: 'bg-violet-500/12 text-violet-700 dark:text-violet-300',
} as const

const statusTone = (data: KioskNodeData): string => {
  if (data.deleted || data.status === 'DISABLED') return 'bg-muted-foreground/50'
  if (!data.connected) return 'bg-amber-500'
  if (data.status === 'IN_USE' || data.status === 'IN_USE_BY_KIOSK_USER' || data.status === 'BUSY') return 'bg-sky-500'
  return 'bg-emerald-500'
}

function connectionLabel(data: KioskNodeData): string {
  const status = data.status ? (COPY.status[data.status] ?? data.status) : null
  const state = data.connected ? COPY.connected : COPY.disconnected
  return status ? `${state} · ${status}` : state
}

function connectionDetail(data: KioskNodeData): string | null {
  if (data.connected) return null
  const when = formatDateTime(data.lastConnected)
  return when ? COPY.lastConnected(when) : COPY.neverConnected
}

const SESSION = COPY.session

type ActivePatient = NonNullable<ActiveSessionSummary['patient']>
type ActiveVideoVisit = NonNullable<ActiveSessionSummary['videoVisit']>

/** An `nn` id is a random token, so the document is only worth showing for an identified patient. */
function patientDocument(patient: ActivePatient): string | null {
  if (patient.unidentified || !patient.idValue) return null
  return SESSION.document(patient.idType ?? '', patient.idValue).trim()
}

/**
 * Who is being attended right now. The elapsed time is on the row rather than
 * only in the tooltip because a cabin that dropped mid-visit keeps reporting
 * «En uso» for as long as nobody closes the session.
 */
function PatientRow({session}: {session: ActiveSessionSummary}) {
  const patient = session.patient
  if (!patient) return null

  const label = patient.unidentified ? SESSION.anonymousPatient : patient.name
  const since = formatElapsed(session.patientEnteredAt ?? session.startDate)

  return (
    <NodeRow
      icon={UserRoundIcon}
      className="text-foreground"
      title={[label, patientDocument(patient), since && SESSION.patientSince(since)].filter(Boolean).join(' · ')}>
      <span className={cn('truncate font-medium', patient.unidentified && 'font-normal text-muted-foreground italic')}>{label}</span>
      {since ? <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{since}</span> : null}
    </NodeRow>
  )
}

/** Waiting for a professional reads as pending; a call already answered reads as live. */
const videoVisitTone = (status: string): string =>
  status === 'ACCEPTED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'

function VideoVisitRow({visit}: {visit: ActiveVideoVisit}) {
  const label = SESSION.videoVisit[visit.status] ?? SESSION.videoVisitFallback
  const professional = visit.professional ? SESSION.withProfessional(visit.professional.fullName) : null

  return (
    <NodeRow icon={VideoIcon} className={videoVisitTone(visit.status)} title={[label, professional].filter(Boolean).join(' ')}>
      <span className="shrink-0">{label}</span>
      {professional ? <span className="truncate text-muted-foreground">{professional}</span> : null}
    </NodeRow>
  )
}

export const KioskNode = memo(function KioskNode({data, selected}: NodeProps<KioskFlowNode>) {
  const onAction = useKioskActions()
  const isMulti = data.type === 'MULTI'
  const Icon = isMulti ? PanelsTopLeftIcon : MonitorIcon
  const detail = connectionDetail(data)
  const accounts = data.linkedUsers.map((user) => user.email || user.name).filter(Boolean)
  const session = data.activeSession

  return (
    <article
      aria-label={`${isMulti ? STRINGS.brands.kinds.multi : STRINGS.brands.kinds.kiosk} ${data.location}`}
      data-testid={`kiosk-node-${data._id}`}
      className={cn(
        'w-72 rounded-xl bg-card text-left text-card-foreground shadow-sm ring-1 transition-shadow',
        selected ? 'shadow-md ring-ring' : 'ring-foreground/10',
        data.deleted && 'opacity-60',
      )}>
      <header className="flex items-start gap-2.5 px-3.5 pt-3 pb-2.5">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-md', KIOSK_TILE[data.type])}>
          <Icon aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-5 font-semibold">{data.location}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge size="xs" variant="neutral">
              {isMulti ? STRINGS.brands.kinds.multi : STRINGS.brands.kinds.kiosk}
            </Badge>
            {data.keyboardMode ? <Badge size="xs">{COPY.keyboardMode}</Badge> : null}
            {data.assistantMode ? <Badge size="xs">{COPY.assistantMode}</Badge> : null}
            {data.deleted ? (
              <Badge size="xs" className="bg-destructive/10 text-destructive">
                {COPY.deleted}
              </Badge>
            ) : null}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`${COPY.actions} ${data.location}`}
              className="nodrag nopan -mr-1.5 -mt-1 text-muted-foreground">
              <MoreHorizontalIcon aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="nodrag nopan w-56">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <PencilIcon aria-hidden />
                {COPY.edit}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="nodrag nopan w-56">
                {KIOSK_EDIT_SECTIONS.map((section) => {
                  const SectionIcon = SECTION_ICONS[section]
                  return (
                    <DropdownMenuItem key={section} onSelect={() => onAction(`edit:${section}`, data)}>
                      <SectionIcon aria-hidden />
                      {COPY.editSections[section]}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onAction('duplicate', data)}>
              <CopyIcon aria-hidden />
              {COPY.duplicate}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction('move', data)}>
              <MoveRightIcon aria-hidden />
              {COPY.move}
            </DropdownMenuItem>
            {data.deleted ? null : (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => onAction('delete', data)}>
                  <Trash2Icon aria-hidden />
                  {STRINGS.brands.delete.menu}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex flex-col border-t">
        <NodeRow icon={data.connected ? WifiIcon : WifiOffIcon} title={detail ?? undefined}>
          <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', statusTone(data))} />
          <span className="truncate">{connectionLabel(data)}</span>
        </NodeRow>
        {session ? <PatientRow session={session} /> : null}
        {session?.videoVisit ? <VideoVisitRow visit={session.videoVisit} /> : null}
        <NodeRow icon={ActivityIcon} title={data.examNames.join(', ') || undefined}>
          {data.examCount > 0 ? COPY.exams(data.examCount) : COPY.noExams}
        </NodeRow>
        {accounts.length > 0 ? (
          <NodeRow icon={UsersRoundIcon} title={accounts.join(', ')}>
            <span className="truncate">{accounts.join(', ')}</span>
          </NodeRow>
        ) : null}
      </div>

      <Handle type="source" position={Position.Right} isConnectable={false} />
    </article>
  )
})
