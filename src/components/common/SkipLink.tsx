import { useT } from '@/i18n'

export const MAIN_CONTENT_ID = 'main-content'

/** First focusable element on every page; jumps keyboard users past the header. */
export function SkipLink() {
  const { t } = useT()
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
    >
      {t('nav.skipToContent')}
    </a>
  )
}
