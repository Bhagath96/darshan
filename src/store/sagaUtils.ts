import type { PayloadAction } from '@reduxjs/toolkit'
import { fork, take } from 'redux-saga/effects'

/**
 * Like takeEvery, but runs at most one worker per id (the action payload) at a time:
 * a second "cancel #42" while the first is still in flight is ignored.
 * Different ids run side by side.
 */
export function* takeOnePerId(
  pattern: string,
  worker: (action: PayloadAction<string>) => Generator,
) {
  const busy = new Set<string>()
  while (true) {
    const action: PayloadAction<string> = yield take(pattern)
    if (busy.has(action.payload)) continue
    busy.add(action.payload)
    yield fork(function* run() {
      try {
        yield* worker(action)
      } finally {
        busy.delete(action.payload)
      }
    })
  }
}
