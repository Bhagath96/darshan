import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router'
import { z } from '@/lib/zod'
import { ErrorSummary } from '@/components/common/ErrorSummary'
import { FormField } from '@/components/common/FormField'
import { NativeSelect } from '@/components/common/NativeSelect'
import { PageHeading } from '@/components/common/PageTitle'
import { EmptyState } from '@/components/common/states'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CartPanel } from '@/components/vazhipadu/CartPanel'
import { useT, type MessageKey } from '@/i18n'
import { MAX_DAYS_AHEAD, NAKSHATRA_IDS, NAKSHATRAS } from '@/lib/constants'
import { formatINR } from '@/lib/currency'
import { addDays, isValidIsoDate, todayIST } from '@/lib/date'
import { normalizePhone } from '@/lib/phone'
import { nameSchema, phoneSchema } from '@/lib/schemas'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectCart, selectCartTotal } from '@/store/vazhipadu/cartSlice'
import { checkoutOpened, orderSubmitted, selectCheckout } from '@/store/vazhipadu/checkoutSlice'
import type { Nakshatra } from '@/types'

const isNakshatra = (v: string): v is Nakshatra => (NAKSHATRA_IDS as readonly string[]).includes(v)

function orderSchema(today: string) {
  const last = addDays(today, MAX_DAYS_AHEAD)
  return z.object({
    devoteeName: nameSchema,
    phone: phoneSchema,
    star: z.string().refine(isNakshatra, 'validation.starRequired' satisfies MessageKey),
    offeringDate: z
      .string()
      .refine(
        (v) => isValidIsoDate(v) && v >= today && v <= last,
        'validation.dateRange' satisfies MessageKey,
      ),
  })
}
type OrderInput = z.input<ReturnType<typeof orderSchema>>
type OrderValues = z.output<ReturnType<typeof orderSchema>>

const FIELDS: Array<[keyof OrderInput, MessageKey]> = [
  ['devoteeName', 'checkout.devoteeName'],
  ['phone', 'checkout.phone'],
  ['star', 'checkout.star'],
  ['offeringDate', 'checkout.date'],
]
const fieldId = (name: string) => `checkout-${name}`

export function CheckoutPage() {
  const { t, err, lang } = useT()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector(selectCurrentUser)
  const cart = useAppSelector(selectCart)
  const total = useAppSelector(selectCartTotal)
  const checkout = useAppSelector(selectCheckout)
  const errorRef = useRef<HTMLDivElement>(null)
  // Only a submit from this visit should move on to the receipt.
  const [submittedHere, setSubmittedHere] = useState(false)
  const today = todayIST()

  const {
    register,
    handleSubmit,
    formState: { errors, submitCount },
  } = useForm<OrderInput, unknown, OrderValues>({
    resolver: zodResolver(orderSchema(today)),
    defaultValues: {
      devoteeName: user?.name ?? '',
      phone: user?.phone ?? '',
      star: '',
      offeringDate: today,
    },
  })

  useEffect(() => {
    dispatch(checkoutOpened())
  }, [dispatch])

  // Placed: go to the receipt (the cart has been emptied by then).
  useEffect(() => {
    if (submittedHere && checkout.status === 'success' && checkout.lastOrder) {
      navigate(`/vazhipadu/orders/${checkout.lastOrder.orderNumber}`, {
        replace: true,
        state: { justPlaced: true },
      })
    }
  }, [submittedHere, checkout.status, checkout.lastOrder, navigate])

  useEffect(() => {
    if (checkout.status === 'error') errorRef.current?.focus()
  }, [checkout.status, checkout.error])

  if (cart.items.length === 0 || !cart.templeId) {
    // Just placed: the effect above is moving to the receipt.
    if (submittedHere && checkout.lastOrder)
      return (
        <Navigate
          to={`/vazhipadu/orders/${checkout.lastOrder.orderNumber}`}
          replace
          state={{ justPlaced: true }}
        />
      )
    return (
      <div className="space-y-6">
        <PageHeading title={t('checkout.title')} />
        <EmptyState
          title={t('checkout.emptyCart')}
          action={
            <Link to="/vazhipadu" className={buttonVariants({ className: 'h-11 px-5' })}>
              {t('checkout.chooseOfferings')}
            </Link>
          }
        />
      </div>
    )
  }

  const templeId = cart.templeId
  const submitting = checkout.status === 'loading'
  const send = (v: OrderValues) => {
    setSubmittedHere(true)
    dispatch(
      orderSubmitted({
        templeId,
        items: cart.items.map((i) => ({ offeringId: i.offeringId, quantity: i.quantity })),
        devoteeName: v.devoteeName,
        phone: normalizePhone(v.phone) ?? v.phone,
        star: v.star as Nakshatra,
        offeringDate: v.offeringDate,
      }),
    )
  }
  const message = (name: keyof OrderInput) => {
    const e = errors[name]
    return e?.message ? t(e.message as MessageKey) : undefined
  }
  const summary = FIELDS.flatMap(([name, label]) => {
    const text = message(name)
    return text ? [{ fieldId: fieldId(name), label: t(label), message: text }] : []
  })

  return (
    <div className="space-y-6">
      <PageHeading title={t('checkout.title')} intro={t('checkout.intro')} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="checkout-details" className="min-w-0 space-y-4">
          <h2 id="checkout-details" className="text-xl font-semibold text-primary">
            {t('checkout.details')}
          </h2>
          <ErrorSummary errors={summary} submitCount={submitCount} />
          {checkout.status === 'error' && checkout.error && (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm outline-none"
            >
              <p className="flex items-center gap-2 font-medium text-destructive">
                <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
                {t('checkout.failedTitle')}
              </p>
              <p>{err(checkout.error)}</p>
              <p className="text-muted-foreground">{t('checkout.failedKept')}</p>
              {checkout.error.retryable && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={submitting}
                  onClick={() => void handleSubmit(send)()}
                >
                  {t('common.tryAgain')}
                </Button>
              )}
            </div>
          )}
          <form
            noValidate
            onSubmit={handleSubmit(send)}
            className="space-y-4 rounded-xl border bg-card p-5"
            aria-busy={submitting}
          >
            <FormField
              id={fieldId('devoteeName')}
              label={t('checkout.devoteeName')}
              error={message('devoteeName')}
            >
              {(control) => (
                <Input
                  {...control}
                  {...register('devoteeName')}
                  autoComplete="name"
                  className="h-11"
                />
              )}
            </FormField>
            <FormField id={fieldId('phone')} label={t('checkout.phone')} error={message('phone')}>
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
            <FormField id={fieldId('star')} label={t('checkout.star')} error={message('star')}>
              {(control) => (
                <NativeSelect {...control} {...register('star')}>
                  <option value="">{t('checkout.starPlaceholder')}</option>
                  {NAKSHATRAS.map((n) => (
                    <option key={n.id} value={n.id}>
                      {lang === 'ml' ? n.ml : n.id}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField
              id={fieldId('offeringDate')}
              label={t('checkout.date')}
              hint={t('checkout.dateHint', { max: MAX_DAYS_AHEAD })}
              error={message('offeringDate')}
            >
              {(control) => (
                <Input
                  {...control}
                  {...register('offeringDate')}
                  type="date"
                  min={today}
                  max={addDays(today, MAX_DAYS_AHEAD)}
                  className="h-11"
                />
              )}
            </FormField>
            <Button type="submit" className="h-11 w-full text-base" disabled={submitting}>
              {submitting && <Loader2 aria-hidden="true" className="animate-spin" />}
              {submitting
                ? t('checkout.placing')
                : t('checkout.place', { total: formatINR(total) })}
            </Button>
          </form>
        </section>

        <aside
          aria-labelledby="checkout-summary"
          className="min-w-0 space-y-3 self-start rounded-xl border bg-card p-4 lg:sticky lg:top-24"
        >
          <h2 id="checkout-summary" className="text-xl font-semibold text-primary">
            {t('checkout.summary')}
          </h2>
          <CartPanel idPrefix="checkout" hideCheckout />
          <Link
            to={`/vazhipadu?temple=${templeId}`}
            className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
          >
            {t('checkout.editCart')}
          </Link>
        </aside>
      </div>
    </div>
  )
}
