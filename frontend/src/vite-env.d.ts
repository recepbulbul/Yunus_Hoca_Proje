/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL. Defaults to `${BASE_URL}api`, served by MSW in the prototype. */
  readonly VITE_API_BASE_URL?: string
  /** "true" to start the MSW mock API (always on in dev and on GitHub Pages). */
  readonly VITE_USE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
