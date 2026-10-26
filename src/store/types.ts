import type { ApiErrorCode } from '@/api'
import type { RequestStatus } from '@/types'

/** An error as kept in the store: plain data (serialisable), with the code for translation. */
export interface AppError {
  code: ApiErrorCode | 'UNKNOWN'
  message: string
  retryable: boolean
}

/** The shape every piece of server data in the store uses. */
export interface AsyncState<T> {
  data: T
  status: RequestStatus
  error: AppError | null
}

export function asyncState<T>(data: T): AsyncState<T> {
  return { data, status: 'idle', error: null }
}
