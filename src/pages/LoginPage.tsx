import { Navigate, useSearchParams } from 'react-router'
import { LoginForm } from '@/components/auth/LoginForm'
import { PageHeading } from '@/components/common/PageTitle'
import { useT } from '@/i18n'
import { homeFor, safeRedirect } from '@/lib/redirect'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { useAppSelector } from '@/store/hooks'
import type { LoginPortal } from '@/types'

function LoginScreen({ portal }: { portal: LoginPortal }) {
  const { t } = useT()
  const user = useAppSelector(selectCurrentUser)
  const [params] = useSearchParams()
  const redirect = params.get('redirect')
  const redirectQuery = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''

  if (user) return <Navigate to={safeRedirect(redirect, homeFor(user))} replace />

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {portal === 'devotee' ? (
        <PageHeading title={t('login.title')} intro={t('login.intro')} />
      ) : (
        <PageHeading title={t('login.staffTitle')} intro={t('login.staffIntro')} />
      )}
      <LoginForm portal={portal} redirectQuery={redirectQuery} />
    </div>
  )
}

/** /login: devotees. */
export function LoginPage() {
  return <LoginScreen portal="devotee" />
}

/** /admin/login: temple staff and admins. */
export function StaffLoginPage() {
  return <LoginScreen portal="staff" />
}
