import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit'
import type { AppError } from '../types'
import type { RootState } from '../rootReducer'
import { SAVE_ACTIONS } from './manageActions'
import type { RequestStatus } from '@/types'

/**
 * The add/edit dialog that is open right now (only one can be). It shows "Saving…" while
 * the request runs, keeps the form and shows the error if it fails, and closes on success.
 */
export interface EditorState {
  /** Which dialog is open (its id), or null. */
  openId: string | null
  status: RequestStatus
  error: AppError | null
}

const initialState: EditorState = { openId: null, status: 'idle', error: null }

const editorSlice = createSlice({
  name: 'adminEditor',
  initialState,
  reducers: {
    /** A dialog opens with a clean state. */
    editorOpened(_state, action: PayloadAction<string>) {
      return { ...initialState, openId: action.payload }
    },
    /** Closed by the user. Ignored while a save is running: its result decides. */
    editorClosed(state) {
      if (state.status !== 'loading') return initialState
    },
    /** Saved: the dialog closes. */
    editorSucceeded() {
      return { ...initialState, status: 'success' as const }
    },
    editorFailed(state, action: PayloadAction<AppError>) {
      state.status = 'error'
      state.error = action.payload
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(isAnyOf(...SAVE_ACTIONS), (state) => {
      state.status = 'loading'
      state.error = null
    })
  },
})

export const { editorOpened, editorClosed, editorSucceeded, editorFailed } = editorSlice.actions
export default editorSlice.reducer
export const selectEditor = (state: RootState) => state.adminEditor
