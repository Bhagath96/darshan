import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router'
import { PageTitle } from '@/components/common/PageTitle'
import { buttonVariants } from '@/components/ui/button'
import { useT } from '@/i18n'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { useAppSelector } from '@/store/hooks'

export function ForbiddenPage() {
  const { t } = useT()
  const user = useAppSelector(selectCurrentUser)
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <PageTitle title={t('forbidden.title')} />
      <ShieldAlert aria-hidden="true" className="mx-auto size-10 text-primary" />
      <h1 className="text-3xl font-semibold text-primary">{t('forbidden.title')}</h1>
      {user && (
        <p className="text-muted-foreground">
          {t('forbidden.text', { role: t(`role.${user.role}`) })}
        </p>
      )}
      <Link to="/" className={buttonVariants({ size: 'lg', className: 'h-11 px-5' })}>
        {t('forbidden.home')}
      </Link>
    </div>
  )
}
