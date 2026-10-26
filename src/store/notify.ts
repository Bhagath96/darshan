import { call, put, select } from 'redux-saga/effects'
import { toast } from 'sonner'
import type { RootState } from './rootReducer'
import type { AppError } from './types'
import { announce } from './ui/uiSlice'
import { errorText, translate, type MessageKey, type TranslateVars } from '@/i18n'
import type { Language } from '@/types'

type Kind = 'success' | 'error'

function* language() {
  return (yield select((s: RootState) => s.i18n.language)) as Language
}

function* show(kind: Kind, text: string) {
  yield call(kind === 'success' ? toast.success : toast.error, text)
  // Toasts are not reliably read out, so also use the app's own live region.
  yield put(announce(text, kind === 'error' ? 'assertive' : 'polite'))
}

/** Toast + screen reader announcement, in the user's language. For use inside sagas. */
export function* notify(kind: Kind, key: MessageKey, vars?: TranslateVars) {
  const lang: Language = yield* language()
  yield* show(kind, translate(lang, key, vars))
}

/** Same, for an error that came back from the API. */
export function* notifyError(error: AppError) {
  const lang: Language = yield* language()
  yield* show('error', errorText(lang, error))
}
