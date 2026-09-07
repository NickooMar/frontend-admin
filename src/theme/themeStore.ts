import {create} from 'zustand'
import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  type ResolvedTheme,
  subscribeToSystemTheme,
  type ThemePreference,
  writeStoredTheme,
} from './theme'

export interface ThemeState {
  /** What the admin picked: `system` defers to `prefers-color-scheme`. */
  preference: ThemePreference
  /** What is actually painted right now. */
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const initialPreference = readStoredTheme()

export const useThemeStore = create<ThemeState>()((set) => ({
  preference: initialPreference,
  resolved: resolveTheme(initialPreference),

  setPreference: (preference) => {
    writeStoredTheme(preference)
    const resolved = resolveTheme(preference)
    applyTheme(resolved)
    set({preference, resolved})
  },
}))

/**
 * Called once from `main.tsx`, before React renders. The inline script in
 * `index.html` has already set the class to avoid a flash; this re-applies it
 * from the same source of truth and keeps `system` in sync with the OS.
 */
export function initTheme(): void {
  applyTheme(useThemeStore.getState().resolved)

  subscribeToSystemTheme((resolved) => {
    if (useThemeStore.getState().preference !== 'system') return
    applyTheme(resolved)
    useThemeStore.setState({resolved})
  })
}
