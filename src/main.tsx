import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'

import './index.css'

import App from '@/app/App'
import {env} from '@/config/env'
import {initTheme} from '@/theme/themeStore'

if (env.commitHash) console.info('Commit:', env.commitHash, env.commitDate)

// Re-applies what the inline bootstrap in index.html already painted, and keeps
// the `system` preference following the OS from here on.
initTheme()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
