import {ChevronRightIcon} from 'lucide-react'
import {MODULE_ITEMS, type NavItem} from '@/app/navigation'
import {useAuthStore} from '@/auth/authStore'
import {CommitHash, EnvironmentPill} from '@/components/EnvironmentPill'
import {Badge} from '@/components/ui/badge'
import {formatDateTime} from '@/lib/format'
import {STRINGS} from '@/lib/strings'
import {cn} from '@/lib/utils'

const CARD = 'rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 sm:p-5'

function ModuleCard({item}: {item: NavItem}) {
  const {title, description, icon: Icon, disabled} = item

  return (
    <article className={cn(CARD, 'flex flex-col gap-3 sm:gap-3.5')}>
      <div className="flex items-center justify-between gap-x-3 gap-y-3.5 sm:flex-wrap">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-foreground sm:order-1 sm:size-[34px]">
          <Icon aria-hidden className="size-4 sm:size-[17px]" />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-medium tracking-[-0.008em] sm:order-3 sm:basis-full sm:flex-none sm:text-base sm:whitespace-normal">
          {title}
        </h3>
        {disabled ? (
          <Badge size="sm" className="sm:order-2 sm:ml-auto">
            {STRINGS.modules.soon}
          </Badge>
        ) : null}
      </div>

      <p className="text-[13.5px] leading-[19px] text-pretty text-muted-foreground sm:text-sm sm:leading-5">{description}</p>

      {disabled ? null : (
        <p className="mt-0.5 hidden items-center gap-1 border-t pt-3.5 text-[13px] font-medium text-muted-foreground sm:flex">
          {STRINGS.modules.open}
          <ChevronRightIcon aria-hidden className="size-3.5" />
        </p>
      )}
    </article>
  )
}

/** Label/value pair: a stacked row on mobile, a bordered column at `lg`. */
function SessionItem({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t py-2.5 last:pb-0 lg:flex-col lg:justify-start lg:gap-1.5 lg:border-t-0 lg:border-l lg:py-0 lg:pl-6 lg:first:border-l-0 lg:first:pl-0">
      <dt className="shrink-0 text-[13.5px] text-muted-foreground lg:text-[11px] lg:font-medium lg:tracking-[0.06em] lg:uppercase">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-col items-end gap-0.5 text-right text-[13.5px] lg:items-start lg:gap-1.5 lg:text-left lg:text-sm">
        {children}
      </dd>
    </div>
  )
}

export default function DashboardScreen() {
  const admin = useAuthStore((state) => state.admin)
  const fullName = admin ? `${admin.name} ${admin.surname}`.trim() : ''
  const lastLogin = formatDateTime(admin?.lastLoginAt)

  return (
    <div className="flex max-w-[1152px] flex-col gap-6 md:gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.021em] md:text-2xl md:leading-8">{STRINGS.dashboard.title}</h1>
        {admin ? <p className="text-sm text-muted-foreground">{STRINGS.dashboard.welcome(admin.name)}</p> : null}
      </header>

      <section className="flex flex-col gap-2.5 md:gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[13px] font-semibold tracking-[-0.005em]">{STRINGS.modules.title}</h2>
          <span className="hidden text-[13px] text-muted-foreground sm:block">{STRINGS.modules.hint}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {MODULE_ITEMS.map((item) => (
            <ModuleCard key={item.to} item={item} />
          ))}
        </div>
      </section>

      <section className={cn(CARD, 'flex flex-col')}>
        <h2 className="mb-3 text-[15px] font-medium tracking-[-0.008em] sm:mb-4 sm:text-base">{STRINGS.session.title}</h2>

        <dl className="grid grid-cols-1 lg:grid-cols-4 lg:gap-6">
          <SessionItem label={STRINGS.session.admin}>
            <span className="truncate font-medium">{fullName}</span>
            <span className="truncate text-[12.5px] text-muted-foreground lg:text-[13px]">{admin?.email}</span>
          </SessionItem>

          <SessionItem label={STRINGS.session.role}>
            <Badge size="code" variant="neutral">
              {admin?.role}
            </Badge>
          </SessionItem>

          <SessionItem label={STRINGS.session.lastLogin}>
            <span>{lastLogin ?? STRINGS.session.lastLoginEmpty}</span>
          </SessionItem>

          <SessionItem label={STRINGS.shell.environment}>
            <span className="flex items-center gap-2">
              <EnvironmentPill />
              <CommitHash className="text-xs text-muted-foreground" />
            </span>
          </SessionItem>
        </dl>
      </section>
    </div>
  )
}
