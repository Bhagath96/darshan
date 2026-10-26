import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

interface UpdateOptions {
  /** Drop ?page so a filter change starts at page 1. */
  resetPage?: boolean
  /** Replace the history entry instead of adding one (e.g. while typing). */
  replace?: boolean
}

/**
 * The URL as the single source of truth for filters and paging.
 * Each change is a history entry by default, so Back undoes it.
 */
export function useQueryParams() {
  const [params, setParams] = useSearchParams()

  const get = useCallback((key: string) => params.get(key) ?? '', [params])

  const update = useCallback(
    (
      patch: Record<string, string | number | null | undefined>,
      { resetPage = false, replace = false }: UpdateOptions = {},
    ) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === undefined || value === '') next.delete(key)
            else next.set(key, String(value))
          }
          if (resetPage) next.delete('page')
          return next
        },
        { replace },
      )
    },
    [setParams],
  )

  return { params, get, update }
}

/** Reads ?page as a positive whole number (1 when missing or invalid). */
export function readPage(value: string): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : 1
}
