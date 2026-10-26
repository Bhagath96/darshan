import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { loadJson, STORAGE_KEYS } from '../persistence'
import type { Language } from '@/types'

export interface I18nState {
  language: Language
}

const isLanguage = (value: unknown): value is Language => value === 'en' || value === 'ml'

export function loadI18nState(): I18nState {
  return { language: loadJson(STORAGE_KEYS.language, isLanguage) ?? 'en' }
}

const initialState: I18nState = { language: 'en' }

const i18nSlice = createSlice({
  name: 'i18n',
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<Language>) {
      state.language = action.payload
    },
  },
})

export const { setLanguage } = i18nSlice.actions
export default i18nSlice.reducer
