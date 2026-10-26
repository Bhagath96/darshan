import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, configureMock, failNextCalls } from '@/api'
import { getDb } from '@/api/db'
import { simulate } from '@/api/mockClient'

/** Resolves to "pending" if the promise has not settled yet. */
async function stateOf(promise: Promise<unknown>) {
  const pending = Symbol('pending')
  const result = await Promise.race([
    promise.then(
      () => 'resolved',
      () => 'rejected',
    ),
    Promise.resolve(pending),
  ])
  return result === pending ? 'pending' : result
}

describe('simulate()', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits between minDelay and maxDelay before answering', async () => {
    vi.useFakeTimers()
    // random() = 0.5 → delay = 200 + floor(0.5 * 1301) = 850 ms
    configureMock({ minDelay: 200, maxDelay: 1500, failureRate: 0, random: () => 0.5 }, 'darshan')
    const call = simulate('darshan', () => 'ok')

    await vi.advanceTimersByTimeAsync(849)
    expect(await stateOf(call)).toBe('pending')
    await vi.advanceTimersByTimeAsync(1)
    await expect(call).resolves.toBe('ok')
  })

  it('never waits longer than maxDelay', async () => {
    vi.useFakeTimers()
    configureMock(
      { minDelay: 200, maxDelay: 1500, failureRate: 0, random: () => 0.9999 },
      'darshan',
    )
    const call = simulate('darshan', () => 'ok')
    await vi.advanceTimersByTimeAsync(1500)
    await expect(call).resolves.toBe('ok')
  })

  it('fails with a retryable NETWORK error at the configured rate, without running the action', async () => {
    configureMock({ failureRate: 1, random: () => 0 })
    const action = vi.fn(() => 'saved')
    const error = await simulate('darshan', action).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'NETWORK', retryable: true })
    expect(action).not.toHaveBeenCalled()
  })

  it('succeeds when failureRate is 0', async () => {
    configureMock({ failureRate: 0, random: () => 0 })
    await expect(simulate('vazhipadu', () => 42)).resolves.toBe(42)
  })

  it('failNextCalls() fails exactly the next N calls', async () => {
    failNextCalls(2)
    await expect(simulate('auth', () => 1)).rejects.toMatchObject({ code: 'NETWORK' })
    await expect(simulate('auth', () => 2)).rejects.toMatchObject({ code: 'NETWORK' })
    await expect(simulate('auth', () => 3)).resolves.toBe(3)
  })

  it('returns a copy, so callers cannot change server data', async () => {
    const server = { count: 1 }
    const copy = await simulate('vazhipadu', () => server)
    copy.count = 99
    expect(server.count).toBe(1)
  })

  describe('idempotency', () => {
    it('replays the first result for a repeated key instead of running the action again', async () => {
      const action = vi.fn(() => ({ id: getDb().counters.booking++ }))
      const first = await simulate('darshan', action, { idempotencyKey: 'k1' })
      const second = await simulate('darshan', action, { idempotencyKey: 'k1' })
      expect(second).toEqual(first)
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('"failed after save": the action runs, the caller gets TIMEOUT, and a retry returns the saved result', async () => {
      const action = vi.fn(() => 'booking-1')
      failNextCalls(1, 'after')
      await expect(simulate('darshan', action, { idempotencyKey: 'k2' })).rejects.toMatchObject({
        code: 'TIMEOUT',
        retryable: true,
      })
      expect(action).toHaveBeenCalledTimes(1)

      await expect(simulate('darshan', action, { idempotencyKey: 'k2' })).resolves.toBe('booking-1')
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('reads without a key never fail "after save" (there is nothing to replay)', async () => {
      failNextCalls(1, 'after')
      await expect(simulate('darshan', () => 'x')).rejects.toMatchObject({ code: 'NETWORK' })
    })

    it('does not store a result when the action itself throws, so a fixed retry can succeed', async () => {
      let attempt = 0
      const action = () => {
        attempt += 1
        if (attempt === 1) throw new ApiError('CONFLICT', 'Only 2 tickets left.')
        return 'ok'
      }
      await expect(simulate('darshan', action, { idempotencyKey: 'k3' })).rejects.toMatchObject({
        code: 'CONFLICT',
      })
      await expect(simulate('darshan', action, { idempotencyKey: 'k3' })).resolves.toBe('ok')
    })
  })
})

describe('ApiError', () => {
  it('marks only NETWORK and TIMEOUT as retryable', () => {
    expect(new ApiError('NETWORK', '').retryable).toBe(true)
    expect(new ApiError('TIMEOUT', '').retryable).toBe(true)
    expect(new ApiError('VALIDATION', '').retryable).toBe(false)
    expect(new ApiError('UNAUTHORIZED', '').retryable).toBe(false)
  })
})
