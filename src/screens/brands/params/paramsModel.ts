import {type JsonObject, type JsonValue, type ParamsOperation, SECRET_MASK} from '@/types/brands'

/**
 * Pure helpers behind the brand params editor. The screen keeps two trees —
 * `base` (what the server sent) and `draft` (what the admin sees) — and only
 * derives the request from their difference, so every edit stays local until
 * «Guardar» and can be undone one by one.
 */

/** Position inside the draft tree: object keys and array indices. */
export type TreePath = Array<string | number>

export type ValueKind = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array'

export const VALUE_KINDS: readonly ValueKind[] = ['string', 'number', 'boolean', 'null', 'object', 'array']

export const isPlainObject = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null && !Array.isArray(value)

export function kindOf(value: JsonValue): ValueKind {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'string'
}

export const isContainer = (value: JsonValue): value is JsonObject | JsonValue[] => Array.isArray(value) || isPlainObject(value)

/** Stable identity of a node, used for React keys and the expanded/visible sets. */
export const pathKey = (path: TreePath): string => JSON.stringify(path)

/** `smtp.password` — how the API and the secret list name a node. Keys never contain dots (see `keyError`). */
export const dottedPath = (path: TreePath): string => path.join('.')

export function getAtPath(root: JsonValue | undefined, path: TreePath): JsonValue | undefined {
  let node: JsonValue | undefined = root
  for (const segment of path) {
    if (Array.isArray(node)) {
      if (typeof segment !== 'number') return undefined
      node = node[segment]
    } else if (isPlainObject(node)) {
      if (typeof segment !== 'string' || !Object.hasOwn(node, segment)) return undefined
      node = node[segment]
    } else {
      return undefined
    }
  }
  return node
}

/** Structural sharing: only the containers along `path` are copied, so untouched subtrees keep their identity. */
export function setAtPath(root: JsonValue | undefined, path: TreePath, value: JsonValue): JsonValue {
  if (path.length === 0) return value
  const [head, ...rest] = path as [string | number, ...TreePath]
  const container: JsonValue | undefined = rest.length === 0 ? undefined : typeof rest[0] === 'number' ? [] : {}

  if (typeof head === 'number') {
    const list = Array.isArray(root) ? [...root] : []
    list[head] = setAtPath(list[head] ?? container, rest, value)
    return list
  }
  const object: JsonObject = isPlainObject(root) ? {...root} : {}
  object[head] = setAtPath(object[head] ?? container, rest, value)
  return object
}

export function removeAtPath(root: JsonValue, path: TreePath): JsonValue {
  if (path.length === 0) return root
  const [head, ...rest] = path as [string | number, ...TreePath]

  if (typeof head === 'number') {
    if (!Array.isArray(root) || head >= root.length) return root
    if (rest.length === 0) return root.filter((_, index) => index !== head)
    const list = [...root]
    list[head] = removeAtPath(list[head] as JsonValue, rest)
    return list
  }
  if (!isPlainObject(root) || !Object.hasOwn(root, head)) return root
  if (rest.length === 0) {
    const {[head]: _removed, ...others} = root
    return others
  }
  return {...root, [head]: removeAtPath(root[head] as JsonValue, rest)}
}

/** Renames the key `path` points at, keeping its position among its siblings. */
export function renameAtPath(root: JsonValue, path: TreePath, nextKey: string): JsonValue {
  const current = path[path.length - 1]
  if (typeof current !== 'string' || current === nextKey) return root
  const parentPath = path.slice(0, -1)
  const parent = getAtPath(root, parentPath)
  if (!isPlainObject(parent) || !Object.hasOwn(parent, current)) return root

  const renamed: JsonObject = {}
  for (const [key, value] of Object.entries(parent)) renamed[key === current ? nextKey : key] = value
  return setAtPath(root, parentPath, renamed)
}

export function deepEqual(a: JsonValue | undefined, b: JsonValue | undefined): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a)
    if (keys.length !== Object.keys(b).length) return false
    return keys.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]))
  }
  return false
}

/**
 * The request for the server: one `unset` per key that disappeared, one `set`
 * per key that appeared, recursion into objects present on both sides, and a
 * whole-value `set` wherever the type changed or an array differs. A path never
 * has an ancestor in the same list, which is what the API requires.
 */
export function diffParams(base: JsonObject, draft: JsonObject): ParamsOperation[] {
  const operations: ParamsOperation[] = []

  const walk = (before: JsonValue | undefined, after: JsonValue | undefined, path: string[]) => {
    if (isPlainObject(before) && isPlainObject(after)) {
      for (const key of Object.keys(before)) if (!Object.hasOwn(after, key)) operations.push({op: 'unset', path: [...path, key]})
      for (const key of Object.keys(after)) {
        if (!Object.hasOwn(before, key)) operations.push({op: 'set', path: [...path, key], value: after[key] as JsonValue})
        else walk(before[key], after[key], [...path, key])
      }
      return
    }
    if (!deepEqual(before, after)) operations.push({op: 'set', path, value: after as JsonValue})
  }

  walk(base, draft, [])
  return operations
}

/** Replays operations on a tree — used to rebase the admin's edits onto a newer server version. */
export function applyOperations(base: JsonObject, operations: ParamsOperation[]): JsonObject {
  let next: JsonValue = base
  for (const operation of operations) {
    next = operation.op === 'set' ? setAtPath(next, operation.path, operation.value) : removeAtPath(next, operation.path)
  }
  return isPlainObject(next) ? next : {}
}

export type ChangeKind = 'unchanged' | 'added' | 'modified'

export function changeKindAt(base: JsonObject, value: JsonValue, path: TreePath): ChangeKind {
  const before = getAtPath(base, path)
  if (before === undefined) return 'added'
  return deepEqual(before, value) ? 'unchanged' : 'modified'
}

// ---- Keys --------------------------------------------------------------------

export type KeyError = 'empty' | 'invalid' | 'duplicate'

/** Mirrors the API's segment rule: no dots (they become nesting), no leading `$`, no prototype names. */
const KEY_PATTERN = /^[^$.][^.]*$/
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function keyError(key: string, siblings: readonly string[], current?: string): KeyError | null {
  if (key.length === 0) return 'empty'
  if (!KEY_PATTERN.test(key) || FORBIDDEN_KEYS.has(key)) return 'invalid'
  if (key !== current && siblings.includes(key)) return 'duplicate'
  return null
}

// ---- Values ------------------------------------------------------------------

export function emptyValueForKind(kind: ValueKind): JsonValue {
  switch (kind) {
    case 'string':
      return ''
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'null':
      return null
    case 'object':
      return {}
    case 'array':
      return []
  }
}

const TRUE_WORDS = new Set(['true', '1', 'yes', 'si', 'sí', 'on'])

const parseJson = (text: string): JsonValue | undefined => {
  try {
    return JSON.parse(text) as JsonValue
  } catch {
    return undefined
  }
}

/** Best-effort conversion when the admin switches a node's type; nothing is ever lost silently — objects become their JSON text. */
export function convertValue(value: JsonValue, kind: ValueKind): JsonValue {
  if (kindOf(value) === kind) return value
  switch (kind) {
    case 'string':
      return value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    case 'number': {
      if (typeof value === 'boolean') return value ? 1 : 0
      if (typeof value !== 'string' || value.trim() === '') return 0
      const parsed = Number(value.trim())
      return Number.isFinite(parsed) ? parsed : 0
    }
    case 'boolean':
      if (typeof value === 'string') return TRUE_WORDS.has(value.trim().toLowerCase())
      if (typeof value === 'number') return value !== 0
      return false
    case 'null':
      return null
    case 'object': {
      const parsed = typeof value === 'string' ? parseJson(value) : undefined
      return isPlainObject(parsed) ? parsed : {}
    }
    case 'array': {
      const parsed = typeof value === 'string' ? parseJson(value) : undefined
      if (Array.isArray(parsed)) return parsed
      return value === null ? [] : [value]
    }
  }
}

// ---- Secrets and validation --------------------------------------------------

export const isSecretPath = (secretPaths: ReadonlySet<string>, path: TreePath): boolean => secretPaths.has(dottedPath(path))

/** Dotted paths, inside `set` values, that still carry the server mask — copying a subtree with a secret does that. */
export function maskedPathsIn(operations: ParamsOperation[]): string[] {
  const found: string[] = []
  const walk = (value: JsonValue, path: string[]) => {
    if (value === SECRET_MASK) found.push(dottedPath(path))
    else if (Array.isArray(value)) for (const [index, item] of value.entries()) walk(item, [...path, String(index)])
    else if (isPlainObject(value)) for (const [key, child] of Object.entries(value)) walk(child, [...path, key])
  }
  for (const operation of operations) if (operation.op === 'set') walk(operation.value, operation.path)
  return found
}

export type DraftIssueKind = 'nan' | 'emptySecret' | 'maskedValue'

export interface DraftIssue {
  kind: DraftIssueKind
  path: string
}

/** Everything that must be fixed before the draft can travel. */
export function collectIssues(base: JsonObject, draft: JsonObject, secretPaths: ReadonlySet<string>): DraftIssue[] {
  const issues: DraftIssue[] = []

  const walk = (value: JsonValue, path: TreePath) => {
    if (typeof value === 'number' && !Number.isFinite(value)) issues.push({kind: 'nan', path: dottedPath(path)})
    else if (Array.isArray(value)) for (const [index, item] of value.entries()) walk(item, [...path, index])
    else if (isPlainObject(value)) for (const [key, child] of Object.entries(value)) walk(child, [...path, key])
  }
  walk(draft, [])

  for (const dotted of secretPaths) {
    const path = dotted.split('.')
    if (getAtPath(base, path) === SECRET_MASK && getAtPath(draft, path) === '') issues.push({kind: 'emptySecret', path: dotted})
  }

  for (const path of maskedPathsIn(diffParams(base, draft))) issues.push({kind: 'maskedValue', path})

  return issues
}

// ---- Tree navigation ---------------------------------------------------------

/** Keys of every container node, for «expand all». */
export function containerPathKeys(root: JsonValue, path: TreePath = [], into: string[] = []): string[] {
  if (Array.isArray(root)) {
    into.push(pathKey(path))
    for (const [index, item] of root.entries()) containerPathKeys(item, [...path, index], into)
  } else if (isPlainObject(root)) {
    into.push(pathKey(path))
    for (const [key, child] of Object.entries(root)) containerPathKeys(child, [...path, key], into)
  }
  return into
}

const primitiveText = (value: JsonValue): string => (value === null ? 'null' : String(value))

/**
 * Nodes to show for a search: every node whose dotted path or primitive value
 * contains the query, plus their ancestors. `null` means no filter is active.
 */
export function visiblePathKeys(root: JsonObject, query: string): ReadonlySet<string> | null {
  const needle = query.trim().toLocaleLowerCase('es')
  if (!needle) return null

  const visible = new Set<string>()
  const walk = (value: JsonValue, path: TreePath): boolean => {
    const selfMatches = path.length > 0 && dottedPath(path).toLocaleLowerCase('es').includes(needle)
    let matches = selfMatches
    if (Array.isArray(value)) {
      for (const [index, item] of value.entries()) if (walk(item, [...path, index])) matches = true
    } else if (isPlainObject(value)) {
      for (const [key, child] of Object.entries(value)) if (walk(child, [...path, key])) matches = true
    } else if (!matches && primitiveText(value).toLocaleLowerCase('es').includes(needle)) {
      matches = true
    }
    if (matches) visible.add(pathKey(path))
    return matches
  }
  walk(root, [])
  return visible
}
