import {RouterProvider} from 'react-router-dom'
import {AuthBootstrap} from '@/auth/AuthBootstrap'
import {router} from './router'

export default function App() {
  return (
    <AuthBootstrap>
      <RouterProvider router={router} />
    </AuthBootstrap>
  )
}
