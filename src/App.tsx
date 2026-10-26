import { useState } from 'react'
import { Provider } from 'react-redux'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from './router'
import { loadPersistedState, makeStore } from './store'

export function App() {
  // Created once per app mount, so tests and hot reload don't share state.
  const [store] = useState(() => makeStore(loadPersistedState()))
  const [router] = useState(() => createBrowserRouter(routes))
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  )
}
