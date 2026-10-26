import { CalendarDays, Megaphone } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { useT } from '@/i18n'
import { todayIST } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { Notice, NoticeCategory, Temple } from '@/types'

const CATEGORY_STYLE: Record<NoticeCategory, string> = {
  FESTIVAL: 'bg-secondary text-secondary-foreground',
  TIMING: 'bg-muted text-foreground',
  CLOSURE: 'bg-destructive/10 text-destructive',
  GENERAL: 'bg-muted text-foreground',
}

export function NoticeCategoryBadge({ category }: { category: NoticeCategory }) {
  const { t } = useT()
  return <Badge className={CATEGORY_STYLE[category]}>{t(`notices.category.${category}`)}</Badge>
}

/** Notice meta line: temple, published date and the day it is about. */
export function NoticeMeta({ notice, temple }: { notice: Notice; temple: Temple | undefined }) {
  const { t, pick, date } = useT()
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span>{temple ? pick(temple.name) : t('notices.forAllTemples')}</span>
      <span>{t('notices.published', { date: date(todayIST(new Date(notice.publishedAt))) })}</span>
      {notice.eventDate && (
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <CalendarDays aria-hidden="true" className="size-4 text-gold" />
          {t('notices.eventOn', { date: date(notice.eventDate) })}
        </span>
      )}
    </p>
  )
}

interface NoticeCardProps {
  notice: Notice
  temple: Temple | undefined
  /** Show the first lines of the body. */
  showExcerpt?: boolean
  headingLevel?: 2 | 3
}

/** One notice in a list. The title links to the notice's own page. */
export function NoticeCard({
  notice,
  temple,
  showExcerpt = true,
  headingLevel = 3,
}: NoticeCardProps) {
  const { t, pick } = useT()
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <article
      className={cn(
        'relative flex gap-3 rounded-xl border bg-card p-4 shadow-sm focus-within:ring-2 focus-within:ring-ring',
        notice.important && 'border-s-4 border-s-primary',
      )}
    >
      <Megaphone aria-hidden="true" className="mt-1 hidden size-5 shrink-0 text-gold sm:block" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <NoticeCategoryBadge category={notice.category} />
          {notice.important && <Badge>{t('notices.important')}</Badge>}
        </div>
        <Heading className="font-heading text-lg leading-snug font-semibold">
          <Link
            to={`/notifications/${notice.id}`}
            className="outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
          >
            {pick(notice.title)}
          </Link>
        </Heading>
        <NoticeMeta notice={notice} temple={temple} />
        {showExcerpt && <p className="line-clamp-2 text-sm">{pick(notice.body)}</p>}
      </div>
    </article>
  )
}
