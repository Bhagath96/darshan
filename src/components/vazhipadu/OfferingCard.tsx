import { Plus, ShoppingBasket } from 'lucide-react'
import { Price } from '@/components/common/Price'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { imageFor } from '@/lib/images'
import type { Offering } from '@/types'

interface OfferingCardProps {
  offering: Offering
  inCart: number
  onAdd: () => void
}

export function OfferingCard({ offering, inCart, onAdd }: OfferingCardProps) {
  const { t, pick } = useT()
  const name = pick(offering.name)
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <img
        src={imageFor(offering.image)}
        alt=""
        loading="lazy"
        decoding="async"
        width={480}
        height={270}
        className="aspect-[16/9] w-full object-cover"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg leading-snug font-semibold text-primary">{name}</h3>
          <Badge variant="secondary" className="shrink-0">
            {t(`category.${offering.category}`)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{pick(offering.description)}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Price amount={offering.price} className="text-xl font-semibold" />
          <Button className="h-11 px-4" onClick={onAdd} aria-label={t('vazhipadu.addOf', { name })}>
            <Plus aria-hidden="true" />
            {t('vazhipadu.add')}
          </Button>
        </div>
        {inCart > 0 && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-success">
            <ShoppingBasket aria-hidden="true" className="size-4" />
            {t('vazhipadu.inCart', { count: inCart })}
          </p>
        )}
      </div>
    </article>
  )
}
