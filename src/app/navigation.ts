import {LayoutDashboardIcon, type LucideIcon, MonitorIcon, SlidersHorizontalIcon, StoreIcon} from 'lucide-react'
import {STRINGS} from '@/lib/strings'

export interface NavItem {
  to: string
  /** Sidebar label — kept short so it never truncates in the 240px rail. */
  label: string
  /** Full name used by the dashboard module card and the future page header. */
  title: string
  description: string
  icon: LucideIcon
  end?: boolean
  /** Roadmap module: rendered, but inert and badged «Pronto». */
  disabled?: boolean
}

export const GENERAL_ITEMS: readonly NavItem[] = [
  {
    to: '/',
    label: STRINGS.shell.dashboard,
    title: STRINGS.dashboard.title,
    description: '',
    icon: LayoutDashboardIcon,
    end: true,
  },
]

/**
 * Roadmap modules. They ship disabled so the navigation is not a one-item list;
 * enabling one means dropping `disabled` and registering its route in `router.tsx`.
 */
export const MODULE_ITEMS: readonly NavItem[] = [
  {to: '/brands', ...STRINGS.modules.brands, icon: StoreIcon, disabled: true},
  {to: '/kiosks', ...STRINGS.modules.kiosks, icon: MonitorIcon, disabled: true},
  {to: '/settings', ...STRINGS.modules.settings, icon: SlidersHorizontalIcon, disabled: true},
]
