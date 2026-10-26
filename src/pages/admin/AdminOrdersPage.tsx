import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Download, Loader2 } from 'lucide-react'
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
import { Price } from '@/components/common/Price'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { readPage, useQueryParams } from '@/hooks/useQueryParams'
import { useFieldMessage } from '@/hooks/useFieldMessage'
import { useTemples } from '@/hooks/useTemples'
import { useT, type MessageKey } from '@/i18n'
import { NAKSHATRA_IDS, NAKSHATRAS, ORDER_STATUSES, ORDERS_PAGE_SIZE } from '@/lib/constants'
import { formatINR } from '@/lib/currency'
import { isValidIsoDate } from '@/lib/date'
import { can } from '@/lib/permissions'
import { isValidPhone } from '@/lib/phone'
import { NAME_PATTERN } from '@/lib/validators'
import { z } from '@/lib/zod'
import { orderDeleteRequested, orderEditRequested } from '@/store/admin/manageActions'
import { selectCurrentUser } from '@/store/auth/authSlice'
import {
  orderCancelRequested,
  ordersExportRequested,
  ordersRequested,
  selectOrders,
} from '@/store/orders/ordersSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { Nakshatra, Order, OrderStatus } from '@/types'

const key = (k: MessageKey) => k
const orderSchema = z.object({
  devoteeName: z
    .string()
    .transform((v) => v.trim().replace(/\s+/g, ' '))
    .pipe(z.string().regex(NAME_PATTERN, key('manage.nameInvalid'))),
  phone: z.string().trim().refine(isValidPhone, key('validation.phoneInvalid')),
  star: z.string().refine((v) => (NAKSHATRA_IDS as readonly string[]).includes(v), {
    message: key('validation.starRequired'),
  }),
  offeringDate: z.string().refine(isValidIsoDate, { message: key('manage.dateInvalid') }),
  status: z.enum(ORDER_STATUSES),
})
type OrderValues = z.infer<typeof orderSchema>

function OrderForm({ formId, order }: { formId: string; order: Order }) {
  const { t, lang } = useT()
  const dispatch = useAppDispatch()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      devoteeName: order.devoteeName,
      phone: order.phone,
      star: order.star,
      offeringDate: order.offeringDate,
      status: order.status,
    },
  })
  const message = useFieldMessage(errors)
  const onSubmit = handleSubmit((v) =>
    dispatch(
      orderEditRequested({
        id: order.id,
        update: { ...v, star: v.star as Nakshatra },
      }),
    ),
  )
  return (
    <form id={formId} noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <FormField id="order-name" label={t('adminOrders.devotee')} error={message('devoteeName')}>
        {(c) => <Input {...c} {...register('devoteeName')} className="h-11" />}
      </FormField>
      <FormField id="order-phone" label={t('common.phone')} error={message('phone')}>
        {(c) => (
          <Input {...c} {...register('phone')} type="tel" inputMode="numeric" className="h-11" />
        )}
      </FormField>
      <FormField id="order-star" label={t('manage.star')} error={message('star')}>
        {(c) => (
          <NativeSelect {...c} {...register('star')}>
            {NAKSHATRAS.map((n) => (
              <option key={n.id} value={n.id}>
                {lang === 'ml' ? n.ml : n.id}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <FormField
        id="order-date"
        label={t('adminOrders.offeringDate')}
        error={message('offeringDate')}
      >
        {(c) => <Input {...c} {...register('offeringDate')} type="date" className="h-11" />}
      </FormField>
      <FormField id="order-status" label={t('common.status')}>
        {(c) => (
          <NativeSelect {...c} {...register('status')}>
            {ORDER_STATUSES.map((st) => (
              <option key={st} value={st}>
                {t(`status.order.${st}`)}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <p className="self-end pb-3 text-sm text-muted-foreground">{t('manage.orderItemsFixed')}</p>
    </form>
  )
}

function OrderActions({ order }: { order: Order }) {
  const { t } = useT()
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const cancelling = useAppSelector((s) => order.id in s.orders.cancelling)
  return (
    <span className="flex flex-wrap items-center justify-end gap-2 md:justify-start">
      <CancelOrderButton order={order} />
      {can(user?.role, 'order:manage') && (
        <>
          <EditorDialog
            wide
            trigger={
              <EditButton
                label={t('manage.editOrderOf', { number: order.orderNumber })}
                disabled={cancelling}
              />
            }
            title={t('manage.editOrder', { number: order.orderNumber })}
            submitLabel={t('common.save')}
          >
            {(formId) => <OrderForm formId={formId} order={order} />}
          </EditorDialog>
          <DeleteButton
            label={t('manage.deleteOrderOf', { number: order.orderNumber })}
            title={t('manage.deleteOrderTitle', { number: order.orderNumber })}
            description={t('manage.deleteOrderText')}
            disabled={cancelling}
            onConfirm={() => dispatch(orderDeleteRequested(order.id))}
          />
        </>
      )}
    </span>
  )
}

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
                      <OrderActions order={o} />
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
