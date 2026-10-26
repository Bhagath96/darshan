import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useT } from '@/i18n'
import { logoutRequested } from '@/store/auth/authSlice'
import { useAppDispatch } from '@/store/hooks'

/**
 * Logs out and confirms it with a toast. Goes to the home page first, so a protected
 * page doesn't briefly bounce the user to the login form on the way out.
 */
export function useLogout() {
  const { t } = useT()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  return async () => {
    await navigate('/')
    dispatch(logoutRequested())
    toast.success(t('user.loggedOut'))
  }
}
