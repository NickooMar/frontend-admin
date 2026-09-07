import {Navigate, Outlet, useLocation} from 'react-router-dom'
import {FullScreenLoader} from '@/components/FullScreenLoader'
import {STRINGS} from '@/lib/strings'
import {useAuthStore} from './authStore'

/** Layout route: renders its children only for an authenticated admin. */
export function RequireAuth() {
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (status === 'checking') return <FullScreenLoader label={STRINGS.shell.checkingSession} />
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{from: location.pathname}} />

  return <Outlet />
}

/** Wrapper for public-only routes (login): an authenticated admin is sent to the app. */
export function RedirectIfAuthenticated({children}: {children: React.ReactNode}) {
  const status = useAuthStore((state) => state.status)

  if (status === 'authenticated') return <Navigate to="/" replace />

  return children
}
