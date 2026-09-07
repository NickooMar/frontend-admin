import {type ReactNode, useEffect} from 'react'
import {FullScreenLoader} from '@/components/FullScreenLoader'
import {STRINGS} from '@/lib/strings'
import {restoreSession} from './authActions'
import {useAuthStore} from './authStore'

/**
 * Runs once at startup: a persisted token is validated against `/me` before
 * any route renders, so a refresh keeps the session and a revoked one is
 * dropped without flashing protected UI.
 */
export function AuthBootstrap({children}: {children: ReactNode}) {
  const status = useAuthStore((state) => state.status)

  useEffect(() => {
    if (useAuthStore.getState().status === 'checking') void restoreSession()
  }, [])

  if (status === 'checking') return <FullScreenLoader label={STRINGS.shell.checkingSession} />

  return children
}
