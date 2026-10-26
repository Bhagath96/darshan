import { configureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import { loadAuthState } from './auth/authSlice'
import { loadI18nState } from './i18n/i18nSlice'
import { initialNoticesState, loadNoticesSeen } from './notices/noticesSlice'
import { rootReducer, type RootState } from './rootReducer'
import { loadCartState } from './vazhipadu/cartSlice'
import { rootSaga } from './rootSaga'

/** Builds a store. Tests pass their own `preloadedState`; the app loads saved preferences. */
export function makeStore(preloadedState?: Partial<RootState>) {
  const sagaMiddleware = createSagaMiddleware()
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefault) => getDefault({ thunk: false }).concat(sagaMiddleware),
  })
  sagaMiddleware.run(rootSaga)
  return store
}

export function loadPersistedState(): Partial<RootState> {
  return {
    auth: loadAuthState(),
    cart: loadCartState(),
    i18n: loadI18nState(),
    notices: { ...initialNoticesState, lastSeenAt: loadNoticesSeen() },
  }
}

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
export type { RootState }
