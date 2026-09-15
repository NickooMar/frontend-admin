import {
  BracesIcon,
  BracketsIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleSlashIcon,
  HashIcon,
  LockKeyholeIcon,
  type LucideIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  ToggleLeftIcon,
  Trash2Icon,
  TypeIcon,
  Undo2Icon,
  XIcon,
} from 'lucide-react'
import {type KeyboardEvent, memo, useEffect, useRef, useState} from 'react'
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
import {Input} from '@/components/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {Switch} from '@/components/ui/switch'
import {Textarea} from '@/components/ui/textarea'
import {STRINGS} from '@/lib/strings'
import {cn} from '@/lib/utils'
import {type JsonObject, type JsonValue, SECRET_MASK} from '@/types/brands'
import {
  type ChangeKind,
  changeKindAt,
  convertValue,
  dottedPath,
  getAtPath,
  isContainer,
  isPlainObject,
  isSecretPath,
  keyError,
  kindOf,
  pathKey,
  type TreePath,
  VALUE_KINDS,
  type ValueKind,
} from './paramsModel'

const COPY = STRINGS.brands.params

const KIND_ICONS: Record<ValueKind, LucideIcon> = {
  string: TypeIcon,
  number: HashIcon,
  boolean: ToggleLeftIcon,
  null: CircleSlashIcon,
  object: BracesIcon,
  array: BracketsIcon,
}

const CHANGE_BADGE: Record<Exclude<ChangeKind, 'unchanged'>, string> = {
  added: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  modified: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
}

/** Indentation per depth level, in px. */
const INDENT = 18

/** A string long enough that a one-line input would hide most of it. */
const isLongText = (value: string) => value.length > 72 || value.includes('\n')

export interface TreeActions {
  onSet: (path: TreePath, value: JsonValue) => void
  onRemove: (path: TreePath) => void
  onRename: (path: TreePath, key: string) => void
  /** `key` is null when the parent is an array: the item is appended. */
  onAdd: (parentPath: TreePath, key: string | null, kind: ValueKind) => void
  onRevert: (path: TreePath) => void
  onToggle: (path: TreePath) => void
  onExpand: (path: TreePath) => void
}

export interface ParamsTreeProps extends TreeActions {
  draft: JsonObject
  base: JsonObject
  secretPaths: ReadonlySet<string>
  expanded: ReadonlySet<string>
  /** `null` while no search is active; otherwise only these nodes (and their ancestors) render, all expanded. */
  visible: ReadonlySet<string> | null
  disabled?: boolean
  addingAtRoot: boolean
  onCloseRootAdd: () => void
}

const childEntries = (value: JsonValue): Array<[string | number, JsonValue]> => {
  if (Array.isArray(value)) return value.map((item, index) => [index, item])
  if (isPlainObject(value)) return Object.entries(value)
  return []
}

/**
 * Collapsible tree over the brand params. Every node is addressed by its path;
 * the tree never owns the data — it reports edits up and re-renders from the
 * next draft, so the screen alone decides what «changed» means.
 */
export function ParamsTree({draft, addingAtRoot, onCloseRootAdd, ...rest}: ParamsTreeProps) {
  const entries = childEntries(draft)
  const shown = rest.visible ? entries.filter(([key]) => rest.visible?.has(pathKey([key]))) : entries

  return (
    <div className="flex flex-col gap-px">
      {addingAtRoot ? (
        <AddParamRow
          parentPath={[]}
          siblings={Object.keys(draft)}
          depth={0}
          arrayParent={false}
          disabled={rest.disabled}
          onAdd={(key, kind) => {
            rest.onAdd([], key, kind)
            onCloseRootAdd()
          }}
          onClose={onCloseRootAdd}
        />
      ) : null}
      {shown.map(([key, value]) => (
        <ParamNode key={String(key)} path={[key]} value={value} depth={0} siblings={Object.keys(draft)} {...rest} />
      ))}
      {entries.length === 0 && !addingAtRoot ? <p className="px-2 py-6 text-center text-sm text-muted-foreground">{COPY.empty}</p> : null}
      {entries.length > 0 && shown.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">{COPY.noMatches}</p>
      ) : null}
    </div>
  )
}

interface ParamNodeProps extends TreeActions {
  path: TreePath
  value: JsonValue
  depth: number
  /** Keys next to this node, for rename validation. */
  siblings: readonly string[]
  base: JsonObject
  secretPaths: ReadonlySet<string>
  expanded: ReadonlySet<string>
  visible: ReadonlySet<string> | null
  disabled?: boolean
}

const ParamNode = memo(function ParamNode(props: ParamNodeProps) {
  const {path, value, depth, siblings, base, secretPaths, expanded, visible, disabled} = props
  const key = path[path.length - 1] as string | number
  const inArray = typeof key === 'number'
  const dotted = dottedPath(path)
  const kind = kindOf(value)
  const container = isContainer(value)
  const isExpanded = container && (visible !== null || expanded.has(pathKey(path)))
  const change = changeKindAt(base, value, path)
  const secret = !container && isSecretPath(secretPaths, path)
  const baseValue = getAtPath(base, path)
  const KindIcon = KIND_ICONS[kind]

  const [renaming, setRenaming] = useState(false)
  const [adding, setAdding] = useState(false)

  const entries = childEntries(value)
  const shownChildren = visible ? entries.filter(([childKey]) => visible.has(pathKey([...path, childKey]))) : entries
  const childKeys = isPlainObject(value) ? Object.keys(value) : []

  const summary = Array.isArray(value) ? COPY.summary.items(value.length) : COPY.summary.keys(Object.keys(value as JsonObject).length)

  return (
    <div data-path={dotted} className="flex flex-col gap-px">
      <div
        className={cn(
          'group/row grid grid-cols-[minmax(220px,1fr)_minmax(0,2fr)_auto] items-center gap-x-3 rounded-md px-2 py-1 hover:bg-muted/40',
          change === 'added' && 'bg-emerald-500/5',
          change === 'modified' && 'bg-amber-500/5',
        )}>
        <div className="flex min-w-0 items-center gap-1.5" style={{paddingLeft: depth * INDENT}}>
          {container ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={COPY.toggle(dotted)}
              aria-expanded={isExpanded}
              onClick={() => props.onToggle(path)}
              disabled={visible !== null}
              className="text-muted-foreground">
              <ChevronRightIcon aria-hidden className={cn('transition-transform', isExpanded && 'rotate-90')} />
            </Button>
          ) : (
            <span aria-hidden className="size-6 shrink-0" />
          )}
          <KindIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          {renaming ? (
            <KeyField
              label={COPY.keyLabel}
              initial={String(key)}
              siblings={siblings}
              current={String(key)}
              onSubmit={(next) => {
                setRenaming(false)
                props.onRename(path, next)
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <button
              type="button"
              title={dotted}
              onClick={container ? () => props.onToggle(path) : undefined}
              disabled={container ? visible !== null : true}
              className={cn(
                'truncate font-mono text-xs text-foreground',
                container ? 'cursor-pointer' : 'cursor-default',
                change === 'added' && 'font-semibold',
              )}>
              {inArray ? `[${key}]` : key}
            </button>
          )}
          {change !== 'unchanged' ? (
            <Badge size="xs" variant="neutral" className={cn('shrink-0', CHANGE_BADGE[change])}>
              {COPY.change[change]}
            </Badge>
          ) : null}
          {secret ? <LockKeyholeIcon role="img" aria-label={COPY.secret} className="size-3.5 shrink-0 text-muted-foreground" /> : null}
        </div>

        <div className="min-w-0">
          {container ? (
            <span className="text-xs text-muted-foreground">{summary}</span>
          ) : (
            <ValueEditor path={path} value={value} secret={secret} baseValue={baseValue} disabled={disabled} onSet={props.onSet} />
          )}
        </div>

        <NodeMenu
          dotted={dotted}
          kind={kind}
          container={container}
          arrayContainer={Array.isArray(value)}
          inArray={inArray}
          change={change}
          disabled={disabled}
          onAddChild={() => {
            props.onExpand(path)
            setAdding(true)
          }}
          onRename={() => setRenaming(true)}
          onChangeKind={(next) => props.onSet(path, convertValue(value, next))}
          onRevert={() => props.onRevert(path)}
          onRemove={() => props.onRemove(path)}
        />
      </div>

      {container && (isExpanded || adding) ? (
        <div className="flex flex-col gap-px">
          {shownChildren.map(([childKey, child]) => (
            <ParamNode
              key={String(childKey)}
              path={[...path, childKey]}
              value={child}
              depth={depth + 1}
              siblings={childKeys}
              base={base}
              secretPaths={secretPaths}
              expanded={expanded}
              visible={visible}
              disabled={disabled}
              onSet={props.onSet}
              onRemove={props.onRemove}
              onRename={props.onRename}
              onAdd={props.onAdd}
              onRevert={props.onRevert}
              onToggle={props.onToggle}
              onExpand={props.onExpand}
            />
          ))}
          {adding ? (
            <AddParamRow
              parentPath={path}
              siblings={childKeys}
              depth={depth + 1}
              arrayParent={Array.isArray(value)}
              disabled={disabled}
              onAdd={(childKey, childKind) => {
                setAdding(false)
                props.onAdd(path, childKey, childKind)
              }}
              onClose={() => setAdding(false)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
})

function ValueEditor({
  path,
  value,
  secret,
  baseValue,
  disabled,
  onSet,
}: {
  path: TreePath
  value: JsonValue
  secret: boolean
  baseValue: JsonValue | undefined
  disabled?: boolean
  onSet: TreeActions['onSet']
}) {
  const dotted = dottedPath(path)

  if (secret) {
    if (value === SECRET_MASK) {
      return (
        <div className="flex items-center gap-2">
          <span aria-hidden className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
            ••••••••
          </span>
          <Button
            type="button"
            size="xs"
            variant="outline"
            aria-label={`${COPY.secretReplace} ${dotted}`}
            onClick={() => onSet(path, '')}
            disabled={disabled}>
            {COPY.secretReplace}
          </Button>
          <span className="sr-only">{COPY.secretHint}</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2">
        <Input
          aria-label={dotted}
          value={typeof value === 'string' ? value : String(value ?? '')}
          placeholder={COPY.secretReplacing}
          autoComplete="off"
          disabled={disabled}
          onChange={(event) => onSet(path, event.target.value)}
          className="h-7 max-w-md font-mono text-xs"
        />
        {baseValue === SECRET_MASK ? (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={`${COPY.secretCancel} ${dotted}`}
            onClick={() => onSet(path, SECRET_MASK)}
            disabled={disabled}>
            <XIcon aria-hidden />
          </Button>
        ) : null}
      </div>
    )
  }

  switch (kindOf(value)) {
    case 'string': {
      const text = value as string
      return isLongText(text) ? (
        <Textarea
          aria-label={dotted}
          value={text}
          rows={3}
          disabled={disabled}
          onChange={(event) => onSet(path, event.target.value)}
          className="min-h-0 font-mono text-xs leading-5"
        />
      ) : (
        <Input
          aria-label={dotted}
          value={text}
          disabled={disabled}
          onChange={(event) => onSet(path, event.target.value)}
          className="h-7 max-w-md font-mono text-xs"
        />
      )
    }
    case 'number': {
      const number = value as number
      const invalid = !Number.isFinite(number)
      return (
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          aria-label={dotted}
          aria-invalid={invalid}
          value={invalid ? '' : number}
          disabled={disabled}
          onChange={(event) => onSet(path, event.target.value === '' ? Number.NaN : Number(event.target.value))}
          className="h-7 w-44 font-mono text-xs"
        />
      )
    }
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <Switch
            size="sm"
            aria-label={dotted}
            checked={value as boolean}
            disabled={disabled}
            onCheckedChange={(checked) => onSet(path, checked)}
          />
          <span className="font-mono text-xs text-muted-foreground">{String(value)}</span>
        </div>
      )
    case 'null':
      return <span className="font-mono text-xs text-muted-foreground">null</span>
    default:
      return null
  }
}

function NodeMenu({
  dotted,
  kind,
  container,
  arrayContainer,
  inArray,
  change,
  disabled,
  onAddChild,
  onRename,
  onChangeKind,
  onRevert,
  onRemove,
}: {
  dotted: string
  kind: ValueKind
  container: boolean
  arrayContainer: boolean
  inArray: boolean
  change: ChangeKind
  disabled?: boolean
  onAddChild: () => void
  onRename: () => void
  onChangeKind: (kind: ValueKind) => void
  onRevert: () => void
  onRemove: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={COPY.actions(dotted)}
          disabled={disabled}
          className="text-muted-foreground opacity-60 group-hover/row:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100">
          <MoreHorizontalIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {container ? (
          <DropdownMenuItem onSelect={onAddChild}>
            <PlusIcon aria-hidden />
            {arrayContainer ? COPY.addItem : COPY.addChild}
          </DropdownMenuItem>
        ) : null}
        {inArray ? null : (
          <DropdownMenuItem onSelect={onRename}>
            <PencilIcon aria-hidden />
            {COPY.rename}
          </DropdownMenuItem>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <TypeIcon aria-hidden />
            {COPY.changeKind}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40">
            {VALUE_KINDS.map((candidate) => {
              const Icon = KIND_ICONS[candidate]
              return (
                <DropdownMenuItem key={candidate} disabled={candidate === kind} onSelect={() => onChangeKind(candidate)}>
                  <Icon aria-hidden />
                  {COPY.kinds[candidate]}
                  {candidate === kind ? <CheckIcon aria-hidden className="ml-auto" /> : null}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {change !== 'unchanged' ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onRevert}>
              <Undo2Icon aria-hidden />
              {COPY.revert}
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onRemove}>
          <Trash2Icon aria-hidden />
          {COPY.remove}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Inline key input with the API's naming rules; Enter confirms, Escape cancels. */
function KeyField({
  label,
  initial,
  siblings,
  current,
  onSubmit,
  onCancel,
}: {
  label: string
  initial: string
  siblings: readonly string[]
  current?: string
  onSubmit: (key: string) => void
  onCancel: () => void
}) {
  const [key, setKey] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  const error = keyError(key, siblings, current)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (!error) onSubmit(key)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <div className="flex flex-col gap-0.5">
        <Input
          ref={ref}
          aria-label={label}
          aria-invalid={error !== null}
          value={key}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setKey(event.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-52 font-mono text-xs"
        />
        {error ? <span className="text-[11px] text-destructive">{COPY.keyErrors[error]}</span> : null}
      </div>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        aria-label={COPY.confirm}
        disabled={error !== null}
        onClick={() => onSubmit(key)}>
        <CheckIcon aria-hidden />
      </Button>
      <Button type="button" size="icon-xs" variant="ghost" aria-label={COPY.cancel} onClick={onCancel}>
        <XIcon aria-hidden />
      </Button>
    </div>
  )
}

/** Row that creates one child under `parentPath`: a name (objects only) and a type. */
function AddParamRow({
  parentPath,
  siblings,
  depth,
  arrayParent,
  disabled,
  onAdd,
  onClose,
}: {
  parentPath: TreePath
  siblings: readonly string[]
  depth: number
  arrayParent: boolean
  disabled?: boolean
  onAdd: (key: string | null, kind: ValueKind) => void
  onClose: () => void
}) {
  const [key, setKey] = useState('')
  const [kind, setKind] = useState<ValueKind>('string')
  const ref = useRef<HTMLInputElement>(null)
  const error = arrayParent ? null : keyError(key, siblings)
  const label = parentPath.length === 0 ? COPY.addRoot : arrayParent ? COPY.addItem : COPY.addChild

  useEffect(() => {
    ref.current?.focus()
  }, [])

  const submit = () => {
    if (error !== null) return
    onAdd(arrayParent ? null : key, kind)
  }

  return (
    <form
      aria-label={label}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="flex flex-wrap items-start gap-2 rounded-md border border-dashed bg-muted/30 px-2 py-1.5"
      style={{marginLeft: depth * INDENT + 8}}>
      {arrayParent ? null : (
        <div className="flex flex-col gap-0.5">
          <Input
            ref={ref}
            aria-label={COPY.keyLabel}
            aria-invalid={key.length > 0 && error !== null}
            placeholder={COPY.keyPlaceholder}
            value={key}
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            onChange={(event) => setKey(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose()
            }}
            className="h-7 w-56 font-mono text-xs"
          />
          {key.length > 0 && error ? <span className="text-[11px] text-destructive">{COPY.keyErrors[error]}</span> : null}
        </div>
      )}
      <Select value={kind} onValueChange={(next) => setKind(next as ValueKind)} disabled={disabled}>
        <SelectTrigger size="sm" aria-label={COPY.kindLabel} className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {VALUE_KINDS.map((candidate) => (
            <SelectItem key={candidate} value={candidate}>
              {COPY.kinds[candidate]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" disabled={disabled || error !== null}>
        <PlusIcon aria-hidden data-icon="inline-start" />
        {COPY.addSubmit}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onClose}>
        {COPY.cancel}
      </Button>
    </form>
  )
}
