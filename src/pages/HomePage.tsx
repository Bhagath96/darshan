import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { PageTitle } from '@/components/common/PageTitle'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { NoticeCard } from '@/components/notices/NoticeCard'
import { TempleCard } from '@/components/temples/TempleCard'
import { buttonVariants } from '@/components/ui/button'
import { useLatestNotices } from '@/hooks/useLatestNotices'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { imageFor } from '@/lib/images'
import { cn } from '@/lib/utils'

const HOME_NOTICE_COUNT = 3

const SERVICES = [
  { to: '/darshan', title: 'home.darshanTitle', text: 'home.darshanText', image: 'lamp' },
  { to: '/vazhipadu', title: 'home.vazhipaduTitle', text: 'home.vazhipaduText', image: 'payasam' },
] as const

function ServicesSection() {
  const { t } = useT()
  return (
    <section aria-labelledby="home-services" className="space-y-4">
      <h2 id="home-services" className="text-2xl font-semibold text-primary">
        {t('home.servicesTitle')}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {SERVICES.map((s) => (
          <li key={s.to}>
            <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition focus-within:ring-2 focus-within:ring-ring hover:shadow-md sm:flex-row">
              <img
                src={imageFor(s.image)}
                alt=""
                loading="lazy"
                className="aspect-[16/9] w-full object-cover sm:aspect-auto sm:w-40"
              />
              <div className="space-y-1 p-4">
                <h3 className="text-xl font-semibold text-primary">
                  <Link
                    to={s.to}
                    className="outline-none after:absolute after:inset-0 group-hover:underline focus-visible:underline"
                  >
                    {t(s.title)}
                  </Link>
                </h3>
                <p className="text-sm text-muted-foreground">{t(s.text)}</p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TemplesSection() {
  const { t, err } = useT()
  const temples = useTemples()
  return (
    <section aria-labelledby="home-temples" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="home-temples" className="text-2xl font-semibold text-primary">
          {t('home.templesTitle')}
        </h2>
        <Link
          to="/temples"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('home.allTemples')}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {temples.status === 'error' && temples.error ? (
        <ErrorState message={err(temples.error)} onRetry={temples.retry} />
      ) : temples.status !== 'success' ? (
        <LoadingState rows={2} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {temples.data.map((temple) => (
            <li key={temple.id}>
              <TempleCard temple={temple} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function NoticesSection() {
  const { t, err } = useT()
  const notices = useLatestNotices()
  const temples = useTemples()
  // Important notices first, then newest.
  const top = [...notices.data]
    .sort((a, b) => Number(b.important) - Number(a.important))
    .slice(0, HOME_NOTICE_COUNT)

  return (
    <section id="latest-notices" aria-labelledby="home-notices" className="scroll-mt-20 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="home-notices" className="text-2xl font-semibold text-primary">
          {t('home.noticesTitle')}
        </h2>
        <Link
          to="/notifications"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('home.allNotices')}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {notices.status === 'error' && notices.error ? (
        <ErrorState message={err(notices.error)} onRetry={notices.retry} />
      ) : notices.status !== 'success' ? (
        <LoadingState rows={3} />
      ) : top.length === 0 ? (
        <EmptyState title={t('home.noNotices')} />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-3">
          {top.map((notice) => (
            <li key={notice.id}>
              <NoticeCard
                notice={notice}
                temple={temples.data.find((x) => x.id === notice.templeId)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function HomePage() {
  const { t } = useT()
  return (
    <div className="space-y-12">
      <PageTitle title={t('nav.home')} />
      <section className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground">
        <img
          src={imageFor('hero')}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-35"
          fetchPriority="high"
        />
        <div className="relative max-w-2xl space-y-4 px-5 py-12 sm:px-10 sm:py-20">
          <h1 className="text-3xl font-semibold sm:text-4xl">{t('home.heroTitle')}</h1>
          <p className="text-base sm:text-lg">{t('home.heroText')}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/darshan"
              className={cn(buttonVariants({ variant: 'secondary' }), 'h-11 px-5 text-base')}
            >
              {t('home.darshanTitle')}
            </Link>
            <Link
              to="/vazhipadu"
              className={cn(buttonVariants({ variant: 'secondary' }), 'h-11 px-5 text-base')}
            >
              {t('home.vazhipaduTitle')}
            </Link>
            <Link
              to="/notifications"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'h-11 border-primary-foreground/60 bg-transparent px-5 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground',
              )}
            >
              {t('home.ctaNotices')}
            </Link>
          </div>
        </div>
      </section>

      <ServicesSection />
      <NoticesSection />
      <TemplesSection />
    </div>
  )
}
