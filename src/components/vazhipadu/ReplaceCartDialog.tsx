import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { announce } from '@/store/ui/uiSlice'
import { cartReplacedWith, selectCart } from '@/store/vazhipadu/cartSlice'
import type { Offering } from '@/types'

/** One temple per order: asks before swapping a cart from another temple for this offering. */
export function ReplaceCartDialog({
  offering,
  onClose,
}: {
  offering: Offering | null
  onClose: () => void
}) {
  const { t, pick } = useT()
  const dispatch = useAppDispatch()
  const cart = useAppSelector(selectCart)
  const temples = useTemples()
  const cartTemple = temples.data.find((x) => x.id === cart.templeId)

  return (
    <AlertDialog open={offering !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">{t('vazhipadu.replaceTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {offering &&
              t('vazhipadu.replaceText', {
                temple: cartTemple ? pick(cartTemple.name) : '',
                name: pick(offering.name),
              })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 px-4">{t('vazhipadu.replaceKeep')}</AlertDialogCancel>
          <AlertDialogAction
            className="h-11 px-4"
            onClick={() => {
              if (!offering) return
              dispatch(cartReplacedWith(offering))
              dispatch(announce(t('vazhipadu.added', { name: pick(offering.name) })))
            }}
          >
            {t('vazhipadu.replaceConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
