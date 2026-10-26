import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { latestNoticesRequested, selectLatestNotices } from '@/store/notices/noticesSlice'

/** Latest notices from every temple (home page, temple pages, header bell). */
export function useLatestNotices() {
  const dispatch = useAppDispatch()
  const latest = useAppSelector(selectLatestNotices)

  useEffect(() => {
    if (latest.status === 'idle') dispatch(latestNoticesRequested())
  }, [dispatch, latest.status])

  const retry = useCallback(() => dispatch(latestNoticesRequested()), [dispatch])
  return { ...latest, retry }
}
