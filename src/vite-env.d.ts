/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DIAGNOSTICA_API_ENDPOINT?: string
  readonly VITE_DIAGNOSTICA_ENV?: string
  readonly VITE_HMR_PROXY?: string
  readonly VITE_COMMIT_HASH?: string
  readonly VITE_COMMIT_DATE?: string
}
