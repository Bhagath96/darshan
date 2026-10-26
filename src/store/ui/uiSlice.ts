import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/** Screen reader announcements. `id` changes on every call so a repeated message is read again. */
export interface UiState {
  announcement: { id: number; message: string; politeness: 'polite' | 'assertive' }
}

const initialState: UiState = {
  announcement: { id: 0, message: '', politeness: 'polite' },
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    announce: {
      reducer(
        state,
        action: PayloadAction<{ message: string; politeness: 'polite' | 'assertive' }>,
      ) {
        state.announcement = { id: state.announcement.id + 1, ...action.payload }
      },
      prepare(message: string, politeness: 'polite' | 'assertive' = 'polite') {
        return { payload: { message, politeness } }
      },
    },
  },
})

export const { announce } = uiSlice.actions
export default uiSlice.reducer
