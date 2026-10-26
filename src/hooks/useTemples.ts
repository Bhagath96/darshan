import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectTemples, templesRequested } from '@/store/temples/templesSlice'

/** The shared temple list. Loads it the first time any screen needs it. */
export function useTemples() {
  const dispatch = useAppDispatch()
  const temples = useAppSelector(selectTemples)

  useEffect(() => {
    if (temples.status === 'idle') dispatch(templesRequested())
  }, [dispatch, temples.status])

  const retry = useCallback(() => dispatch(templesRequested()), [dispatch])
  return { ...temples, retry }
}
