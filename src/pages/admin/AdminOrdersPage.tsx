import { useEffect } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { PhoneSearchField } from '@/components/admin/PhoneSearchField'
import { RBody, RCell, RHead, RHeader, RRow, RTable } from '@/components/admin/ResponsiveTable'
import { TempleScopeField } from '@/components/admin/TempleScopeField'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField } from '@/components/common/FormField'
import { NativeSelect } from '@/components/common/NativeSelect'
import { PageHeading } from '@/components/common/PageTitle'
import { Pagination } from '@/components/common/Pagination'
import { Price } from '@/components/common/Price'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { readPage, useQueryParams } from '@/hooks/useQueryParams'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { NAKSHATRAS, ORDER_STATUSES, ORDERS_PAGE_SIZE } from '@/lib/constants'
import { formatINR } from '@/lib/currency'
import { isValidIsoDate } from '@/lib/date'
import {
  orderCancelRequested,
  ordersExportRequested,
  ordersRequested,
  selectOrders,
} from '@/store/orders/ordersSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { Order, OrderStatus } from '@/types'

const isStatus = (v: string): v is OrderStatus => (ORDER_STATUSES as readonly string[]).includes(v)

function CancelOrderButton({ order }: { order: Order }) {
  const { t } = useT()
  const dispatch = useAppDispatch()
  const cancelling = useAppSelector((s) => order.id in s.orders.cancelling)
  if (order.status !== 'CONFIRMED') return null
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="destructive"
          className="h-11 px-3"
          disabled={cancelling}
          aria-label={t('adminOrders.cancelOf', { number: order.orderNumber })}
        >
          {t('adminOrders.cancel')}
        </Button>
      }
      title={t('adminOrders.confirmTitle', { number: order.orderNumber })}
      description={t('adminOrders.confirmText', {
        name: order.devoteeName,
        total: formatINR(order.totalAmount),
      })}
      confirmLabel={t('adminOrders.confirm')}
      cancelLabel={t('adminOrders.keep')}
      onConfirm={() => dispatch(orderCancelRequested(order.id))}
    />
  )
}

export function AdminOrdersPage() {
  const { t, pick, date, err, lang } = useT()
  const dispatch = useAppDispatch()
  const list = useAppSelector(selectOrders)
  const temples = useTemples()
  const { get, update } = useQueryParams()

  const phone = get('phone')
  const day = isValidIsoDate(get('date')) ? get('date') : ''
  const status = isStatus(get('status')) ? (get('status') as OrderStatus) : ''
  const templeId = get('temple')
  const page = readPage(get('page'))
  const filters = {
    phone: phone || undefined,
    date: day || undefined,
    status: status || undefined,
    templeId: templeId || undefined,
  }

  const load = () => dispatch(ordersRequested({ ...filters, page, pageSize: ORDERS_PAGE_SIZE }))

  useEffect(() => {
    load()
    // `load` reads exactly these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, day, status, templeId, page])

  // Only when this answer is for the page the URL asks for (not a previous filter's answer).
  const servedPage = list.data?.page
  const askedPage = list.query?.page
  useEffect(() => {
    if (list.status === 'success' && askedPage === page && servedPage && servedPage !== page) {
      update({ page: servedPage }, { replace: true })
    }
  }, [list.status, askedPage, servedPage, page, update])

  const exporting = list.export.status === 'loading'
  const hasFilters = Boolean(phone || day || status || templeId)
  const starName = (id: string) =>
    lang === 'ml' ? (NAKSHATRAS.find((n) => n.id === id)?.ml ?? id) : id

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading title={t('adminOrders.title')} intro={t('adminOrders.intro')} />
        <Button
          variant="outline"
          className="h-11 px-4"
          disabled={exporting || !list.data || list.data.total === 0}
          onClick={() => dispatch(ordersExportRequested(filters))}
        >
          {exporting ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Download aria-hidden="true" />
          )}
          {exporting ? t('adminOrders.exporting') : t('adminOrders.export')}
        </Button>
      </div>

      <form
        role="search"
        aria-label={t('common.filters')}
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <FormField id="orders-status" label={t('common.status')}>
          {(control) => (
            <NativeSelect
              {...control}
              value={status}
              onChange={(e) => update({ status: e.target.value }, { resetPage: true })}
            >
              <option value="">{t('common.anyStatus')}</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.order.${s}`)}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="orders-date" label={t('adminOrders.offeringDate')}>
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
        <PhoneSearchField
          id="orders-phone"
          value={phone}
          onSearch={(digits) => update({ phone: digits }, { resetPage: true, replace: true })}
        />
        <TempleScopeField
          id="orders-temple"
          value={templeId}
          allowAll
          onChange={(id) => update({ temple: id }, { resetPage: true })}
        />
      </form>

      {list.status === 'error' && list.error ? (
        <ErrorState message={err(list.error)} onRetry={load} />
      ) : !list.data ? (
        <LoadingState rows={4} />
      ) : list.data.total === 0 ? (
        <EmptyState
          title={t('adminOrders.empty')}
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
            {t('adminOrders.count', { count: list.data.total })}
          </p>
          <RTable>
            <RHead>
              <tr role="row">
                <RHeader>{t('adminOrders.order')}</RHeader>
                <RHeader>{t('adminOrders.devotee')}</RHeader>
                <RHeader>{t('adminOrders.offerings')}</RHeader>
                <RHeader>{t('adminOrders.offeringDate')}</RHeader>
                <RHeader className="text-end">{t('adminOrders.total')}</RHeader>
                <RHeader>{t('common.status')}</RHeader>
                <RHeader>{t('common.actions')}</RHeader>
              </tr>
            </RHead>
            <RBody>
              {list.data.items.map((o) => {
                const temple = temples.data.find((x) => x.id === o.templeId)
                return (
                  <RRow key={o.id}>
                    <RCell label={t('adminOrders.order')}>
                      <span className="text-end md:text-start">
                        <span className="block font-mono font-medium">{o.orderNumber}</span>
                        {temple && (
                          <span className="block text-muted-foreground">{pick(temple.name)}</span>
                        )}
                      </span>
                    </RCell>
                    <RCell label={t('adminOrders.devotee')}>
                      <span className="text-end md:text-start">
                        <span className="block font-medium">{o.devoteeName}</span>
                        <span className="block text-muted-foreground tabular-nums">{o.phone}</span>
                        <span className="block text-muted-foreground">
                          {t('adminOrders.star', { star: starName(o.star) })}
                        </span>
                      </span>
                    </RCell>
                    <RCell label={t('adminOrders.offerings')}>
                      <ul className="text-end md:text-start">
                        {o.items.map((i) => (
                          <li key={i.offeringId}>
                            {pick(i.offeringName)} × {i.quantity}
                          </li>
                        ))}
                      </ul>
                    </RCell>
                    <RCell label={t('adminOrders.offeringDate')} className="whitespace-nowrap">
                      {date(o.offeringDate)}
                    </RCell>
                    <RCell label={t('adminOrders.total')} className="md:text-end">
                      <Price amount={o.totalAmount} className="font-medium" />
                    </RCell>
                    <RCell label={t('common.status')}>
                      <StatusBadge kind="order" status={o.status} />
                    </RCell>
                    <RCell className="max-md:justify-end">
                      <CancelOrderButton order={o} />
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
