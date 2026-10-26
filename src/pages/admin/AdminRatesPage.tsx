import { useEffect, useState } from 'react'
import { RBody, RCell, RHead, RHeader, RRow, RTable } from '@/components/admin/ResponsiveTable'
import { TempleScopeField } from '@/components/admin/TempleScopeField'
import { PageHeading } from '@/components/common/PageTitle'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useQueryParams } from '@/hooks/useQueryParams'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { MAX_OFFERING_PRICE } from '@/lib/constants'
import {
  adminOfferingsRequested,
  offeringUpdateRequested,
  selectAdminOfferings,
} from '@/store/admin/catalogSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { Offering } from '@/types'

function OfferingRow({ offering }: { offering: Offering }) {
  const { t, pick } = useT()
  const dispatch = useAppDispatch()
  const saving = useAppSelector((s) => offering.id in s.adminCatalog.offerings.saving)
  const [price, setPrice] = useState(String(offering.price))
  const [error, setError] = useState<string | null>(null)
  const name = pick(offering.name)

  const save = () => {
    const value = Number(price)
    if (!Number.isInteger(value) || value < 1 || value > MAX_OFFERING_PRICE) {
      setError(t('adminRates.priceInvalid', { max: MAX_OFFERING_PRICE.toLocaleString('en-IN') }))
      return
    }
    setError(null)
    dispatch(offeringUpdateRequested({ offeringId: offering.id, price: value }))
  }

  return (
    <RRow className={offering.isActive ? undefined : 'bg-muted/40'}>
      <RCell label={t('adminRates.offering')} className="font-medium">
        {name}
      </RCell>
      <RCell label={t('adminRates.category')}>{t(`category.${offering.category}`)}</RCell>
      <RCell label={t('adminRates.price')}>
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
              min={1}
              max={MAX_OFFERING_PRICE}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-label={t('adminRates.priceOf', { name })}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${offering.id}-error` : undefined}
              className="h-11 w-28"
            />
            {error && (
              <p
                id={`${offering.id}-error`}
                className="max-w-48 text-xs font-medium text-destructive"
              >
                {error}
              </p>
            )}
          </div>
          <Button
            type="submit"
            variant="outline"
            className="h-11 px-3"
            disabled={saving || price === String(offering.price)}
            aria-label={t('adminRates.saveOf', { name })}
          >
            {t('common.save')}
          </Button>
        </form>
      </RCell>
      <RCell label={t('adminRates.available')}>
        <span className="flex min-h-11 items-center gap-3">
          <Switch
            checked={offering.isActive}
            disabled={saving}
            aria-label={t('adminRates.availableOf', { name })}
            onCheckedChange={(isActive) =>
              dispatch(offeringUpdateRequested({ offeringId: offering.id, isActive }))
            }
          />
          <span className="text-sm text-muted-foreground" aria-hidden="true">
            {offering.isActive ? t('adminRates.available') : t('adminRates.hidden')}
          </span>
        </span>
      </RCell>
    </RRow>
  )
}

export function AdminRatesPage() {
  const { t, err } = useT()
  const dispatch = useAppDispatch()
  const offerings = useAppSelector(selectAdminOfferings)
  const temples = useTemples()
  const { get, update } = useQueryParams()
  const templeId = temples.data.some((x) => x.id === get('temple'))
    ? get('temple')
    : (temples.data[0]?.id ?? '')

  const load = () => {
    if (templeId) dispatch(adminOfferingsRequested(templeId))
  }
  useEffect(() => {
    load()
    // `load` reads exactly this value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templeId])

  return (
    <div className="space-y-6">
      <PageHeading title={t('adminRates.title')} intro={t('adminRates.intro')} />
      <form
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2"
      >
        <TempleScopeField
          id="rates-temple"
          value={templeId}
          onChange={(id) => update({ temple: id })}
        />
      </form>

      {offerings.status === 'error' && offerings.error ? (
        <ErrorState message={err(offerings.error)} onRetry={load} />
      ) : offerings.status !== 'success' ? (
        <LoadingState rows={5} />
      ) : offerings.data.length === 0 ? (
        <EmptyState title={t('adminRates.empty')} />
      ) : (
        <RTable>
          <RHead>
            <tr role="row">
              <RHeader>{t('adminRates.offering')}</RHeader>
              <RHeader>{t('adminRates.category')}</RHeader>
              <RHeader>{t('adminRates.price')}</RHeader>
              <RHeader>{t('adminRates.available')}</RHeader>
            </tr>
          </RHead>
          <RBody>
            {offerings.data.map((o) => (
              <OfferingRow key={`${o.id}-${o.price}`} offering={o} />
            ))}
          </RBody>
        </RTable>
      )}
    </div>
  )
}
