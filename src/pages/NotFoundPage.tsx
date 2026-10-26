import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { useT } from '@/i18n'

export function NotFoundPage() {
  const { t } = useT()
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-3xl font-semibold text-primary">{t('notFound.title')}</h1>
      <p className="text-muted-foreground">{t('notFound.text')}</p>
      <Link to="/" className={buttonVariants({ size: 'lg' })}>
        {t('notFound.home')}
      </Link>
    </div>
  )
}
