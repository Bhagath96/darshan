import { AlertTriangle } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { useT } from '@/i18n'
import { NotFoundPage } from './NotFoundPage'

/**
 * Shown when a page throws while rendering. Keeps the app usable instead of a blank screen.
 * In development the error is also logged by React; nothing is sent anywhere.
 */
export function RouteErrorPage() {
  const error = useRouteError()
  const { t } = useT()

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  return (
    <div role="alert" className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
      <AlertTriangle aria-hidden="true" className="mx-auto size-10 text-destructive" />
      <h1 className="text-3xl font-semibold text-primary">{t('crash.title')}</h1>
      <p className="text-muted-foreground">{t('crash.text')}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button className="h-11 px-5" onClick={() => window.location.reload()}>
          {t('crash.reload')}
        </Button>
        <Link
          to="/"
          reloadDocument
          className={buttonVariants({ variant: 'outline', className: 'h-11 px-5' })}
        >
          {t('common.backHome')}
        </Link>
      </div>
    </div>
  )
}
