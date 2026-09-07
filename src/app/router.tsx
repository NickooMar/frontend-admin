import {lazy, Suspense} from 'react'
import {createBrowserRouter, Navigate} from 'react-router-dom'
import {RedirectIfAuthenticated, RequireAuth} from '@/auth/RequireAuth'
import {FullScreenLoader} from '@/components/FullScreenLoader'
import {STRINGS} from '@/lib/strings'
import AppShell from './AppShell'

const LoginScreen = lazy(() => import('@/screens/LoginScreen'))
const BrandsScreen = lazy(() => import('@/screens/brands/BrandsScreen'))

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<FullScreenLoader label={STRINGS.shell.checkingSession} />}>{element}</Suspense>
)

/**
 * Route table. Everything under `RequireAuth` → `AppShell` is protected. Brands
 * is the landing module: `/` redirects there and the selected brand lives in
 * the URL (`/brands/:brandId`) so a refresh or a shared link reopens it.
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
        children: [
          {index: true, element: <Navigate to="/brands" replace />},
          {path: 'brands', element: withSuspense(<BrandsScreen />)},
          {path: 'brands/:brandId', element: withSuspense(<BrandsScreen />)},
        ],
      },
    ],
  },
  {path: '*', element: <Navigate to="/" replace />},
]

export const router = createBrowserRouter(routes)
