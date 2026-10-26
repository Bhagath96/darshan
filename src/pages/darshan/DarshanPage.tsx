import { useEffect, useId, useRef } from 'react'
import { Info } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { CopyLinkButton } from '@/components/common/CopyLinkButton'
import { FormField } from '@/components/common/FormField'
import { NativeSelect } from '@/components/common/NativeSelect'
import { PageHeading } from '@/components/common/PageTitle'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { BookingDialog } from '@/components/darshan/BookingDialog'
import { DayPicker } from '@/components/darshan/DayPicker'
import { SlotCard } from '@/components/darshan/SlotCard'
import { useNow } from '@/hooks/useNow'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { addDays, todayIST } from '@/lib/date'
import { availabilityOf } from '@/lib/slots'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { bookingFormOpened, selectBooking } from '@/store/darshan/bookingSlice'
import { selectSlots, slotsRequested } from '@/store/darshan/slotsSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

const BOOKABLE_DAYS = 7

interface FixedLinkState {
  badLink: true
}

/**
 * /darshan?temple=&date= — the URL is the single source of truth for the selection,
 * so a link can be shared, survives a refresh, and Back returns to the previous choice.
 */
export function DarshanPage() {
  const { t, pick, date, err } = useT()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const user = useAppSelector(selectCurrentUser)
  const temples = useTemples()
  const slots = useAppSelector(selectSlots)
  const booking = useAppSelector(selectBooking)
  const now = useNow()
  const dayLabelId = useId()
  const opener = useRef<HTMLElement | null>(null)

  const today = todayIST(new Date(now))
  const days = Array.from({ length: BOOKABLE_DAYS }, (_, i) => addDays(today, i))
  const templeParam = params.get('temple') ?? ''
  const dateParam = params.get('date') ?? ''
  const ready = temples.status === 'success'
  const validTemple = temples.data.some((x) => x.id === templeParam)
  const validDate = days.includes(dateParam)
  const badLink = (location.state as FixedLinkState | null)?.badLink === true

  // Fill in defaults, and reset a link with an unknown temple or a day outside the week.
  useEffect(() => {
    if (!ready || (validTemple && validDate)) return
    const firstTemple = temples.data[0]?.id
    if (!firstTemple) return
    const bad = (templeParam !== '' && !validTemple) || (dateParam !== '' && !validDate)
    setParams(
      { temple: validTemple ? templeParam : firstTemple, date: validDate ? dateParam : today },
      { replace: true, state: bad ? ({ badLink: true } satisfies FixedLinkState) : null },
    )
  }, [ready, validTemple, validDate, templeParam, dateParam, today, temples.data, setParams])

  // Load the slots for the selection in the URL (takeLatest drops a slower, older answer).
  useEffect(() => {
    if (validTemple && validDate) dispatch(slotsRequested(templeParam, dateParam))
  }, [dispatch, validTemple, validDate, templeParam, dateParam])

  /** Each change is a new history entry, so Back goes to the previous choice. */
  const choose = (patch: { temple?: string; date?: string }) =>
    setParams({ temple: patch.temple ?? templeParam, date: patch.date ?? dateParam })

  const book = (slotId: string) => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)
      return
    }
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dispatch(bookingFormOpened(slotId))
  }

  const temple = temples.data.find((x) => x.id === templeParam)
  const openSlot = slots.data.find((s) => s.id === booking.slotId)
  const retry = () => dispatch(slotsRequested(templeParam, dateParam))

  return (
    <div className="space-y-6">
      <PageHeading title={t('darshan.title')} intro={t('darshan.intro')} />

      {badLink && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border bg-secondary/50 p-3 text-sm"
        >
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t('darshan.badLink')}
        </p>
      )}

      {temples.status === 'error' && temples.error ? (
        <ErrorState message={err(temples.error)} onRetry={temples.retry} />
      ) : (
        <div className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-end gap-4">
            <FormField
              id="darshan-temple"
              label={t('darshan.temple')}
              className="min-w-0 flex-1 basis-64"
            >
              {(control) => (
                <NativeSelect
                  {...control}
                  value={validTemple ? templeParam : ''}
                  disabled={!ready}
                  onChange={(e) => choose({ temple: e.target.value })}
                >
                  {!ready && <option value="">{t('common.loading')}</option>}
                  {temples.data.map((x) => (
                    <option key={x.id} value={x.id}>
                      {pick(x.name)}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <CopyLinkButton />
          </div>
          <div className="space-y-1.5">
            <p id={dayLabelId} className="text-sm font-medium">
              {t('darshan.day')}
            </p>
            <DayPicker
              days={days}
              value={validDate ? dateParam : today}
              onChange={(d) => choose({ date: d })}
              labelId={dayLabelId}
            />
          </div>
        </div>
      )}

      {validTemple && validDate && (
        <section aria-labelledby="slots-heading" className="space-y-3">
          <h2 id="slots-heading" className="text-2xl font-semibold text-primary">
            {t('darshan.slotsFor', { date: date(dateParam) })}
          </h2>
          {slots.status === 'error' && slots.error ? (
            <ErrorState message={err(slots.error)} onRetry={retry} />
          ) : slots.status === 'loading' && slots.data.length === 0 ? (
            <LoadingState rows={3} />
          ) : slots.data.length === 0 ? (
            <EmptyState title={t('darshan.empty')} />
          ) : (
            <ul
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-busy={slots.status === 'loading'}
            >
              {slots.data.map((slot) => (
                <li key={slot.id}>
                  <SlotCard
                    slot={slot}
                    availability={availabilityOf(slot, now)}
                    onBook={() => book(slot.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <BookingDialog slot={openSlot} temple={temple} returnFocusTo={opener} />
    </div>
  )
}
