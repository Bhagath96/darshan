import { ArrowLeft, Clock, MapPin, Phone } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { PageTitle } from '@/components/common/PageTitle'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { NoticeCard } from '@/components/notices/NoticeCard'
import { buttonVariants } from '@/components/ui/button'
import { useLatestNotices } from '@/hooks/useLatestNotices'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { istToInstant, todayIST } from '@/lib/date'
import { imageFor } from '@/lib/images'
import type { Temple } from '@/types'

/** "04872000001" → "0487 200 0001", easier to read out on the phone. */
function formatLandline(phone: string): string {
  return phone.replace(/^(\d{4})(\d{3})(\d+)$/, '$1 $2 $3')
}

function BackLink() {
  const { t } = useT()
  return (
    <Link
      to="/temples"
      className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {t('temple.allTemples')}
    </Link>
  )
}

function ScheduleTable({ temple }: { temple: Temple }) {
  const { t, pick, time } = useT()
  const today = todayIST()
  return (
    <section aria-labelledby="temple-schedule" className="space-y-3">
      <h2 id="temple-schedule" className="text-2xl font-semibold text-primary">
        {t('temple.schedule')}
      </h2>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-start">
            <tr>
              <th scope="col" className="w-32 px-4 py-2 text-start font-medium">
                {t('temple.time')}
              </th>
              <th scope="col" className="px-4 py-2 text-start font-medium">
                {t('temple.ritual')}
              </th>
            </tr>
          </thead>
          <tbody>
            {temple.schedule.map((item) => (
              <tr key={item.time} className="border-t">
                <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                  {time(istToInstant(today, item.time))}
                </td>
                <td className="px-4 py-2.5">{pick(item.name)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{t('temple.scheduleNote')}</p>
    </section>
  )
}

function TempleNotices({ temple }: { temple: Temple }) {
  const { t, err } = useT()
  const notices = useLatestNotices()
  const forTemple = notices.data.filter((n) => n.templeId === temple.id)
  return (
    <section aria-labelledby="temple-notices" className="space-y-3">
      <h2 id="temple-notices" className="text-2xl font-semibold text-primary">
        {t('temple.notices')}
      </h2>
      {notices.status === 'error' && notices.error ? (
        <ErrorState message={err(notices.error)} onRetry={notices.retry} />
      ) : notices.status !== 'success' ? (
        <LoadingState rows={2} />
      ) : forTemple.length === 0 ? (
        <EmptyState title={t('temple.noNotices')} />
      ) : (
        <ul className="space-y-3">
          {forTemple.map((notice) => (
            <li key={notice.id}>
              <NoticeCard notice={notice} temple={temple} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function TempleDetailPage() {
  const { templeId } = useParams()
  const { t, pick, err } = useT()
  const temples = useTemples()
  const temple = temples.data.find((x) => x.id === templeId)

  if (temples.status === 'error' && temples.error) {
    return <ErrorState message={err(temples.error)} onRetry={temples.retry} />
  }
  if (temples.status !== 'success') return <LoadingState rows={4} />
  if (!temple) {
    return (
      <div className="space-y-4">
        <PageTitle title={t('temple.notFound')} />
        <h1 className="text-3xl font-semibold text-primary">{t('temple.notFound')}</h1>
        <EmptyState
          title={t('temple.notFoundText')}
          action={
            <Link to="/temples" className={buttonVariants({ size: 'lg' })}>
              {t('temple.allTemples')}
            </Link>
          }
        />
      </div>
    )
  }

  const name = pick(temple.name)
  return (
    <div className="space-y-10">
      <PageTitle title={name} />
      <div className="space-y-3">
        <BackLink />
        <section className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground">
          <img
            src={imageFor(temple.image)}
            alt={t('temple.photoAlt', { name, location: pick(temple.location) })}
            className="absolute inset-0 size-full object-cover opacity-45"
            fetchPriority="high"
          />
          <div className="relative space-y-2 bg-gradient-to-t from-black/60 to-transparent px-5 pt-24 pb-6 sm:px-8 sm:pt-40">
            <h1 className="text-3xl font-semibold sm:text-4xl">{name}</h1>
            <p className="text-lg">{pick(temple.deity)}</p>
            <p className="flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-4" />
              {pick(temple.location)}
            </p>
            <div className="flex flex-wrap gap-3 pt-3">
              <Link
                to={`/darshan?temple=${temple.id}`}
                className={buttonVariants({ variant: 'secondary', className: 'h-11 px-5' })}
              >
                {t('temple.bookDarshan')}
              </Link>
              <Link
                to={`/vazhipadu?temple=${temple.id}`}
                className={buttonVariants({ variant: 'secondary', className: 'h-11 px-5' })}
              >
                {t('temple.offerVazhipadu')}
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="temple-about" className="space-y-3">
            <h2 id="temple-about" className="text-2xl font-semibold text-primary">
              {t('temple.about')}
            </h2>
            <p className="max-w-prose leading-relaxed">{pick(temple.about)}</p>
          </section>
          <ScheduleTable temple={temple} />
        </div>

        <aside
          aria-labelledby="temple-visit"
          className="min-w-0 space-y-4 self-start rounded-xl border bg-card p-5 lg:sticky lg:top-24"
        >
          <h2 id="temple-visit" className="text-xl font-semibold text-primary">
            {t('temple.visit')}
          </h2>
          <dl className="space-y-4 text-sm">
            <div className="flex gap-3">
              <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold" />
              <div>
                <dt className="font-medium">{t('temple.openingHours')}</dt>
                <dd className="text-muted-foreground">{temple.timings}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold" />
              <div>
                <dt className="font-medium">{t('temple.address')}</dt>
                <dd className="text-muted-foreground">{pick(temple.address)}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold" />
              <div>
                <dt className="font-medium">{t('temple.phone')}</dt>
                <dd>
                  <a
                    href={`tel:${temple.contactPhone}`}
                    className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline"
                  >
                    {formatLandline(temple.contactPhone)}
                  </a>
                </dd>
              </div>
            </div>
          </dl>
        </aside>
      </div>

      <TempleNotices temple={temple} />
    </div>
  )
}
