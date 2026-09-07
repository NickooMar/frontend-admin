const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '')

/**
 * Frontend configuration. Every value comes from `VITE_*` variables (see
 * `.env.example`); in Docker they are placeholders replaced at container start
 * by `set_variables.sh`, exactly like the other Diagnóstica frontends.
 */
export const env = {
  /** backend-diagnostica base URL, no trailing slash. */
  apiEndpoint: stripTrailingSlash(import.meta.env.VITE_DIAGNOSTICA_API_ENDPOINT ?? ''),
  environment: import.meta.env.VITE_DIAGNOSTICA_ENV ?? 'localhost',
  commitHash: import.meta.env.VITE_COMMIT_HASH ?? '',
  commitDate: import.meta.env.VITE_COMMIT_DATE ?? '',
} as const

if (!env.apiEndpoint && import.meta.env.DEV) {
  console.warn('[frontend-admin] VITE_DIAGNOSTICA_API_ENDPOINT is not set; API calls will hit the current origin.')
}
