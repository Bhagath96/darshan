import { ApiError } from '@/api'
import type { AppError } from './types'

/** Converts anything a saga catches into a plain, serialisable error. */
export function toAppError(error: unknown): AppError {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message, retryable: error.retryable }
  }
  return { code: 'UNKNOWN', message: 'Something went wrong. Please try again.', retryable: true }
}
