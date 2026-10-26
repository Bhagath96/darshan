import { useEffect } from 'react'
import { toast } from 'sonner'
import { useT } from '@/i18n'
import { expiredNoticeShown } from '@/store/auth/authSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

/** Tells the user why they were logged out when the server ends their session. */
export function useSessionExpiredNotice() {
  const { t } = useT()
  const dispatch = useAppDispatch()
  const expired = useAppSelector((s) => s.auth.expired)
  useEffect(() => {
    if (!expired) return
    toast.error(t('session.expired'))
    dispatch(expiredNoticeShown())
  }, [expired, dispatch, t])
}
