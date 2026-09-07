import {cn} from 'cn'
import {Badge, BadgeDot} from '@/components/ui/badge'
import {env} from '@/config/env'

const SHORT_HASH_LENGTH = 7

export const shortCommit = () => (env.commitHash ? env.commitHash.slice(0, SHORT_HASH_LENGTH) : '')

/**
 * `● production` pill. `inverted` is the translucent treatment for the dark
 * login panel; everywhere else it sits on a muted surface.
 */
export function EnvironmentPill({className, inverted = false}: {className?: string; inverted?: boolean}) {
  return (
    <Badge size="md" variant={inverted ? 'inverted' : 'neutral'} className={className}>
      <BadgeDot />
      {env.environment}
    </Badge>
  )
}

/** The short commit hash, monospaced. Renders nothing when the build did not stamp one. */
export function CommitHash({className, children}: {className?: string; children?: React.ReactNode}) {
  const hash = shortCommit()
  if (!hash) return null

  return (
    <span className={cn('font-mono text-[11.5px]', className)}>
      {hash}
      {children}
    </span>
  )
}
