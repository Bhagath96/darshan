import { ShoppingBasket } from 'lucide-react'
import { Link } from 'react-router'
import { useT } from '@/i18n'
import { useAppSelector } from '@/store/hooks'
import { selectCartCount } from '@/store/vazhipadu/cartSlice'

/** Header shortcut to the cart, shown only while it has something in it. */
export function CartButton() {
  const { t } = useT()
  const count = useAppSelector(selectCartCount)
  if (count === 0) return null
  return (
    <Link
      to="/vazhipadu/checkout"
      aria-label={t('nav.cartCount', { count })}
      className="relative inline-flex size-11 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted"
    >
      <ShoppingBasket aria-hidden="true" className="size-5" />
      <span
        aria-hidden="true"
        className="absolute -top-1 -end-1 grid min-w-5 place-items-center rounded-full bg-success px-1 text-xs leading-5 font-semibold text-white tabular-nums"
      >
        {count > 9 ? '9+' : count}
      </span>
    </Link>
  )
}
