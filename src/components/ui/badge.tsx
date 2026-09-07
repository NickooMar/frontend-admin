import type * as React from 'react'
import {cva, type VariantProps} from 'class-variance-authority'
import {cn} from 'cn'

const badgeVariants = cva('inline-flex w-fit shrink-0 items-center gap-1.5 font-medium whitespace-nowrap', {
  variants: {
    variant: {
      muted: 'bg-muted text-muted-foreground',
      neutral: 'bg-muted text-foreground',
      /** Sits on the dark login panel: tinted with the panel's own text colour. */
      inverted: 'border border-current/15 bg-current/8',
    },
    size: {
      /** Sidebar «Pronto». */
      xs: 'rounded-full px-1.5 py-px text-[10px] leading-[13px]',
      /** Card «Próximamente». */
      sm: 'rounded-full px-2 py-0.5 text-[11px] leading-[14px]',
      /** Environment pill. */
      md: 'h-5.5 rounded-full px-2.5 text-[11.5px]',
      /** Role chip; square-ish so it does not read as a status. */
      code: 'h-5.5 rounded-sm px-2 font-mono text-xs font-normal',
    },
  },
  defaultVariants: {variant: 'muted', size: 'sm'},
})

function Badge({className, variant, size, ...props}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({variant, size}), className)} {...props} />
}

/** The 5px status dot inside the environment pill. */
function BadgeDot({className, ...props}: React.ComponentProps<'span'>) {
  return <span aria-hidden data-slot="badge-dot" className={cn('size-[5px] rounded-full bg-current opacity-70', className)} {...props} />
}

export {Badge, BadgeDot, badgeVariants}
