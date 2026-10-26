import { CheckCircle2, CircleSlash, Clock3, type LucideIcon } from 'lucide-react'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import type { BookingStatus, OrderStatus } from '@/types'

type Status = { kind: 'order'; status: OrderStatus } | { kind: 'booking'; status: BookingStatus }

const LOOK: Record<string, { icon: LucideIcon; className: string }> = {
  CONFIRMED: {
    icon: Clock3,
    className: 'border-primary/30 bg-secondary text-secondary-foreground',
  },
  BOOKED: { icon: CheckCircle2, className: 'border-success/30 bg-success/10 text-success' },
  COMPLETED: { icon: CheckCircle2, className: 'border-success/30 bg-success/10 text-success' },
  CANCELLED: {
    icon: CircleSlash,
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
}

/** Status with an icon and a word, so it never relies on colour alone. */
export function StatusBadge(props: Status) {
  const { t } = useT()
  const look = LOOK[props.status] ?? LOOK.CONFIRMED!
  const Icon = look.icon
  const label =
    props.kind === 'order' ? t(`status.order.${props.status}`) : t(`status.booking.${props.status}`)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        look.className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  )
}
