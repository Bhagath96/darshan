import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { EditorDialog } from '@/components/admin/EditorDialog'
import { DeleteButton, EditButton } from '@/components/admin/fields'
import { PhoneSearchField } from '@/components/admin/PhoneSearchField'
import { RBody, RCell, RHead, RHeader, RRow, RTable } from '@/components/admin/ResponsiveTable'
import { TempleScopeField } from '@/components/admin/TempleScopeField'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField } from '@/components/common/FormField'
import { NativeSelect } from '@/components/common/NativeSelect'
import { PageHeading } from '@/components/common/PageTitle'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { readPage, useQueryParams } from '@/hooks/useQueryParams'
import { useNow } from '@/hooks/useNow'
import { useFieldMessage } from '@/hooks/useFieldMessage'
import { useTemples } from '@/hooks/useTemples'
import { useT, type MessageKey } from '@/i18n'
import { BOOKINGS_PAGE_SIZE, MAX_TICKETS_PER_BOOKING } from '@/lib/constants'
import { isValidIsoDate } from '@/lib/date'
import { can } from '@/lib/permissions'
import { isValidPhone } from '@/lib/phone'
import { NAME_PATTERN } from '@/lib/validators'
import { z } from '@/lib/zod'
import { bookingDeleteRequested, bookingEditRequested } from '@/store/admin/manageActions'
import { selectCurrentUser } from '@/store/auth/authSlice'
import {
  adminBookingCancelRequested,
  bookingsSearchRequested,
  selectAdminBookings,
} from '@/store/admin/bookingsSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { Booking, BookingStatus } from '@/types'

const STATUSES: BookingStatus[] = ['BOOKED', 'CANCELLED']
const isStatus = (v: string): v is BookingStatus => (STATUSES as string[]).includes(v)

const key = (k: MessageKey) => k
const bookingSchema = z.object({
  devoteeName: z
    .string()
    .transform((v) => v.trim().replace(/\s+/g, ' '))
    .pipe(z.string().regex(NAME_PATTERN, key('manage.nameInvalid'))),
  phone: z.string().trim().refine(isValidPhone, key('validation.phoneInvalid')),
  tickets: z
    .string()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= MAX_TICKETS_PER_BOOKING, {
      message: key('manage.ticketsInvalid'),
    }),
})
type BookingValues = z.infer<typeof bookingSchema>

function BookingForm({ formId, booking }: { formId: string; booking: Booking }) {
  const { t } = useT()
  const dispatch = useAppDispatch()
  const now = useNow()
  // Tickets only change on an active booking that hasn't started (the server checks too).
  const ticketsLocked = booking.status !== 'BOOKED' || Date.parse(booking.startsAt) <= now
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      devoteeName: booking.devoteeName,
      phone: booking.phone,
      tickets: String(booking.ticketCount),
    },
  })
  const message = useFieldMessage(errors)
  const onSubmit = handleSubmit((v) =>
    dispatch(
      bookingEditRequested({
        id: booking.id,
        update: { devoteeName: v.devoteeName, phone: v.phone, ticketCount: Number(v.tickets) },
      }),
    ),
  )
  return (
    <form id={formId} noValidate onSubmit={onSubmit} className="grid gap-4">
      <FormField
        id="booking-name"
        label={t('adminBookings.devotee')}
        error={message('devoteeName')}
      >
        {(c) => <Input {...c} {...register('devoteeName')} className="h-11" />}
      </FormField>
      <FormField id="booking-phone" label={t('common.phone')} error={message('phone')}>
        {(c) => (
          <Input {...c} {...register('phone')} type="tel" inputMode="numeric" className="h-11" />
        )}
      </FormField>
      <FormField
        id="booking-tickets"
        label={t('adminBookings.tickets')}
        hint={ticketsLocked ? t('manage.ticketsLocked') : t('manage.ticketsHint')}
        error={message('tickets')}
      >
        {(c) => (
          <Input
            {...c}
            {...register('tickets')}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_TICKETS_PER_BOOKING}
            readOnly={ticketsLocked}
            className="h-11"
          />
        )}
      </FormField>
    </form>
  )
}

function BookingActions({ booking }: { booking: Booking }) {
  const { t } = useT()
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const cancelling = useAppSelector((s) => booking.id in s.adminBookings.cancelling)
  return (
    <span className="flex flex-wrap items-center justify-end gap-2 md:justify-start">
      <CancelCell booking={booking} />
      {can(user?.role, 'booking:manage') && (
        <>
          <EditorDialog
            trigger={
              <EditButton
                label={t('manage.editBookingOf', { ref: booking.bookingRef })}
                disabled={cancelling}
              />
            }
            title={t('manage.editBooking', { ref: booking.bookingRef })}
            submitLabel={t('common.save')}
          >
            {(formId) => <BookingForm formId={formId} booking={booking} />}
          </EditorDialog>
          <DeleteButton
            label={t('manage.deleteBookingOf', { ref: booking.bookingRef })}
            title={t('manage.deleteBookingTitle', { ref: booking.bookingRef })}
            description={t('manage.deleteBookingText')}
            disabled={cancelling}
            onConfirm={() => dispatch(bookingDeleteRequested(booking.id))}
          />
        </>
      )}
    </span>
  )
}

function CancelCell({ booking }: { booking: Booking }) {
  const { t, pick, date, time } = useT()
  const dispatch = useAppDispatch()
  const temples = useTemples()
  const cancelling = useAppSelector((s) => booking.id in s.adminBookings.cancelling)
  const now = useNow()

  if (booking.status !== 'BOOKED') return null
  if (Date.parse(booking.startsAt) <= now) {
    return <span className="text-xs text-muted-foreground">{t('adminBookings.started')}</span>
  }
  const temple = temples.data.find((x) => x.id === booking.templeId)
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="destructive"
          className="h-11 px-3"
          disabled={cancelling}
          aria-label={t('adminBookings.cancelOf', { ref: booking.bookingRef })}
        >
          {t('adminBookings.cancel')}
        </Button>
      }
      title={t('adminBookings.confirmTitle', { ref: booking.bookingRef })}
      description={t('adminBookings.confirmText', {
        tickets: booking.ticketCount,
        name: booking.devoteeName,
        date: date(booking.date) + (temple ? ` · ${pick(temple.name)}` : ''),
        time: time(booking.startsAt),
      })}
      confirmLabel={t('adminBookings.confirm')}
      cancelLabel={t('adminBookings.keep')}
      onConfirm={() => dispatch(adminBookingCancelRequested(booking.id))}
    />
  )
}

export function AdminBookingsPage() {
  const { t, pick, date, time, err } = useT()
  const dispatch = useAppDispatch()
  const list = useAppSelector(selectAdminBookings)
  const temples = useTemples()
  const { get, update } = useQueryParams()

  const phone = get('phone')
  const day = isValidIsoDate(get('date')) ? get('date') : ''
  const status = isStatus(get('status')) ? (get('status') as BookingStatus) : ''
  const templeId = get('temple')
  const page = readPage(get('page'))

  const search = () =>
    dispatch(
      bookingsSearchRequested({
        phone: phone || undefined,
        date: day || undefined,
        status: status || undefined,
        templeId: templeId || undefined,
        page,
        pageSize: BOOKINGS_PAGE_SIZE,
      }),
    )

  useEffect(() => {
    search()
    // `search` reads exactly these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, day, status, templeId, page])

  // The server snaps an out-of-range page to the last one; keep the URL honest.
  // Only when this answer is for the page the URL asks for (not a previous filter's answer).
  const servedPage = list.data?.page
  const askedPage = list.query?.page
  useEffect(() => {
    if (list.status === 'success' && askedPage === page && servedPage && servedPage !== page) {
      update({ page: servedPage }, { replace: true })
    }
  }, [list.status, askedPage, servedPage, page, update])

  const hasFilters = Boolean(phone || day || status || templeId)

  return (
    <div className="space-y-6">
      <PageHeading title={t('adminBookings.title')} intro={t('adminBookings.intro')} />

      <form
        role="search"
        aria-label={t('common.filters')}
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <PhoneSearchField
          id="bookings-phone"
          value={phone}
          onSearch={(digits) => update({ phone: digits }, { resetPage: true, replace: true })}
        />
        <FormField id="bookings-date" label={t('common.date')}>
          {(control) => (
            <Input
              {...control}
              type="date"
              value={day}
              onChange={(e) => update({ date: e.target.value }, { resetPage: true })}
              className="h-11"
            />
          )}
        </FormField>
        <FormField id="bookings-status" label={t('common.status')}>
          {(control) => (
            <NativeSelect
              {...control}
              value={status}
              onChange={(e) => update({ status: e.target.value }, { resetPage: true })}
            >
              <option value="">{t('common.anyStatus')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.booking.${s}`)}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <TempleScopeField
          id="bookings-temple"
          value={templeId}
          allowAll
          onChange={(id) => update({ temple: id }, { resetPage: true })}
        />
      </form>

      {list.status === 'error' && list.error ? (
        <ErrorState message={err(list.error)} onRetry={search} />
      ) : !list.data || (list.status === 'loading' && list.data.items.length === 0) ? (
        <LoadingState rows={4} />
      ) : list.data.total === 0 ? (
        <EmptyState
          title={t('adminBookings.empty')}
          action={
            hasFilters && (
              <Button
                variant="outline"
                className="h-11"
                onClick={() =>
                  update({ phone: null, date: null, status: null, temple: null, page: null })
                }
              >
                {t('common.clearFilters')}
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4" aria-busy={list.status === 'loading'}>
          <p role="status" className="text-sm text-muted-foreground">
            {t('adminBookings.count', { count: list.data.total })}
          </p>
          <RTable>
            <RHead>
              <tr role="row">
                <RHeader>{t('adminBookings.ref')}</RHeader>
                <RHeader>{t('adminBookings.devotee')}</RHeader>
                <RHeader>{t('adminBookings.darshan')}</RHeader>
                <RHeader>{t('adminBookings.tickets')}</RHeader>
                <RHeader>{t('common.status')}</RHeader>
                <RHeader>{t('common.actions')}</RHeader>
              </tr>
            </RHead>
            <RBody>
              {list.data.items.map((b) => {
                const temple = temples.data.find((x) => x.id === b.templeId)
                return (
                  <RRow key={b.id}>
                    <RCell label={t('adminBookings.ref')} className="font-mono font-medium">
                      {b.bookingRef}
                    </RCell>
                    <RCell label={t('adminBookings.devotee')}>
                      <span className="text-end md:text-start">
                        <span className="block font-medium">{b.devoteeName}</span>
                        <span className="block text-muted-foreground tabular-nums">{b.phone}</span>
                      </span>
                    </RCell>
                    <RCell label={t('adminBookings.darshan')}>
                      <span className="text-end md:text-start">
                        <span className="block">
                          {date(b.date)}, {time(b.startsAt)}
                        </span>
                        {temple && (
                          <span className="block text-muted-foreground">{pick(temple.name)}</span>
                        )}
                      </span>
                    </RCell>
                    <RCell label={t('adminBookings.tickets')} className="tabular-nums">
                      {b.ticketCount}
                    </RCell>
                    <RCell label={t('common.status')}>
                      <StatusBadge kind="booking" status={b.status} />
                    </RCell>
                    <RCell className="max-md:justify-end">
                      <BookingActions booking={b} />
                    </RCell>
                  </RRow>
                )
              })}
            </RBody>
          </RTable>
          <Pagination
            page={list.data.page}
            pageSize={list.data.pageSize}
            total={list.data.total}
            onPageChange={(p) => update({ page: p })}
          />
        </div>
      )}
    </div>
  )
}
