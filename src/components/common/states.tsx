import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useT } from '@/i18n'

/**
 * The three non-happy states every data view needs. Using the same components
 * everywhere keeps loading, empty and error screens consistent.
 */

export function LoadingState({ label, rows = 3 }: { label?: string; rows?: number }) {
  const { t } = useT()
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label ?? t('common.loading')}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" aria-hidden="true" />
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-4 py-10 text-center">
      <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-prose text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string
  message: string
  onRetry?: () => void
}) {
  const { t } = useT()
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center"
    >
      <AlertTriangle className="size-6 shrink-0 text-destructive" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-destructive">{title ?? t('common.errorTitle')}</p>
        <p className="text-sm text-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="min-h-11">
          <RotateCcw aria-hidden="true" />
          {t('common.tryAgain')}
        </Button>
      )}
    </div>
  )
}
