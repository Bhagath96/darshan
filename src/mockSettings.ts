import { configureMock } from './api'

/**
 * Mock API settings for this deployment. Each source can override the one before:
 *   1. the built-in defaults (darshan 20% failures, 200–1500 ms; see api/mockClient.ts)
 *   2. build-time env vars: VITE_MOCK_FAILURE_RATE, VITE_MOCK_LATENCY_MS
 *   3. URL params ?fail=0.5 and ?latency=0 — in development, or when VITE_MOCK_URL_PARAMS=true
 */

/** A number in [min, max], or undefined for anything else (empty, NaN, out of range). */
function parseNumber(
  value: string | null | undefined,
  min: number,
  max: number,
): number | undefined {
  if (value === null || value === undefined || value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined
}

function apply(failure: number | undefined, latency: number | undefined) {
  if (failure !== undefined) configureMock({ failureRate: failure })
  if (latency !== undefined) configureMock({ minDelay: latency, maxDelay: latency })
}

export function applyMockSettings(
  env: ImportMetaEnv = import.meta.env,
  search = window.location.search,
): void {
  apply(
    parseNumber(env.VITE_MOCK_FAILURE_RATE, 0, 1),
    parseNumber(env.VITE_MOCK_LATENCY_MS, 0, 10_000),
  )

  if (env.DEV || env.VITE_MOCK_URL_PARAMS === 'true') {
    const params = new URLSearchParams(search)
    apply(parseNumber(params.get('fail'), 0, 1), parseNumber(params.get('latency'), 0, 10_000))
  }
}
