import { useEffect, useRef } from 'react'
import { CheckCircle2, Printer } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'
import { PageTitle } from '@/components/common/PageTitle'
import { Price } from '@/components/common/Price'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button, buttonVariants } from '@/components/ui/button'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { NAKSHATRAS } from '@/lib/constants'
import { formatDateTimeIST } from '@/lib/date'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { receiptRequested, selectCheckout } from '@/store/vazhipadu/checkoutSlice'
import type { Order } from '@/types'

function Receipt({ order, justPlaced }: { order: Order; justPlaced: boolean }) {
  const { t, pick, date, lang } = useT()
  const temples = useTemples()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const temple = temples.data.find((x) => x.id === order.templeId)
  const star = NAKSHATRAS.find((n) => n.id === order.star)

  // Straight after placing the order, start screen readers at the confirmation.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <PageTitle title={t('receipt.heading', { number: order.orderNumber })} />
      <header className="space-y-2 text-center">
        {justPlaced && (
          <CheckCircle2 aria-hidden="true" className="mx-auto size-12 text-success print:hidden" />
        )}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl font-semibold text-primary outline-none"
        >
          {justPlaced ? t('receipt.title') : t('receipt.heading', { number: order.orderNumber })}
        </h1>
        {justPlaced && <p className="text-muted-foreground">{t('receipt.intro')}</p>}
      </header>

      <div className="space-y-5 rounded-xl border bg-card p-5 print:border-0 print:p-0">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t('receipt.number')}</dt>
            <dd className="font-mono text-xl font-semibold">{order.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('receipt.status')}</dt>
            <dd>
              <StatusBadge kind="order" status={order.status} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('receipt.temple')}</dt>
            <dd className="font-medium">{temple ? pick(temple.name) : order.templeId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('receipt.date')}</dt>
            <dd className="font-medium">{date(order.offeringDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('receipt.devotee')}</dt>
            <dd className="font-medium">
              {order.devoteeName} · <span className="tabular-nums">{order.phone}</span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('receipt.star')}</dt>
            <dd className="font-medium">{lang === 'ml' && star ? star.ml : order.star}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">{t('receipt.placedAt')}</dt>
            <dd>{formatDateTimeIST(order.createdAt, lang)}</dd>
          </div>
        </dl>

        <table className="w-full text-sm">
          <caption className="mb-2 text-start font-semibold">{t('receipt.items')}</caption>
          <thead className="border-b text-muted-foreground">
            <tr>
              <th scope="col" className="py-2 text-start font-medium">
                {t('receipt.offering')}
              </th>
              <th scope="col" className="py-2 text-end font-medium">
                {t('receipt.qty')}
              </th>
              <th scope="col" className="py-2 text-end font-medium">
                {t('receipt.price')}
              </th>
              <th scope="col" className="py-2 text-end font-medium">
                {t('receipt.amount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((line) => (
              <tr key={line.offeringId} className="border-b">
                <th scope="row" className="py-2 text-start font-normal">
                  {pick(line.offeringName)}
                </th>
                <td className="py-2 text-end tabular-nums">{line.quantity}</td>
                <td className="py-2 text-end">
                  <Price amount={line.unitPrice} />
                </td>
                <td className="py-2 text-end">
                  <Price amount={line.unitPrice * line.quantity} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3} className="pt-3 text-start text-base">
                {t('receipt.total')}
              </th>
              <td className="pt-3 text-end text-base font-semibold">
                <Price amount={order.totalAmount} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center print:hidden">
        <Button variant="outline" className="h-11 px-4" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          {t('receipt.print')}
        </Button>
        <Link
          to="/vazhipadu/my-orders"
          className={buttonVariants({ variant: 'outline', className: 'h-11 px-4' })}
        >
          {t('receipt.myOrders')}
        </Link>
        <Link
          to={`/vazhipadu?temple=${order.templeId}`}
          className={buttonVariants({ className: 'h-11 px-4' })}
        >
          {t('receipt.more')}
        </Link>
      </div>
    </article>
  )
}

export function ReceiptPage() {
  const { orderNumber = '' } = useParams()
  const { t, err } = useT()
  const dispatch = useAppDispatch()
  const checkout = useAppSelector(selectCheckout)
  const location = useLocation()
  // "Order placed" only when arriving straight from checkout; later visits show a plain receipt.
  const fromCheckout = (location.state as { justPlaced?: boolean } | null)?.justPlaced === true
  const known = checkout.lastOrder?.orderNumber === orderNumber

  useEffect(() => {
    if (!known) dispatch(receiptRequested(orderNumber))
  }, [dispatch, known, orderNumber])

  if (known && checkout.lastOrder)
    return <Receipt order={checkout.lastOrder} justPlaced={fromCheckout} />

  const { receipt } = checkout
  if (receipt.status === 'error' && receipt.error) {
    return receipt.error.code === 'NOT_FOUND' ? (
      <div className="space-y-4">
        <PageTitle title={t('receipt.notFound')} />
        <h1 className="text-3xl font-semibold text-primary">{t('receipt.notFound')}</h1>
        <EmptyState title={receipt.error.message} />
      </div>
    ) : (
      <ErrorState
        message={err(receipt.error)}
        onRetry={() => dispatch(receiptRequested(orderNumber))}
      />
    )
  }
  if (receipt.data?.orderNumber !== orderNumber) return <LoadingState rows={4} />
  return <Receipt order={receipt.data} justPlaced={false} />
}
