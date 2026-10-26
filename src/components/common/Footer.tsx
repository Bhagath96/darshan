import { Link } from 'react-router'
import { visibleNavItems } from './navItems'
import { useT } from '@/i18n'
import { IMAGE_CREDITS } from '@/lib/images'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { useAppSelector } from '@/store/hooks'

export function Footer() {
  const { t } = useT()
  const user = useAppSelector(selectCurrentUser)
  return (
    <footer className="mt-12 print:hidden border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-muted-foreground sm:grid-cols-2">
        <div className="space-y-3">
          <p className="font-heading text-lg font-semibold text-primary">{t('app.name')}</p>
          <p>{t('footer.note')}</p>
          <details>
            <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-sm font-medium text-foreground">
              {t('footer.credits')}
            </summary>
            {IMAGE_CREDITS.length === 0 ? (
              <p className="mt-1">{t('footer.noCredits')}</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {IMAGE_CREDITS.map((c) => (
                  <li key={c.key} className="break-words">
                    <a
                      href={c.page}
                      className="underline underline-offset-2"
                      rel="noreferrer"
                      target="_blank"
                    >
                      {c.title.replace(/^File:/, '')}
                    </a>{' '}
                    — {c.artist || t('footer.unknownArtist')},{' '}
                    {c.licenseUrl ? (
                      <a
                        href={c.licenseUrl}
                        className="underline underline-offset-2"
                        rel="noreferrer"
                        target="_blank"
                      >
                        {c.license}
                      </a>
                    ) : (
                      c.license
                    )}
                  </li>
                ))}
              </ul>
            )}
          </details>
        </div>
        <nav aria-label={t('footer.quickLinks')} className="sm:justify-self-end">
          <p className="mb-2 font-medium text-foreground">{t('footer.quickLinks')}</p>
          <ul className="space-y-1">
            {visibleNavItems(user).map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
                >
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
