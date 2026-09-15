import {describe, expect, it} from 'vitest'
import {type JsonObject, type JsonValue, SECRET_MASK} from '@/types/brands'
import {
  applyOperations,
  changeKindAt,
  collectIssues,
  containerPathKeys,
  convertValue,
  deepEqual,
  diffParams,
  getAtPath,
  keyError,
  kindOf,
  maskedPathsIn,
  removeAtPath,
  renameAtPath,
  setAtPath,
  visiblePathKeys,
} from './paramsModel'

const base = (): JsonObject => ({
  defaultLanguage: 'ES',
  smtp: {host: 'mail.example.com', port: 465, password: SECRET_MASK},
  videovisit: {earlyConnectionOffset: 20, lateConnectionOffset: 20},
  wizardExams: [
    {id: '1', type: 'TEMPERATURE'},
    {id: '2', type: 'SPO2'},
  ],
  faceLogin: true,
  legacy: null,
})

describe('paths', () => {
  it('reads, writes and removes with structural sharing', () => {
    const root = base()
    expect(getAtPath(root, ['smtp', 'port'])).toBe(465)
    expect(getAtPath(root, ['wizardExams', 1, 'type'])).toBe('SPO2')
    expect(getAtPath(root, ['wizardExams', '1'])).toBeUndefined()
    expect(getAtPath(root, ['defaultLanguage', 'x'])).toBeUndefined()
    expect(getAtPath(root, ['nope'])).toBeUndefined()

    const next = setAtPath(root, ['smtp', 'port'], 587) as JsonObject
    expect(next).not.toBe(root)
    expect(next.smtp).not.toBe(root.smtp)
    expect(next.videovisit).toBe(root.videovisit)
    expect((next.smtp as JsonObject).port).toBe(587)
    expect((root.smtp as JsonObject).port).toBe(465)

    const created = setAtPath(root, ['new', 'deep', 'leaf'], 'v') as JsonObject
    expect(created.new).toEqual({deep: {leaf: 'v'}})

    const inArray = setAtPath(root, ['wizardExams', 0, 'type'], 'ECG') as JsonObject
    expect(inArray.wizardExams).toEqual([
      {id: '1', type: 'ECG'},
      {id: '2', type: 'SPO2'},
    ])
    expect(setAtPath(root, ['list', 0], 'x')).toMatchObject({list: ['x']})

    const removed = removeAtPath(root, ['smtp', 'password']) as JsonObject
    expect(removed.smtp).toEqual({host: 'mail.example.com', port: 465})
    expect(removeAtPath(root, ['wizardExams', 0])).toMatchObject({wizardExams: [{id: '2', type: 'SPO2'}]})
    expect(removeAtPath(root, ['missing', 'x'])).toBe(root)
  })

  it('renames a key in place, keeping the order of its siblings', () => {
    const renamed = renameAtPath(base(), ['smtp', 'host'], 'hostname') as JsonObject
    expect(Object.keys(renamed.smtp as JsonObject)).toEqual(['hostname', 'port', 'password'])
    expect((renamed.smtp as JsonObject).hostname).toBe('mail.example.com')
    const root = base()
    expect(renameAtPath(root, ['smtp', 'host'], 'host')).toBe(root)
    expect(renameAtPath(root, ['wizardExams', 0], 'x')).toBe(root)
  })

  it('deepEqual compares structurally', () => {
    expect(deepEqual({a: [1, {b: 2}]}, {a: [1, {b: 2}]})).toBe(true)
    expect(deepEqual({a: 1}, {a: '1'})).toBe(false)
    expect(deepEqual([1, 2], [2, 1])).toBe(false)
    expect(deepEqual({a: 1}, {a: 1, b: 2})).toBe(false)
    expect(deepEqual(null, undefined)).toBe(false)
  })
})

describe('diffParams / applyOperations', () => {
  it('produces the minimal set/unset list and never a path with its ancestor', () => {
    const before = base()
    let after = setAtPath(before, ['smtp', 'port'], 587) as JsonObject
    after = setAtPath(after, ['support', 'email'], 'soporte@x.com') as JsonObject
    after = setAtPath(after, ['wizardExams', 1, 'type'], 'ECG') as JsonObject
    after = setAtPath(after, ['defaultLanguage'], {code: 'ES'}) as JsonObject
    after = removeAtPath(after, ['legacy']) as JsonObject
    after = removeAtPath(after, ['videovisit', 'lateConnectionOffset']) as JsonObject

    const operations = diffParams(before, after)
    expect(operations).toEqual([
      {op: 'unset', path: ['legacy']},
      {op: 'set', path: ['defaultLanguage'], value: {code: 'ES'}},
      {op: 'set', path: ['smtp', 'port'], value: 587},
      {op: 'unset', path: ['videovisit', 'lateConnectionOffset']},
      {
        op: 'set',
        path: ['wizardExams'],
        value: [
          {id: '1', type: 'TEMPERATURE'},
          {id: '2', type: 'ECG'},
        ],
      },
      {op: 'set', path: ['support'], value: {email: 'soporte@x.com'}},
    ])

    const dotted = operations.map((operation) => operation.path.join('.'))
    for (const path of dotted) {
      for (const other of dotted) expect(path !== other && path.startsWith(`${other}.`)).toBe(false)
    }
    expect(diffParams(before, base())).toEqual([])
    expect(applyOperations(before, operations)).toEqual(after)
  })

  it('rebases edits onto a newer base', () => {
    const mine = setAtPath(base(), ['smtp', 'port'], 587) as JsonObject
    const theirs = setAtPath(base(), ['defaultLanguage'], 'PT') as JsonObject
    const rebased = applyOperations(theirs, diffParams(base(), mine))
    expect(rebased).toEqual({...theirs, smtp: {...(theirs.smtp as JsonObject), port: 587}})
  })

  it('reports how a node differs from the base', () => {
    const root = base()
    expect(changeKindAt(root, 465, ['smtp', 'port'])).toBe('unchanged')
    expect(changeKindAt(root, 587, ['smtp', 'port'])).toBe('modified')
    expect(changeKindAt(root, 'x', ['brand', 'new'])).toBe('added')
    expect(changeKindAt(root, {host: 'mail.example.com', port: 1, password: SECRET_MASK}, ['smtp'])).toBe('modified')
  })
})

describe('keys and values', () => {
  it('validates keys like the API does', () => {
    expect(keyError('smtp', ['a'])).toBeNull()
    expect(keyError('', [])).toBe('empty')
    expect(keyError('a.b', [])).toBe('invalid')
    expect(keyError('$set', [])).toBe('invalid')
    expect(keyError('__proto__', [])).toBe('invalid')
    expect(keyError('smtp', ['smtp'])).toBe('duplicate')
    expect(keyError('smtp', ['smtp'], 'smtp')).toBeNull()
  })

  it('classifies and converts values', () => {
    expect(kindOf(null)).toBe('null')
    expect(kindOf([])).toBe('array')
    expect(kindOf({})).toBe('object')
    expect(kindOf(1)).toBe('number')
    expect(kindOf(true)).toBe('boolean')
    expect(kindOf('x')).toBe('string')

    expect(convertValue('465', 'number')).toBe(465)
    expect(convertValue('abc', 'number')).toBe(0)
    expect(convertValue(true, 'number')).toBe(1)
    expect(convertValue(465, 'string')).toBe('465')
    expect(convertValue({a: 1}, 'string')).toBe('{"a":1}')
    expect(convertValue(null, 'string')).toBe('')
    expect(convertValue('true', 'boolean')).toBe(true)
    expect(convertValue('no', 'boolean')).toBe(false)
    expect(convertValue(2, 'boolean')).toBe(true)
    expect(convertValue('{"frec":{"active":true}}', 'object')).toEqual({frec: {active: true}})
    expect(convertValue('not json', 'object')).toEqual({})
    expect(convertValue('[1,2]', 'array')).toEqual([1, 2])
    expect(convertValue('x', 'array')).toEqual(['x'])
    expect(convertValue(null, 'array')).toEqual([])
    expect(convertValue({a: 1}, 'null')).toBeNull()
    const same = {a: 1}
    expect(convertValue(same, 'object')).toBe(same)
  })
})

describe('secrets and issues', () => {
  it('finds masked values copied inside set operations', () => {
    expect(
      maskedPathsIn([
        {op: 'set', path: ['smtp_copy'], value: {host: 'h', password: SECRET_MASK, list: [SECRET_MASK]}},
        {op: 'set', path: ['ok'], value: '*******'},
        {op: 'unset', path: ['x']},
      ]),
    ).toEqual(['smtp_copy.password', 'smtp_copy.list.0'])
  })

  it('collects NaN numbers, empty replaced secrets and copied masks', () => {
    const before = base()
    const secrets = new Set(['smtp.password'])
    let after = setAtPath(before, ['smtp', 'port'], Number.NaN) as JsonObject
    after = setAtPath(after, ['smtp', 'password'], '') as JsonObject
    after = setAtPath(after, ['smtp_backup'], before.smtp as JsonValue) as JsonObject

    expect(collectIssues(before, after, secrets)).toEqual([
      {kind: 'nan', path: 'smtp.port'},
      {kind: 'emptySecret', path: 'smtp.password'},
      {kind: 'maskedValue', path: 'smtp_backup.password'},
    ])
    expect(collectIssues(before, before, secrets)).toEqual([])
    expect(collectIssues(before, setAtPath(before, ['smtp', 'password'], 'new') as JsonObject, secrets)).toEqual([])
  })
})

describe('navigation', () => {
  it('lists container nodes and filters by path or value', () => {
    const root = base()
    expect(containerPathKeys(root)).toEqual([
      JSON.stringify([]),
      JSON.stringify(['smtp']),
      JSON.stringify(['videovisit']),
      JSON.stringify(['wizardExams']),
      JSON.stringify(['wizardExams', 0]),
      JSON.stringify(['wizardExams', 1]),
    ])

    expect(visiblePathKeys(root, '  ')).toBeNull()
    const byKey = visiblePathKeys(root, 'PORT') as Set<string>
    expect([...byKey]).toEqual([JSON.stringify(['smtp', 'port']), JSON.stringify(['smtp']), JSON.stringify([])])
    const byValue = visiblePathKeys(root, 'spo2') as Set<string>
    expect(byValue.has(JSON.stringify(['wizardExams', 1, 'type']))).toBe(true)
    expect(byValue.has(JSON.stringify(['wizardExams', 1]))).toBe(true)
    expect(byValue.has(JSON.stringify(['wizardExams', 0]))).toBe(false)
    expect(byValue.has(JSON.stringify(['smtp']))).toBe(false)
    expect([...(visiblePathKeys(root, 'zzz') as Set<string>)]).toEqual([])
  })
})
