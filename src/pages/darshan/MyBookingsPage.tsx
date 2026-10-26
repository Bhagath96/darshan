import { useEffect } from 'react'
import { CalendarDays, Clock, Ticket } from 'lucide-react'
import { Link } from 'react-router'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeading } from '@/components/common/PageTitle'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button, buttonVariants } from '@/components/ui/button'
import { useNow } from '@/hooks/useNow'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { selectCurrentUser } from '@/store/auth/authSlice'
import {
  myBookingCancelRequested,
  myBookingsRequested,
  selectMyBookings,
} from '@/store/darshan/myBookingsSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { Booking } from '@/types'

function BookingCard({ booking, now }: { booking: Booking; now: number }) {
  const { t, pick, date, time } = useT()
  const dispatch = useAppDispatch()
  const temples = useTemples()
  const cancelling = useAppSelector((s) => booking.id in s.myBookings.cancelling)
  const temple = temples.data.find((x) => x.id === booking.templeId)
  const started = Date.parse(booking.startsAt) <= now

  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-sans text-base font-semibold">
            {t('myBookings.ref', { ref: booking.bookingRef })}
          </h2>
          <StatusBadge kind="booking" status={booking.status} />
        </div>
        {temple && <p className="font-medium text-primary">{pick(temple.name)}</p>}
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="size-4 text-gold" />
            {date(booking.date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4 text-gold" />
            {time(booking.startsAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Ticket aria-hidden="true" className="size-4 text-gold" />
            {t('myBookings.tickets', { count: booking.ticketCount })}
          </span>
        </p>
      </div>
      {booking.status === 'BOOKED' &&
        (started ? (
          <p className="text-sm text-muted-foreground sm:max-w-56">{t('myBookings.started')}</p>
        ) : (
          <ConfirmDialog
            trigger={
              <Button
                variant="destructive"
                className="h-11 shrink-0 px-4"
                disabled={cancelling}
                aria-label={t('myBookings.cancelOf', { ref: booking.bookingRef })}
              >
                {t('myBookings.cancel')}
              </Button>
            }
            title={t('myBookings.confirmTitle', { ref: booking.bookingRef })}
            description={t('myBookings.confirmText', {
              tickets: booking.ticketCount,
              date: date(booking.date),
              time: time(booking.startsAt),
            })}
            confirmLabel={t('myBookings.confirm')}
            cancelLabel={t('myBookings.keep')}
            onConfirm={() => dispatch(myBookingCancelRequested(booking.id))}
          />
        ))}
    </article>
  )
}

/** The logged-in user's darshan bookings (by their mobile number). Staff search any number in the admin portal. */
export function MyBookingsPage() {
  const { t, err } = useT()
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const list = useAppSelector(selectMyBookings)
  const now = useNow()
  const phone = user?.phone ?? ''

  const load = () => {
    if (phone) dispatch(myBookingsRequested(phone))
  }
  useEffect(() => {
    load()
    // `load` reads exactly this value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone])

  return (
    <div className="space-y-6">
      <PageHeading title={t('myBookings.title')} intro={t('myBookings.intro')} />
      {phone && (
        <p className="text-sm text-muted-foreground">{t('myBookings.phoneNote', { phone })}</p>
      )}

      {list.status === 'error' && list.error ? (
        <ErrorState message={err(list.error)} onRetry={load} />
      ) : list.status !== 'success' && list.data.length === 0 ? (
        <LoadingState rows={3} />
      ) : list.data.length === 0 ? (
        <EmptyState
          title={t('myBookings.empty')}
          action={
            <Link to="/darshan" className={buttonVariants({ className: 'h-11 px-5' })}>
              {t('myBookings.bookNow')}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {list.data.map((b) => (
            <li key={b.id}>
              <BookingCard booking={b} now={now} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
