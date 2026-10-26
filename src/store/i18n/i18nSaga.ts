import type { PayloadAction } from '@reduxjs/toolkit'
import { call, takeEvery } from 'redux-saga/effects'
import { saveJson, STORAGE_KEYS } from '../persistence'
import { setLanguage } from './i18nSlice'
import type { Language } from '@/types'

function* persistLanguage(action: PayloadAction<Language>) {
  yield call(saveJson, STORAGE_KEYS.language, action.payload)
}

export function* i18nSaga() {
  yield takeEvery(setLanguage.type, persistLanguage)
}
