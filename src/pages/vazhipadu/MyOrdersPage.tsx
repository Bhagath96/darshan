import { useEffect } from 'react'
import { CalendarDays } from 'lucide-react'
import { Link } from 'react-router'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeading } from '@/components/common/PageTitle'
import { Pagination } from '@/components/common/Pagination'
import { Price } from '@/components/common/Price'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button, buttonVariants } from '@/components/ui/button'
import { readPage, useQueryParams } from '@/hooks/useQueryParams'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { ORDERS_PAGE_SIZE } from '@/lib/constants'
import { formatINR } from '@/lib/currency'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { orderCancelRequested, ordersRequested, selectOrders } from '@/store/orders/ordersSlice'
import type { Order } from '@/types'

function OrderCard({ order }: { order: Order }) {
  const { t, pick, date } = useT()
  const dispatch = useAppDispatch()
  const temples = useTemples()
  const cancelling = useAppSelector((s) => order.id in s.orders.cancelling)
  const temple = temples.data.find((x) => x.id === order.templeId)

  return (
    <article className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-mono text-base font-semibold">{order.orderNumber}</h2>
          <StatusBadge kind="order" status={order.status} />
        </div>
        <Price amount={order.totalAmount} className="text-lg font-semibold" />
      </div>
      {temple && <p className="font-medium text-primary">{pick(temple.name)}</p>}
      <p className="flex items-center gap-1.5 text-sm">
        <CalendarDays aria-hidden="true" className="size-4 text-gold" />
        {date(order.offeringDate)} · {order.devoteeName}
      </p>
      <p className="text-sm text-muted-foreground">
        {order.items.map((i) => `${pick(i.offeringName)} × ${i.quantity}`).join(', ')}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          to={`/vazhipadu/orders/${order.orderNumber}`}
          aria-label={t('myOrders.viewReceiptOf', { number: order.orderNumber })}
          className={buttonVariants({ variant: 'outline', className: 'h-11 px-4' })}
        >
          {t('myOrders.viewReceipt')}
        </Link>
        {order.status === 'CONFIRMED' && (
          <ConfirmDialog
            trigger={
              <Button
                variant="destructive"
                className="h-11 px-4"
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
        )}
      </div>
    </article>
  )
}

/** The logged-in devotee's vazhipadu orders (the API returns only their own). */
export function MyOrdersPage() {
  const { t, err } = useT()
  const dispatch = useAppDispatch()
  const list = useAppSelector(selectOrders)
  const { get, update } = useQueryParams()
  const page = readPage(get('page'))

  const load = () => dispatch(ordersRequested({ mine: true, page, pageSize: ORDERS_PAGE_SIZE }))
  useEffect(() => {
    load()
    // `load` reads exactly this value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return (
    <div className="space-y-6">
      <PageHeading title={t('myOrders.title')} intro={t('myOrders.intro')} />
      {list.status === 'error' && list.error ? (
        <ErrorState message={err(list.error)} onRetry={load} />
      ) : !list.data || !list.query?.mine ? (
        <LoadingState rows={3} />
      ) : list.data.total === 0 ? (
        <EmptyState
          title={t('myOrders.empty')}
          action={
            <Link to="/vazhipadu" className={buttonVariants({ className: 'h-11 px-5' })}>
              {t('myOrders.offerNow')}
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3">
            {list.data.items.map((o) => (
              <li key={o.id}>
                <OrderCard order={o} />
              </li>
            ))}
          </ul>
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
