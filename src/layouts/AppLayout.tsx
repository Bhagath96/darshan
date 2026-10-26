import { Suspense, useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { Announcer } from '@/components/common/Announcer'
import { Footer } from '@/components/common/Footer'
import { Header } from '@/components/common/Header'
import { MAIN_CONTENT_ID, SkipLink } from '@/components/common/SkipLink'
import { LoadingState } from '@/components/common/states'
import { Toaster } from '@/components/ui/sonner'
import { useLatestNotices } from '@/hooks/useLatestNotices'
import { useSessionExpiredNotice } from '@/hooks/useSessionExpiredNotice'
import { useWelcomeToast } from '@/hooks/useWelcomeToast'
import { useT } from '@/i18n'

/**
 * After moving to another page, put focus on <main> so keyboard and screen reader
 * users start at the new content instead of wherever the old page left them.
 * Only the path counts: changing a filter (?query) keeps focus where it is.
 */
function useFocusMainOnNavigate() {
  const { pathname } = useLocation()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const main = document.getElementById(MAIN_CONTENT_ID)
    // A page may already have put focus somewhere useful (e.g. a confirmation heading).
    if (main && !main.contains(document.activeElement)) main.focus({ preventScroll: true })
  }, [pathname])
}

/** Page frame shared by every route: skip link, header, main landmark, footer, toasts. */
export function AppLayout() {
  const { lang } = useT()
  useLatestNotices() // loads notices for the header bell on every page
  useWelcomeToast()
  useSessionExpiredNotice()
  useFocusMainOnNavigate()

  // Keep <html lang> in sync so screen readers use the right voice.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <Header />
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none"
      >
        <Suspense fallback={<LoadingState rows={4} />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <Announcer />
      <Toaster position="top-center" richColors closeButton />
      <ScrollRestoration />
    </div>
  )
}
