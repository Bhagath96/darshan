import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

/** "Showing 11–20 of 48" + Previous / Page 2 of 5 / Next. Hidden when everything fits on one page. */
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const { t } = useT()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <nav
      aria-label={t('common.pagination')}
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="text-muted-foreground">{t('common.showing', { from, to, total })}</p>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-11 px-3"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
            {t('common.previous')}
          </Button>
          <span aria-current="page" className="px-2 tabular-nums">
            {t('common.pageOf', { page, pages })}
          </span>
          <Button
            variant="outline"
            className="h-11 px-3"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
          >
            {t('common.next')}
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </nav>
  )
}
