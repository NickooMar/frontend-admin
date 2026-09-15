import {ChevronDownIcon, LogOutIcon, MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon} from 'lucide-react'
import {type ReactNode, useState} from 'react'
import {NavLink, Outlet, useLocation} from 'react-router-dom'
import {signOut} from '@/auth/authActions'
import {useAuthStore} from '@/auth/authStore'
import {BrandBadge, BrandLockup} from '@/components/BrandMark'
import {Badge, BadgeDot} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {Sheet, SheetContent, SheetTitle, SheetTrigger} from '@/components/ui/sheet'
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip'
import {CommitHash, EnvironmentPill, shortCommit} from '@/components/EnvironmentPill'
import {env} from '@/config/env'
import {formatDate, initials} from '@/lib/format'
import {STRINGS} from '@/lib/strings'
import {cn} from '@/lib/utils'
import {ThemeToggle} from '@/theme/ThemeToggle'
import {NAV_ITEMS, type NavItem} from './navigation'
import {useSidebarStore} from './sidebarStore'

const NAV_ITEM = 'flex h-8 items-center gap-2 rounded-md text-sm transition-colors'

/** Collapsed rows are icon-only and centred; the label survives as the accessible name. */
const rowShape = (collapsed: boolean) => (collapsed ? 'justify-center px-0' : 'px-3')

/** Wraps a collapsed row so its hidden label still reaches the pointer. */
function CollapsedLabel({collapsed, label, children}: {collapsed: boolean; label: string; children: ReactNode}) {
  if (!collapsed) return children

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function NavItemLink({item, collapsed, onNavigate}: {item: NavItem; collapsed: boolean; onNavigate?: () => void}) {
  const {to, label, icon: Icon, end} = item

  return (
    <CollapsedLabel collapsed={collapsed} label={label}>
      <NavLink
        to={to}
        end={end}
        onClick={onNavigate}
        className={({isActive}) =>
          cn(
            NAV_ITEM,
            rowShape(collapsed),
            isActive
              ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
              : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
          )
        }>
        <Icon aria-hidden className="size-4 shrink-0" />
        <span className={cn('flex-1 truncate', collapsed && 'sr-only')}>{label}</span>
      </NavLink>
    </CollapsedLabel>
  )
}

/** Module list shared by the desktop rail and the mobile drawer. */
function SidebarNav({collapsed = false, onNavigate}: {collapsed?: boolean; onNavigate?: () => void}) {
  return (
    <nav aria-label={STRINGS.shell.navigation} className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
      {NAV_ITEMS.map((item) => (
        <NavItemLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
    </nav>
  )
}

/** Collapses the desktop rail to icons. Only rendered inside the `md:flex` sidebar. */
function SidebarCollapseToggle({collapsed, onToggle}: {collapsed: boolean; onToggle: () => void}) {
  const label = collapsed ? STRINGS.shell.expandSidebar : STRINGS.shell.collapseSidebar
  const Icon = collapsed ? PanelLeftOpenIcon : PanelLeftCloseIcon

  return (
    <div className="p-2">
      <CollapsedLabel collapsed={collapsed} label={label}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={label}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar"
          className={cn(
            NAV_ITEM,
            rowShape(collapsed),
            'w-full text-muted-foreground outline-none hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
          )}>
          <Icon aria-hidden className="size-4 shrink-0" />
          <span className={cn('flex-1 text-left truncate', collapsed && 'sr-only')}>{STRINGS.shell.collapse}</span>
        </button>
      </CollapsedLabel>
    </div>
  )
}

function SidebarFooter({collapsed = false}: {collapsed?: boolean}) {
  const buildDate = formatDate(env.commitDate)

  if (collapsed) {
    const summary = [env.environment, shortCommit(), buildDate].filter(Boolean).join(' · ')

    return (
      <div className="flex shrink-0 justify-center border-t px-2 py-3">
        <CollapsedLabel collapsed label={summary}>
          <Badge size="md" variant="neutral" className="size-5.5 justify-center px-0">
            <BadgeDot />
            <span className="sr-only">{summary}</span>
          </Badge>
        </CollapsedLabel>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-t px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">{STRINGS.shell.environment}</span>
        <EnvironmentPill />
      </div>
      <CommitHash className="text-[11px] leading-[14px] text-muted-foreground">{buildDate ? ` · ${buildDate}` : null}</CommitHash>
    </div>
  )
}

/** Screen title for the header: derived from the route so modules get it for free. */
function useCurrentSection(): NavItem | undefined {
  const {pathname} = useLocation()
  return NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to))) ?? NAV_ITEMS[0]
}

/**
 * Protected application frame: sidebar navigation (a drawer under `md`, and
 * collapsible to an icon rail from `md` up) plus a header with the current
 * screen and the signed-in admin. New modules register in `navigation.ts` and
 * their routes under the same layout route.
 */
export default function AppShell() {
  const admin = useAuthStore((state) => state.admin)
  const collapsed = useSidebarStore((state) => state.collapsed)
  const toggleCollapsed = useSidebarStore((state) => state.toggleCollapsed)
  const [menuOpen, setMenuOpen] = useState(false)
  const section = useCurrentSection()

  const fullName = admin ? `${admin.name} ${admin.surname}`.trim() : ''
  const monogram = admin ? initials(admin.name, admin.surname) : '?'
  const SectionIcon = section?.icon

  return (
    <div className="flex h-svh bg-background">
      <TooltipProvider>
        <aside
          id="app-sidebar"
          data-collapsed={collapsed || undefined}
          className={cn(
            'hidden shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out md:flex',
            collapsed ? 'w-14' : 'w-60',
          )}>
          <div className={cn('flex h-14 shrink-0 items-center border-b', collapsed ? 'justify-center px-2' : 'px-4')}>
            {collapsed ? <BrandBadge className="size-7" /> : <BrandLockup badgeClassName="size-7" />}
          </div>
          <SidebarNav collapsed={collapsed} />
          <SidebarCollapseToggle collapsed={collapsed} onToggle={toggleCollapsed} />
          <SidebarFooter collapsed={collapsed} />
        </aside>
      </TooltipProvider>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-sidebar px-3 md:bg-transparent md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={STRINGS.shell.openMenu} className="size-10 md:hidden">
                  <MenuIcon aria-hidden />
                </Button>
              </SheetTrigger>
              {/* No description: the drawer is just the nav, so skip Radix's aria-describedby wiring. */}
              <SheetContent aria-describedby={undefined}>
                <SheetTitle className="sr-only">{STRINGS.shell.navigation}</SheetTitle>
                <div className="flex h-14 shrink-0 items-center border-b px-4">
                  <BrandLockup badgeClassName="size-7" />
                </div>
                <SidebarNav onNavigate={() => setMenuOpen(false)} />
                <SidebarFooter />
              </SheetContent>
            </Sheet>

            <span className="truncate text-sm font-semibold md:hidden">{STRINGS.app.name}</span>

            {SectionIcon ? <SectionIcon aria-hidden className="hidden size-4 text-muted-foreground md:block" /> : null}
            <span aria-hidden className="hidden h-4 w-px bg-border md:block" />
            <span className="hidden truncate text-sm font-medium md:block">{section?.title}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="lg" aria-label={STRINGS.shell.account} className="gap-2 pr-2 pl-1">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[10.5px] font-semibold text-foreground">
                    {monogram}
                  </span>
                  <span className="hidden max-w-40 truncate sm:inline">{fullName || admin?.email}</span>
                  <ChevronDownIcon aria-hidden data-icon="inline-end" className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
                  <span className="text-sm font-medium text-foreground">{fullName}</span>
                  <span className="truncate text-xs text-muted-foreground">{admin?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOutIcon aria-hidden />
                  {STRINGS.shell.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-5 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
