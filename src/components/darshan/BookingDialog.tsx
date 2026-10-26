import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from '@/lib/zod'
import { FormField } from '@/components/common/FormField'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useT, type MessageKey } from '@/i18n'
import { MAX_TICKETS_PER_BOOKING } from '@/lib/constants'
import { normalizePhone } from '@/lib/phone'
import { nameSchema, phoneSchema } from '@/lib/schemas'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { bookingFormClosed, bookingSubmitted, selectBooking } from '@/store/darshan/bookingSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { DarshanSlot, Temple } from '@/types'

function bookingSchema(maxTickets: number) {
  return z.object({
    devoteeName: nameSchema,
    phone: phoneSchema,
    ticketCount: z.string().refine((v) => {
      const n = Number(v)
      return Number.isInteger(n) && n >= 1 && n <= maxTickets
    }, 'validation.ticketsInvalid' satisfies MessageKey),
  })
}
type BookingInput = z.input<ReturnType<typeof bookingSchema>>
type BookingValues = z.output<ReturnType<typeof bookingSchema>>

function BookingForm({ slot }: { slot: DarshanSlot }) {
  const { t, err } = useT()
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const booking = useAppSelector(selectBooking)
  const errorRef = useRef<HTMLDivElement>(null)
  const maxTickets = Math.min(MAX_TICKETS_PER_BOOKING, slot.remainingTickets)
  const schema = useMemo(() => bookingSchema(maxTickets), [maxTickets])
  const submitting = booking.status === 'loading'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingInput, unknown, BookingValues>({
    resolver: zodResolver(schema),
    defaultValues: { devoteeName: user?.name ?? '', phone: user?.phone ?? '', ticketCount: '1' },
  })

  // Failure: move focus to the error so it is read out; the typed values stay.
  useEffect(() => {
    if (booking.status === 'error') errorRef.current?.focus()
  }, [booking.status, booking.error])

  const send = (values: BookingValues) =>
    dispatch(
      bookingSubmitted({
        slotId: slot.id,
        devoteeName: values.devoteeName,
        phone: normalizePhone(values.phone) ?? values.phone,
        ticketCount: Number(values.ticketCount),
      }),
    )
  const message = (e?: { message?: string }) =>
    e?.message ? t(e.message as MessageKey) : undefined

  return (
    <form noValidate onSubmit={handleSubmit(send)} className="space-y-4" aria-busy={submitting}>
      {booking.status === 'error' && booking.error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm outline-none"
        >
          <p className="flex items-center gap-2 font-medium text-destructive">
            <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
            {t('darshan.failedTitle')}
          </p>
          <p>{err(booking.error)}</p>
          {booking.error.retryable && (
            <>
              <p className="text-muted-foreground">{t('darshan.failedKept')}</p>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={submitting}
                onClick={() => void handleSubmit(send)()}
              >
                {t('common.tryAgain')}
              </Button>
            </>
          )}
        </div>
      )}
      <FormField id="booking-name" label={t('darshan.name')} error={message(errors.devoteeName)}>
        {(control) => (
          <Input {...control} {...register('devoteeName')} autoComplete="name" className="h-11" />
        )}
      </FormField>
      <FormField id="booking-phone" label={t('darshan.phone')} error={message(errors.phone)}>
        {(control) => (
          <Input
            {...control}
            {...register('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            className="h-11"
          />
        )}
      </FormField>
      <FormField
        id="booking-tickets"
        label={t('darshan.tickets')}
        hint={t('darshan.ticketsHint', { max: maxTickets })}
        error={message(errors.ticketCount)}
      >
        {(control) => (
          <Input
            {...control}
            {...register('ticketCount')}
            type="number"
            inputMode="numeric"
            min={1}
            max={maxTickets}
            step={1}
            className="h-11 w-32"
          />
        )}
      </FormField>
      <Button type="submit" className="h-11 w-full text-base" disabled={submitting}>
        {submitting && <Loader2 aria-hidden="true" className="animate-spin" />}
        {submitting ? t('darshan.submitting') : t('darshan.submit')}
      </Button>
    </form>
  )
}

function BookingSuccess({ onDone }: { onDone: () => void }) {
  const { t, date, time } = useT()
  const booking = useAppSelector(selectBooking).lastBooking
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move focus to the confirmation so screen reader users hear it first.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  if (!booking) return null
  return (
    <div className="space-y-4 text-center">
      <CheckCircle2 aria-hidden="true" className="mx-auto size-12 text-success" />
      {/* The visible heading is the dialog's title, so it is announced once. */}
      <DialogTitle
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-semibold text-primary outline-none"
      >
        {t('darshan.successTitle')}
      </DialogTitle>
      <div className="rounded-lg border border-dashed bg-secondary/40 p-4">
        <p className="text-sm text-muted-foreground">{t('darshan.successRef')}</p>
        <p className="font-mono text-3xl font-semibold tracking-wider">{booking.bookingRef}</p>
        <p className="mt-2 text-sm">
          {t('darshan.successDetails', {
            tickets: booking.ticketCount,
            date: date(booking.date),
            time: time(booking.startsAt),
          })}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">{t('darshan.successNote')}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          to="/darshan/my-bookings"
          className={buttonVariants({ variant: 'outline', className: 'h-11 px-4' })}
        >
          {t('darshan.viewBookings')}
        </Link>
        <Button className="h-11 px-6" onClick={onDone}>
          {t('darshan.done')}
        </Button>
      </div>
    </div>
  )
}

interface BookingDialogProps {
  slot: DarshanSlot | undefined
  temple: Temple | undefined
  /** The button that opened the dialog; focus goes back to it on close. */
  returnFocusTo: RefObject<HTMLElement | null>
}

/** Booking form in a dialog (focus is trapped inside and returns to the slot's button on close). */
export function BookingDialog({ slot, temple, returnFocusTo }: BookingDialogProps) {
  const { t, pick, date, time } = useT()
  const dispatch = useAppDispatch()
  const booking = useAppSelector(selectBooking)
  const open = Boolean(booking.slotId && slot)
  const close = () => dispatch(bookingFormClosed())

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      {slot && (
        <DialogContent
          closeLabel={t('common.close')}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
          // Opened from code, so tell Radix where focus should return.
          onCloseAutoFocus={(e) => {
            if (!returnFocusTo.current) return
            e.preventDefault()
            returnFocusTo.current.focus()
          }}
        >
          {booking.status === 'success' ? (
            <>
              <DialogDescription className="sr-only">{t('darshan.successNote')}</DialogDescription>
              <BookingSuccess onDone={close} />
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {t('darshan.formTitle', { time: time(slot.startsAt) })}
                </DialogTitle>
                <DialogDescription>
                  {t('darshan.formIntro', {
                    temple: temple ? pick(temple.name) : '',
                    date: date(slot.date),
                  })}
                </DialogDescription>
              </DialogHeader>
              <BookingForm slot={slot} />
            </>
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}
