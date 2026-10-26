import { useEffect, useId } from 'react'
import { Info } from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router'
import { FormField } from '@/components/common/FormField'
import { NativeSelect } from '@/components/common/NativeSelect'
import { PageHeading } from '@/components/common/PageTitle'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { NoticeCard } from '@/components/notices/NoticeCard'
import { Button } from '@/components/ui/button'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { NOTICE_CATEGORIES } from '@/lib/constants'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { noticesRequested, noticesSeen, selectNoticeList } from '@/store/notices/noticesSlice'
import type { NoticeCategory } from '@/types'

const isCategory = (value: string | null): value is NoticeCategory =>
  value !== null && (NOTICE_CATEGORIES as readonly string[]).includes(value)

/** Navigation state set when a bad link was cleaned up, so the page can say why. */
interface FixedLinkState {
  badLink: true
}

export function NotificationsPage() {
  const { t, pick, err } = useT()
  const dispatch = useAppDispatch()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const temples = useTemples()
  const list = useAppSelector(selectNoticeList)
  const formId = useId()

  const templeParam = params.get('temple')
  const categoryParam = params.get('category')
  const templesReady = temples.status === 'success'
  const templeValid =
    !templeParam || (templesReady && temples.data.some((x) => x.id === templeParam))
  const categoryValid = !categoryParam || isCategory(categoryParam)
  const badLink = (location.state as FixedLinkState | null)?.badLink === true

  // Opening this page marks every notice as seen (clears the header badge).
  useEffect(() => {
    dispatch(noticesSeen())
  }, [dispatch])

  // A link with an unknown temple or type is reset, and the page says so.
  useEffect(() => {
    if ((templeParam && templesReady && !templeValid) || !categoryValid) {
      const next = new URLSearchParams(params)
      if (!templeValid) next.delete('temple')
      if (!categoryValid) next.delete('category')
      setParams(next, { replace: true, state: { badLink: true } satisfies FixedLinkState })
    }
  }, [templeParam, templesReady, templeValid, categoryValid, params, setParams])

  // The URL is the source of truth: every valid change loads that list.
  useEffect(() => {
    if (templeParam && !templesReady) return
    if (!templeValid || !categoryValid) return
    dispatch(
      noticesRequested({
        templeId: templeParam ?? undefined,
        category: isCategory(categoryParam) ? categoryParam : undefined,
      }),
    )
  }, [dispatch, templeParam, categoryParam, templesReady, templeValid, categoryValid])

  /** Each filter change is a new history entry, so Back returns to the previous filter. */
  const setFilter = (key: 'temple' | 'category', value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  const retry = () =>
    dispatch(
      noticesRequested({
        templeId: templeParam ?? undefined,
        category: isCategory(categoryParam) ? categoryParam : undefined,
      }),
    )
  const hasFilters = Boolean(templeParam || categoryParam)
  const count = list.data.length

  return (
    <div className="space-y-6">
      <PageHeading title={t('notices.title')} intro={t('notices.intro')} />

      {badLink && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border bg-secondary/50 p-3 text-sm"
        >
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t('notices.badLink')}
        </p>
      )}

      <form
        role="search"
        aria-label={t('notices.filters')}
        className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <FormField id={`${formId}-temple`} label={t('notices.filterTemple')}>
          {(control) => (
            <NativeSelect
              {...control}
              value={templeValid ? (templeParam ?? '') : ''}
              onChange={(e) => setFilter('temple', e.target.value)}
              disabled={!templesReady}
            >
              <option value="">{t('notices.allTemples')}</option>
              {temples.data.map((temple) => (
                <option key={temple.id} value={temple.id}>
                  {pick(temple.name)}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id={`${formId}-category`} label={t('notices.filterCategory')}>
          {(control) => (
            <NativeSelect
              {...control}
              value={isCategory(categoryParam) ? categoryParam : ''}
              onChange={(e) => setFilter('category', e.target.value)}
            >
              <option value="">{t('notices.allCategories')}</option>
              {NOTICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`notices.category.${c}`)}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      </form>

      {list.status === 'error' && list.error ? (
        <ErrorState message={err(list.error)} onRetry={retry} />
      ) : list.status !== 'success' ? (
        <LoadingState rows={4} />
      ) : count === 0 ? (
        <EmptyState
          title={t('notices.empty')}
          action={
            hasFilters && (
              <Button
                variant="outline"
                className="h-11"
                onClick={() => setParams(new URLSearchParams())}
              >
                {t('notices.clearFilters')}
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          <p role="status" className="text-sm text-muted-foreground">
            {count === 1 ? t('notices.countOne') : t('notices.count', { count })}
          </p>
          <ul className="space-y-3">
            {list.data.map((notice) => (
              <li key={notice.id}>
                <NoticeCard
                  notice={notice}
                  temple={temples.data.find((x) => x.id === notice.templeId)}
                  headingLevel={2}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
