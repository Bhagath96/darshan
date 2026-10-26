import { Minus, Plus, ShoppingBasket, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { Price } from '@/components/common/Price'
import { Button, buttonVariants } from '@/components/ui/button'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { MAX_QUANTITY, MIN_QUANTITY } from '@/lib/constants'
import { formatINR } from '@/lib/currency'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { announce } from '@/store/ui/uiSlice'
import { itemRemoved, quantitySet, selectCart, selectCartTotal } from '@/store/vazhipadu/cartSlice'
import type { CartItem } from '@/types'

function CartLine({ item, idPrefix }: { item: CartItem; idPrefix: string }) {
  const { t, pick } = useT()
  const dispatch = useAppDispatch()
  const name = pick(item.name)
  const setQty = (quantity: number) =>
    dispatch(quantitySet({ offeringId: item.offeringId, quantity }))
  const inputId = `${idPrefix}-${item.offeringId}`

  return (
    <li className="space-y-2 border-b py-3 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 font-medium">{name}</span>
        <Price amount={item.unitPrice * item.quantity} className="font-medium" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-lg"
            className="size-11"
            aria-label={t('cart.decrease', { name })}
            disabled={item.quantity <= MIN_QUANTITY}
            onClick={() => setQty(item.quantity - 1)}
          >
            <Minus aria-hidden="true" />
          </Button>
          <label htmlFor={inputId} className="sr-only">
            {t('cart.quantity', { name })}
          </label>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={MIN_QUANTITY}
            max={MAX_QUANTITY}
            value={item.quantity}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (e.target.value !== '' && Number.isFinite(n)) setQty(n)
            }}
            className="h-11 w-14 rounded-lg border border-input bg-card text-center text-base tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button
            variant="outline"
            size="icon-lg"
            className="size-11"
            aria-label={t('cart.increase', { name })}
            disabled={item.quantity >= MAX_QUANTITY}
            onClick={() => setQty(item.quantity + 1)}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {t('cart.lineTotal', { qty: item.quantity, price: formatINR(item.unitPrice) })}
        </span>
        <Button
          variant="ghost"
          className="h-11 px-2 text-destructive"
          aria-label={t('cart.remove', { name })}
          onClick={() => {
            dispatch(itemRemoved(item.offeringId))
            dispatch(announce(t('cart.removed', { name })))
          }}
        >
          <Trash2 aria-hidden="true" />
          <span className="hidden sm:inline">{t('cart.removeShort')}</span>
        </Button>
      </div>
    </li>
  )
}

interface CartPanelProps {
  /** Unique per place the panel is shown, so input ids don't clash. */
  idPrefix: string
  /** Hide the "Continue" link (on the checkout page itself). */
  hideCheckout?: boolean
  onNavigate?: () => void
}

/** Cart lines with quantity steppers, the total, and the way to checkout. */
export function CartPanel({ idPrefix, hideCheckout = false, onNavigate }: CartPanelProps) {
  const { t, pick } = useT()
  const cart = useAppSelector(selectCart)
  const total = useAppSelector(selectCartTotal)
  const temples = useTemples()
  const temple = temples.data.find((x) => x.id === cart.templeId)

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
        <ShoppingBasket aria-hidden="true" className="size-8" />
        <p className="font-medium text-foreground">{t('cart.empty')}</p>
        <p>{t('cart.emptyHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {temple && (
        <p className="text-sm text-muted-foreground">
          {t('cart.forTemple', { temple: pick(temple.name) })}
        </p>
      )}
      <ul>
        {cart.items.map((item) => (
          <CartLine key={item.offeringId} item={item} idPrefix={idPrefix} />
        ))}
      </ul>
      <div className="flex items-center justify-between border-t pt-3 text-lg font-semibold">
        <span>{t('cart.total')}</span>
        <Price amount={total} />
      </div>
      {!hideCheckout && (
        <Link
          to="/vazhipadu/checkout"
          onClick={onNavigate}
          className={buttonVariants({ className: 'h-11 w-full text-base' })}
        >
          {t('cart.checkout')}
        </Link>
      )}
    </div>
  )
}
