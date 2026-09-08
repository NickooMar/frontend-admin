import {type LucideIcon, StoreIcon} from 'lucide-react'
import {STRINGS} from '@/lib/strings'

export interface NavItem {
  to: string
  /** Sidebar label — kept short so it never truncates in the 240px rail. */
  label: string
  /** Full name used by the page header. */
  title: string
  icon: LucideIcon
  end?: boolean
}

/**
 * Sidebar entries. Brands is the only module for now; a new one registers here
 * and adds its route as a child of the `AppShell` layout route in `router.tsx`.
 */
export const NAV_ITEMS: readonly NavItem[] = [{to: '/brands', label: STRINGS.brands.navLabel, title: STRINGS.brands.title, icon: StoreIcon}]
