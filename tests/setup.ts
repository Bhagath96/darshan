import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { configureMock, resetDb, resetMockConfig, setAuthToken } from '@/api'

// Pages load on demand (React.lazy); the first load of a page is slower under coverage
// instrumentation or on a busy CI machine, so give findBy*/waitFor more than the default 1 s.
configure({ asyncUtilTimeout: 3000 })

/**
 * Every test starts from the same place: fresh seed data, an empty localStorage,
 * no logged-in user, and a mock API with no delay and no random failures.
 * Tests that need failures use `failNextCalls()` or `configureMock()` themselves.
 */
beforeEach(() => {
  localStorage.clear()
  resetDb()
  resetMockConfig()
  configureMock({ minDelay: 0, maxDelay: 0, failureRate: 0 })
  setAuthToken(null)
})

afterEach(() => {
  cleanup()
})

// --- jsdom gaps used by Radix UI and sonner ---------------------------------

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

if (!('ResizeObserver' in window)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.assign(window, { ResizeObserver: ResizeObserverStub })
}

Element.prototype.scrollIntoView ??= function scrollIntoView() {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
