export type ApiErrorCode =
  | 'NETWORK' // request never reached the server
  | 'TIMEOUT' // server handled it, but the response was lost
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'

/** Error thrown by every mock API call. `retryable` tells the UI whether "Try again" makes sense. */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly retryable: boolean

  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.retryable = code === 'NETWORK' || code === 'TIMEOUT'
  }
}

/** Turns anything thrown into a message that is safe to show the user. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Something went wrong. Please try again.'
}
