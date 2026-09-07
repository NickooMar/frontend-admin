/**
 * Theme plumbing shared by the store and the inline bootstrap in `index.html`.
 * `system` follows `prefers-color-scheme`; `light` / `dark` pin the choice and
 * persist it, so the preference survives a reload on the same device.
 */
export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'diagnostica-admin-theme'

const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system']

/** `<meta name="theme-color">` values; match `--background` in each mode. */
const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#ffffff',
  dark: '#0a0a0a',
}

export const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value)

/** jsdom has no `matchMedia`, so every caller has to tolerate its absence. */
const darkMediaQuery = (): MediaQueryList | null => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia('(prefers-color-scheme: dark)')
}

export const systemTheme = (): ResolvedTheme => (darkMediaQuery()?.matches ? 'dark' : 'light')

export const resolveTheme = (preference: ThemePreference): ResolvedTheme => (preference === 'system' ? systemTheme() : preference)

export function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : 'system'
  } catch {
    // Private mode / storage disabled: fall back to the OS preference.
    return 'system'
  }
}

export function writeStoredTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Nothing to do: the choice just will not survive the reload.
  }
}

/** Single place that touches the DOM, so the store stays testable. */
export function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
  root.dataset.theme = resolved

  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[resolved])
}

/**
 * Notifies while the preference is `system`. Returns an unsubscribe function,
 * or a no-op when the browser has no `matchMedia` (tests).
 */
export function subscribeToSystemTheme(listener: (resolved: ResolvedTheme) => void): () => void {
  const query = darkMediaQuery()
  if (!query) return () => {}

  const handle = (event: MediaQueryListEvent) => listener(event.matches ? 'dark' : 'light')
  query.addEventListener('change', handle)
  return () => query.removeEventListener('change', handle)
}
