import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useT } from '@/i18n'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { useAppSelector } from '@/store/hooks'

/** Greets the user once, right after they log in (not after a page reload). */
export function useWelcomeToast() {
  const { t } = useT()
  const user = useAppSelector(selectCurrentUser)
  const previous = useRef(user)
  useEffect(() => {
    if (!previous.current && user) toast.success(t('login.welcome', { name: user.name }))
    previous.current = user
  }, [user, t])
}
