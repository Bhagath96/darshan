/// <reference types="vite/client" />

/** Build-time settings. All optional; see .env.example. */
interface ImportMetaEnv {
  /** 0–1. Overrides the mock API failure rate for every domain. */
  readonly VITE_MOCK_FAILURE_RATE?: string
  /** Fixed mock API delay in ms (0–10000). */
  readonly VITE_MOCK_LATENCY_MS?: string
  /** "true" lets ?fail= and ?latency= work on a deployed build (for demos). */
  readonly VITE_MOCK_URL_PARAMS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
