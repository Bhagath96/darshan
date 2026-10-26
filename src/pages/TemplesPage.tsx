import { PageHeading } from '@/components/common/PageTitle'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { TempleCard } from '@/components/temples/TempleCard'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'

export function TemplesPage() {
  const { t, err } = useT()
  const temples = useTemples()

  return (
    <div className="space-y-6">
      <PageHeading title={t('temples.title')} intro={t('temples.intro')} />
      {temples.status === 'error' && temples.error ? (
        <ErrorState message={err(temples.error)} onRetry={temples.retry} />
      ) : temples.status !== 'success' ? (
        <LoadingState rows={3} />
      ) : temples.data.length === 0 ? (
        <EmptyState title={t('temples.empty')} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {temples.data.map((temple) => (
            <li key={temple.id}>
              <TempleCard temple={temple} headingLevel={2} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
