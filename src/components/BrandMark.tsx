import {cn} from 'cn'
import {STRINGS} from '@/lib/strings'

/**
 * Placeholder isotype: a geometric pulse, not a real Diagnóstica mark. The repo
 * only ships the template favicon, so this is the one shape the design uses
 * everywhere (login panel, sidebar, mobile header) until branding arrives.
 */
export function BrandGlyph({className}: {className?: string}) {
  return (
    <svg
      aria-hidden="true"
      role="presentation"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-[60%]', className)}>
      <path d="M3 12h3.6l2-5.6 3.5 11.2 2.5-7.1 1.6 1.5H21" />
    </svg>
  )
}

/**
 * Isotype in its rounded tile. `inverted` is the treatment used on the dark
 * login panel, where the tile is light and the glyph dark.
 */
export function BrandBadge({className, inverted = false}: {className?: string; inverted?: boolean}) {
  return (
    <span
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-md',
        inverted ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground',
        className,
      )}>
      <BrandGlyph />
    </span>
  )
}

/** Isotype + product name + tagline. `tagline={false}` for the compact mobile header. */
export function BrandLockup({
  className,
  inverted = false,
  tagline = true,
  badgeClassName,
}: {
  className?: string
  inverted?: boolean
  tagline?: boolean
  badgeClassName?: string
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <BrandBadge inverted={inverted} className={badgeClassName} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold tracking-[-0.01em]">{STRINGS.app.name}</span>
        {tagline ? (
          <span className={cn('truncate text-xs', inverted ? 'opacity-50' : 'text-muted-foreground')}>{STRINGS.app.tagline}</span>
        ) : null}
      </span>
    </div>
  )
}
