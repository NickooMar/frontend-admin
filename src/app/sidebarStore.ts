import {create} from 'zustand'

/**
 * Desktop rail width. The drawer under `md` is always expanded, so this only
 * ever applies to the `md:flex` sidebar in `AppShell`.
 */
export const SIDEBAR_STORAGE_KEY = 'diagnostica-admin-sidebar'

const COLLAPSED = 'collapsed'

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === COLLAPSED
  } catch {
    // Private mode / storage disabled: start expanded.
    return false
  }
}

function writeStoredCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? COLLAPSED : 'expanded')
  } catch {
    // Nothing to do: the choice just will not survive the reload.
  }
}

export interface SidebarState {
  /** Icon-only rail when true. Persisted, so the choice survives a reload. */
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
}

export const useSidebarStore = create<SidebarState>()((set, get) => ({
  collapsed: readStoredCollapsed(),

  setCollapsed: (collapsed) => {
    writeStoredCollapsed(collapsed)
    set({collapsed})
  },

  toggleCollapsed: () => get().setCollapsed(!get().collapsed),
}))
