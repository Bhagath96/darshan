import { ApiError } from './errors'
import { getDb } from './db'

/**
 * Network simulator shared by every mock API function.
 * Each call waits a random delay, may fail, and returns a deep copy so the UI
 * can never mutate the "server" data by accident.
 */

/** 'content' = public temple information and notices. */
export type ApiDomain = 'auth' | 'content' | 'darshan' | 'vazhipadu'

export interface MockConfig {
  minDelay: number
  maxDelay: number
  /** 0–1. Chance that a call fails. */
  failureRate: number
  random: () => number
}

const DEFAULTS: Record<ApiDomain, Omit<MockConfig, 'random'>> = {
  auth: { minDelay: 200, maxDelay: 800, failureRate: 0.05 },
  content: { minDelay: 200, maxDelay: 800, failureRate: 0.05 },
  darshan: { minDelay: 200, maxDelay: 1500, failureRate: 0.2 },
  vazhipadu: { minDelay: 200, maxDelay: 1000, failureRate: 0.1 },
}

const configs: Record<ApiDomain, MockConfig> = {
  auth: { ...DEFAULTS.auth, random: Math.random },
  content: { ...DEFAULTS.content, random: Math.random },
  darshan: { ...DEFAULTS.darshan, random: Math.random },
  vazhipadu: { ...DEFAULTS.vazhipadu, random: Math.random },
}

export function configureMock(patch: Partial<MockConfig>, domain?: ApiDomain): void {
  const domains = domain ? [domain] : (Object.keys(configs) as ApiDomain[])
  for (const d of domains) Object.assign(configs[d], patch)
}

export function resetMockConfig(): void {
  for (const d of Object.keys(configs) as ApiDomain[]) {
    configs[d] = { ...DEFAULTS[d], random: Math.random }
  }
  forcedFailures.length = 0
}

export function getMockConfig(domain: ApiDomain): Readonly<MockConfig> {
  return configs[domain]
}

/**
 * 'before': the request never reaches the server (nothing is saved).
 * 'after':  the server saves the change, then the response is lost.
 */
export type FailurePhase = 'before' | 'after'

const forcedFailures: FailurePhase[] = []

/** Test/dev helper: make the next N calls fail in a known way. */
export function failNextCalls(times = 1, phase: FailurePhase = 'before'): void {
  for (let i = 0; i < times; i++) forcedFailures.push(phase)
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function pickFailure(cfg: MockConfig, canFailAfterCommit: boolean): FailurePhase | null {
  const forced = forcedFailures.shift()
  if (forced) return forced === 'after' && !canFailAfterCommit ? 'before' : forced
  if (cfg.random() >= cfg.failureRate) return null
  return canFailAfterCommit && cfg.random() < 0.5 ? 'after' : 'before'
}

interface SimulateOptions {
  /** A repeat key returns the first result instead of running the action again. */
  idempotencyKey?: string
}

export async function simulate<T>(
  domain: ApiDomain,
  action: () => T,
  options: SimulateOptions = {},
): Promise<T> {
  const cfg = configs[domain]
  const span = Math.max(0, cfg.maxDelay - cfg.minDelay)
  await sleep(cfg.minDelay + Math.floor(cfg.random() * (span + 1)))

  const { idempotencyKey } = options
  // A lost response only matters for writes that can be safely retried.
  const failure = pickFailure(cfg, Boolean(idempotencyKey))

  if (failure === 'before') {
    throw new ApiError(
      'NETWORK',
      'Could not reach the server. Please check your connection and try again.',
    )
  }

  const store = getDb().idempotency
  let result: T
  if (idempotencyKey && store.has(idempotencyKey)) {
    result = store.get(idempotencyKey) as T
  } else {
    result = action()
    if (idempotencyKey) store.set(idempotencyKey, result)
  }

  if (failure === 'after') {
    throw new ApiError('TIMEOUT', 'The server did not respond in time. Please try again.')
  }

  return structuredClone(result)
}
