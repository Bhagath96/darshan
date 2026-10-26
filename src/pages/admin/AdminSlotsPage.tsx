import { useEffect, useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { RBody, RCell, RHead, RHeader, RRow, RTable } from '@/components/admin/ResponsiveTable'
import { TempleScopeField } from '@/components/admin/TempleScopeField'
import { FormField } from '@/components/common/FormField'
import { NativeSelect } from '@/components/common/NativeSelect'
import { PageHeading } from '@/components/common/PageTitle'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQueryParams } from '@/hooks/useQueryParams'
import { useNow } from '@/hooks/useNow'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { MAX_SLOT_CAPACITY } from '@/lib/constants'
import { addDays, todayIST } from '@/lib/date'
import {
  adminSlotsRequested,
  selectAdminSlots,
  slotUpdateRequested,
} from '@/store/admin/catalogSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { DarshanSlot } from '@/types'

const SLOT_DAYS = 7

function SlotRow({ slot }: { slot: DarshanSlot }) {
  const { t, time } = useT()
  const dispatch = useAppDispatch()
  const saving = useAppSelector((s) => slot.id in s.adminCatalog.slots.saving)
  const now = useNow()
  const [capacity, setCapacity] = useState(String(slot.totalCapacity))
  const [error, setError] = useState<string | null>(null)
  const booked = slot.totalCapacity - slot.remainingTickets
  const started = Date.parse(slot.startsAt) <= now
  const label = time(slot.startsAt)

  const save = () => {
    const value = Number(capacity)
    const min = Math.max(1, booked)
    if (!Number.isInteger(value) || value < min || value > MAX_SLOT_CAPACITY) {
      setError(t('adminSlots.capacityInvalid', { min, max: MAX_SLOT_CAPACITY }))
      return
    }
    setError(null)
    dispatch(slotUpdateRequested({ slotId: slot.id, totalCapacity: value }))
  }

  return (
    <RRow>
      <RCell label={t('adminSlots.time')}>
        <span className="flex flex-wrap items-center justify-end gap-2 md:justify-start">
          <span className="font-medium tabular-nums">{label}</span>
          {started && <Badge variant="outline">{t('adminSlots.started')}</Badge>}
          {slot.remainingTickets === 0 && <Badge variant="secondary">{t('adminSlots.full')}</Badge>}
        </span>
      </RCell>
      <RCell label={t('adminSlots.booked')} className="tabular-nums">
        {t('adminSlots.bookedOf', { booked, capacity: slot.totalCapacity })}
      </RCell>
      <RCell label={t('adminSlots.capacity')}>
        <form
          noValidate
          className="flex items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <div className="space-y-1">
            <Input
              type="number"
              inputMode="numeric"
              min={Math.max(1, booked)}
              max={MAX_SLOT_CAPACITY}
              step={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              aria-label={t('adminSlots.capacityOf', { time: label })}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${slot.id}-error` : undefined}
              className="h-11 w-24"
            />
            {error && (
              <p id={`${slot.id}-error`} className="max-w-48 text-xs font-medium text-destructive">
                {error}
              </p>
            )}
          </div>
          <Button
            type="submit"
            variant="outline"
            className="h-11 px-3"
            disabled={saving || capacity === String(slot.totalCapacity)}
            aria-label={t('adminSlots.saveOf', { time: label })}
          >
            {t('common.save')}
          </Button>
        </form>
      </RCell>
      <RCell label={t('adminSlots.booking')}>
        <span className="flex flex-wrap items-center justify-end gap-2 md:justify-start">
          <Badge variant={slot.isBlocked ? 'destructive' : 'secondary'}>
            {slot.isBlocked ? t('adminSlots.closed') : t('adminSlots.isOpen')}
          </Badge>
          <Button
            variant="outline"
            className="h-11 px-3"
            disabled={saving}
            aria-label={
              slot.isBlocked
                ? t('adminSlots.openOf', { time: label })
                : t('adminSlots.closeOf', { time: label })
            }
            onClick={() =>
              dispatch(slotUpdateRequested({ slotId: slot.id, isBlocked: !slot.isBlocked }))
            }
          >
            {slot.isBlocked ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
            {slot.isBlocked ? t('adminSlots.open') : t('adminSlots.close')}
          </Button>
        </span>
      </RCell>
    </RRow>
  )
}

export function AdminSlotsPage() {
  const { t, date, err } = useT()
  const dispatch = useAppDispatch()
  const slots = useAppSelector(selectAdminSlots)
  const temples = useTemples()
  const { get, update } = useQueryParams()

  const today = todayIST()
  const days = Array.from({ length: SLOT_DAYS }, (_, i) => addDays(today, i))
  const templeId = temples.data.some((x) => x.id === get('temple'))
    ? get('temple')
    : (temples.data[0]?.id ?? '')
  const day = days.includes(get('date')) ? get('date') : today

  const load = () => {
    if (templeId) dispatch(adminSlotsRequested(templeId, day))
  }
  useEffect(() => {
    load()
    // `load` reads exactly these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templeId, day])

  return (
    <div className="space-y-6">
      <PageHeading title={t('adminSlots.title')} intro={t('adminSlots.intro')} />

      <form
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2"
      >
        <TempleScopeField
          id="slots-temple"
          value={templeId}
          onChange={(id) => update({ temple: id })}
        />
        <FormField id="slots-date" label={t('common.date')}>
          {(control) => (
            <NativeSelect
              {...control}
              value={day}
              onChange={(e) => update({ date: e.target.value })}
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {date(d)}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      </form>

      {slots.status === 'error' && slots.error ? (
        <ErrorState message={err(slots.error)} onRetry={load} />
      ) : slots.status !== 'success' ? (
        <LoadingState rows={4} />
      ) : slots.data.length === 0 ? (
        <EmptyState title={t('adminSlots.empty')} />
      ) : (
        <RTable>
          <RHead>
            <tr role="row">
              <RHeader>{t('adminSlots.time')}</RHeader>
              <RHeader>{t('adminSlots.booked')}</RHeader>
              <RHeader>{t('adminSlots.capacity')}</RHeader>
              <RHeader>{t('adminSlots.booking')}</RHeader>
            </tr>
          </RHead>
          <RBody>
            {slots.data.map((slot) => (
              // Re-mount the row when the saved capacity changes, so the input shows it.
              <SlotRow key={`${slot.id}-${slot.totalCapacity}`} slot={slot} />
            ))}
          </RBody>
        </RTable>
      )}
    </div>
  )
}
