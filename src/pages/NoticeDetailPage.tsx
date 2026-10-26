import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { PageTitle } from '@/components/common/PageTitle'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { NoticeCategoryBadge, NoticeMeta } from '@/components/notices/NoticeCard'
import { Badge } from '@/components/ui/badge'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { noticeRequested, selectNoticeDetail } from '@/store/notices/noticesSlice'

function BackLink() {
  const { t } = useT()
  return (
    <Link
      to="/notifications"
      className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {t('notices.back')}
    </Link>
  )
}

export function NoticeDetailPage() {
  const { noticeId = '' } = useParams()
  const { t, pick, err } = useT()
  const dispatch = useAppDispatch()
  const detail = useAppSelector(selectNoticeDetail)
  const temples = useTemples()

  useEffect(() => {
    dispatch(noticeRequested(noticeId))
  }, [dispatch, noticeId])

  const notice = detail.data?.id === noticeId ? detail.data : null

  if (detail.status === 'error' && detail.error) {
    return (
      <div className="space-y-4">
        <BackLink />
        {detail.error.code === 'NOT_FOUND' ? (
          <>
            <PageTitle title={t('notices.notFound')} />
            <h1 className="text-3xl font-semibold text-primary">{t('notices.notFound')}</h1>
            <EmptyState title={detail.error.message} />
          </>
        ) : (
          <ErrorState
            message={err(detail.error)}
            onRetry={() => dispatch(noticeRequested(noticeId))}
          />
        )}
      </div>
    )
  }
  if (!notice) return <LoadingState rows={3} />

  const title = pick(notice.title)
  return (
    <article className="max-w-3xl space-y-5">
      <PageTitle title={title} />
      <BackLink />
      <div className="flex flex-wrap items-center gap-2">
        <NoticeCategoryBadge category={notice.category} />
        {notice.important && <Badge>{t('notices.important')}</Badge>}
      </div>
      <h1 className="text-3xl font-semibold text-primary">{title}</h1>
      <NoticeMeta notice={notice} temple={temples.data.find((x) => x.id === notice.templeId)} />
      <p className="text-base leading-relaxed">{pick(notice.body)}</p>
    </article>
  )
}
