import { describe, expect, it } from 'vitest'
import { getMockConfig } from '@/api/mockClient'
import { applyMockSettings } from '@/mockSettings'

const env = (values: Partial<ImportMetaEnv>) =>
  ({
    DEV: false,
    PROD: true,
    MODE: 'production',
    BASE_URL: '/',
    SSR: false,
    ...values,
  }) as ImportMetaEnv

describe('applyMockSettings', () => {
  it('uses build-time env vars', () => {
    applyMockSettings(env({ VITE_MOCK_FAILURE_RATE: '0.05', VITE_MOCK_LATENCY_MS: '250' }), '')
    expect(getMockConfig('darshan')).toMatchObject({
      failureRate: 0.05,
      minDelay: 250,
      maxDelay: 250,
    })
  })

  it('ignores out-of-range or junk values', () => {
    applyMockSettings(env({ VITE_MOCK_FAILURE_RATE: '7', VITE_MOCK_LATENCY_MS: 'soon' }), '')
    expect(getMockConfig('darshan')).toMatchObject({ failureRate: 0, minDelay: 0 }) // the test defaults
  })

  it('ignores URL params on a production build unless allowed', () => {
    applyMockSettings(env({}), '?fail=1')
    expect(getMockConfig('darshan').failureRate).toBe(0)
    applyMockSettings(env({ VITE_MOCK_URL_PARAMS: 'true' }), '?fail=1&latency=5')
    expect(getMockConfig('darshan')).toMatchObject({ failureRate: 1, minDelay: 5 })
  })

  it('always accepts URL params in development', () => {
    applyMockSettings(env({ DEV: true }), '?fail=0.5')
    expect(getMockConfig('vazhipadu').failureRate).toBe(0.5)
  })
})
