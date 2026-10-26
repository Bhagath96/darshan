import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { setAuthToken } from '@/api'
import { getDb } from '@/api/db'
import { issueToken, toAuthUser } from '@/api/session'
import { routes } from '@/router'
import { makeStore, type RootState } from '@/store'
import { initialAuthState } from '@/store/auth/authSlice'

export type DemoUsername = 'devotee' | 'lakshmi' | 'staff' | 'admin'

/** Auth state for a demo user, as if they had just logged in. Also sets the API token. */
export function sessionFor(username: DemoUsername): RootState['auth'] {
  const stored = getDb().users.find((u) => u.username === username)
  if (!stored) throw new Error(`Unknown demo user: ${username}`)
  const token = issueToken(stored.id)
  setAuthToken(token)
  return { ...initialAuthState, user: toAuthUser(stored), token, status: 'success' }
}

interface Options {
  /** Starting URL, e.g. "/darshan?temple=tm-sastha". */
  url?: string
  /** Log in as a demo user before the first render. */
  as?: DemoUsername
  preloadedState?: Partial<RootState>
}

/** Renders the whole app (real routes, store and sagas) inside a memory router. */
export function renderApp({ url = '/', as, preloadedState = {} }: Options = {}) {
  const state: Partial<RootState> = { ...preloadedState }
  if (as) state.auth = sessionFor(as)
  const store = makeStore(state)
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  const user = userEvent.setup()
  const view = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )
  return { ...view, store, router, user }
}

/** Current path + query of the memory router, e.g. "/darshan?temple=tm-krishna". */
export function currentUrl(router: ReturnType<typeof createMemoryRouter>): string {
  const { pathname, search } = router.state.location
  return pathname + search
}
