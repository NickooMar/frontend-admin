/**
 * `es-AR` spells short dates as «5 de sept de 2026», which is too wide for the
 * session card and the sidebar footer. We keep the locale's month name but drop
 * the connectors, so both places read «5 sep 2026».
 */
const DATE_PARTS = new Intl.DateTimeFormat('es-AR', {day: 'numeric', month: 'short', year: 'numeric'})
const TIME = new Intl.DateTimeFormat('es-AR', {hour: '2-digit', minute: '2-digit', hour12: false})

const parse = (value: string | null | undefined): Date | null => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const compactDate = (date: Date): string => {
  const parts = DATE_PARTS.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((candidate) => candidate.type === type)?.value ?? ''
  // `sept.` → `sep`; every other locale month abbreviation is already three letters.
  const month = part('month').replace(/\.$/, '').slice(0, 3)
  return `${part('day')} ${month} ${part('year')}`
}

/** `5 sep 2026, 14:32` — used for `lastLoginAt`. Null for a missing or unparseable value. */
export function formatDateTime(value: string | null | undefined): string | null {
  const date = parse(value)
  return date && `${compactDate(date)}, ${TIME.format(date)}`
}

/** `5 sep 2026` — used for the build date next to the commit hash. */
export function formatDate(value: string | null | undefined): string | null {
  const date = parse(value)
  return date && compactDate(date)
}

const RELATIVE = new Intl.RelativeTimeFormat('es-AR', {numeric: 'auto', style: 'long'})

/** Units coarse enough to read at a glance; a visit older than a day is reported in days. */
const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

/**
 * `hace 12 minutos` — how long ago something started. Rounds towards zero, so
 * anything under a minute reads «recién». Null for a missing or unparseable value.
 */
export function formatElapsed(value: string | null | undefined, now: Date = new Date()): string | null {
  const date = parse(value)
  if (!date) return null

  const elapsed = now.getTime() - date.getTime()
  for (const [unit, size] of RELATIVE_UNITS) {
    const amount = Math.trunc(elapsed / size)
    if (amount !== 0) return RELATIVE.format(-amount, unit)
  }
  return 'recién'
}

/** Two-letter monogram for the header avatar. */
export function initials(name: string, surname: string): string {
  const letters = `${name.charAt(0)}${surname.charAt(0)}`.trim()
  return (letters || name.charAt(0) || '?').toUpperCase()
}
