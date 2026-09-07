import {lazy, Suspense} from 'react'
import {createBrowserRouter, Navigate} from 'react-router-dom'
import {RedirectIfAuthenticated, RequireAuth} from '@/auth/RequireAuth'
import {FullScreenLoader} from '@/components/FullScreenLoader'
import {STRINGS} from '@/lib/strings'
import AppShell from './AppShell'

const LoginScreen = lazy(() => import('@/screens/LoginScreen'))
const DashboardScreen = lazy(() => import('@/screens/DashboardScreen'))

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<FullScreenLoader label={STRINGS.shell.checkingSession} />}>{element}</Suspense>
)

/**
 * Route table. Everything under `RequireAuth` → `AppShell` is protected; new
 * admin modules (brands, kiosks, ...) are added as children of the shell.
 */
export const routes = [
  {
    path: '/login',
    element: <RedirectIfAuthenticated>{withSuspense(<LoginScreen />)}</RedirectIfAuthenticated>,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [{index: true, element: withSuspense(<DashboardScreen />)}],
      },
    ],
  },
  {path: '*', element: <Navigate to="/" replace />},
]

export const router = createBrowserRouter(routes)
