import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import type { SlotAvailability } from '@/lib/slots'
import type { DarshanSlot } from '@/types'

interface SlotCardProps {
  slot: DarshanSlot
  availability: SlotAvailability
  onBook: () => void
}

/** One darshan slot: IST time, tickets left, and either a Book button or the reason it can't be booked. */
export function SlotCard({ slot, availability, onBook }: SlotCardProps) {
  const { t, time } = useT()
  const label = time(slot.startsAt)
  const reasonId = `${slot.id}-reason`
  const reason = {
    open: null,
    full: t('darshan.fullReason'),
    started: t('darshan.startedReason'),
    closed: t('darshan.closedReason'),
  }[availability]
  const badge = {
    open: null,
    full: t('darshan.full'),
    started: t('darshan.started'),
    closed: t('darshan.closed'),
  }[availability]
  const fill =
    slot.totalCapacity > 0 ? (slot.totalCapacity - slot.remainingTickets) / slot.totalCapacity : 1

  return (
    <article
      className={cn(
        'flex h-full flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm',
        availability !== 'open' && 'bg-muted/50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-2 font-sans text-xl font-semibold tabular-nums">
          <Clock aria-hidden="true" className="size-5 text-gold" />
          {label}
        </h3>
        {badge && (
          <Badge variant={availability === 'full' ? 'destructive' : 'outline'} className="shrink-0">
            {badge}
          </Badge>
        )}
      </div>
      <div className="space-y-1.5">
        <p className="text-sm">
          {t('darshan.ticketsLeft', {
            remaining: slot.remainingTickets,
            capacity: slot.totalCapacity,
          })}
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-chart-track" aria-hidden="true">
          <div
            className="h-full rounded-full bg-chart-bar"
            style={{ width: `${Math.round(fill * 100)}%` }}
          />
        </div>
      </div>
      {reason && (
        <p id={reasonId} className="text-sm text-muted-foreground">
          {reason}
        </p>
      )}
      <Button
        className="mt-auto h-11 w-full"
        disabled={availability !== 'open'}
        aria-label={t('darshan.bookSlot', { time: label })}
        aria-describedby={reason ? reasonId : undefined}
        onClick={onBook}
      >
        {t('darshan.book')}
      </Button>
    </article>
  )
}
