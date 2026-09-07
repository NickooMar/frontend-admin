import {ChevronDownIcon, LogOutIcon, MenuIcon} from 'lucide-react'
import {useState} from 'react'
import {NavLink, Outlet, useLocation} from 'react-router-dom'
import {signOut} from '@/auth/authActions'
import {useAuthStore} from '@/auth/authStore'
import {BrandLockup} from '@/components/BrandMark'
import {CommitHash, EnvironmentPill} from '@/components/EnvironmentPill'
import {Badge} from '@/components/ui/badge'
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
import {env} from '@/config/env'
import {formatDate, initials} from '@/lib/format'
import {STRINGS} from '@/lib/strings'
import {cn} from '@/lib/utils'
import {ThemeToggle} from '@/theme/ThemeToggle'
import {GENERAL_ITEMS, MODULE_ITEMS, type NavItem} from './navigation'

const SECTION_LABEL = 'px-3 pb-1.5 text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase'
const NAV_ITEM = 'flex h-8 items-center gap-2 rounded-md pl-3 text-sm transition-colors'

function NavItemLink({item, onNavigate}: {item: NavItem; onNavigate?: () => void}) {
  const {to, label, icon: Icon, end, disabled} = item

  if (disabled) {
    return (
      <span aria-disabled className={cn(NAV_ITEM, 'cursor-not-allowed pr-2 text-muted-foreground')}>
        <Icon aria-hidden className="size-4 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        <Badge size="xs">{STRINGS.shell.soonShort}</Badge>
      </span>
    )
  }

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({isActive}) =>
        cn(
          NAV_ITEM,
          'pr-3',
          isActive
            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
            : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
        )
      }>
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
    </NavLink>
  )
}

/** Section list shared by the desktop rail and the mobile drawer. */
function SidebarNav({onNavigate}: {onNavigate?: () => void}) {
  return (
    <nav aria-label={STRINGS.shell.navigation} className="flex flex-1 flex-col p-2 pt-3">
      <p className={SECTION_LABEL}>{STRINGS.shell.sectionGeneral}</p>
      <div className="flex flex-col gap-0.5">
        {GENERAL_ITEMS.map((item) => (
          <NavItemLink key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </div>

      <p className={cn(SECTION_LABEL, 'pt-5')}>{STRINGS.shell.sectionModules}</p>
      <div className="flex flex-col gap-0.5">
        {MODULE_ITEMS.map((item) => (
          <NavItemLink key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
  )
}

function SidebarFooter() {
  const buildDate = formatDate(env.commitDate)

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
  const items = [...GENERAL_ITEMS, ...MODULE_ITEMS]
  return items.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to))) ?? items[0]
}

/**
 * Protected application frame: sidebar navigation (a drawer under `md`) plus a
 * header with the current screen and the signed-in admin. New modules register
 * in `navigation.ts` and their routes under the same layout route.
 */
export default function AppShell() {
  const admin = useAuthStore((state) => state.admin)
  const [menuOpen, setMenuOpen] = useState(false)
  const section = useCurrentSection()

  const fullName = admin ? `${admin.name} ${admin.surname}`.trim() : ''
  const monogram = admin ? initials(admin.name, admin.surname) : '?'
  const SectionIcon = section?.icon

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 shrink-0 items-center border-b px-4">
          <BrandLockup badgeClassName="size-7" />
        </div>
        <SidebarNav />
        <SidebarFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
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

        <main className="flex-1 px-4 py-5 md:px-6 md:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
