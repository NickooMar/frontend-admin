import type {LucideIcon} from 'lucide-react'
import {cn} from '@/lib/utils'

/** One footer line of a card node: icon + text, like the «Deployed just now» rows in the reference design. */
export function NodeRow({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: LucideIcon
  title?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      title={title}
      className={cn('flex min-h-[26px] items-center gap-2 px-3.5 text-xs text-muted-foreground not-last:border-b', className)}>
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">{children}</span>
    </div>
  )
}
