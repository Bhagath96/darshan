import { useEffect, useState } from 'react'
import { Info, Search, ShoppingBasket } from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router'
import { FormField } from '@/components/common/FormField'
import { NativeSelect } from '@/components/common/NativeSelect'
import { PageHeading } from '@/components/common/PageTitle'
import { Price } from '@/components/common/Price'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CartPanel } from '@/components/vazhipadu/CartPanel'
import { OfferingCard } from '@/components/vazhipadu/OfferingCard'
import { ReplaceCartDialog } from '@/components/vazhipadu/ReplaceCartDialog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { OFFERING_CATEGORIES } from '@/lib/constants'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { announce } from '@/store/ui/uiSlice'
import {
  itemAdded,
  selectCart,
  selectCartCount,
  selectCartTotal,
} from '@/store/vazhipadu/cartSlice'
import { offeringsRequested, selectOfferings } from '@/store/vazhipadu/offeringsSlice'
import type { Offering, OfferingCategory } from '@/types'

const ALL = 'ALL' as const
type CategoryTab = OfferingCategory | typeof ALL
const TABS: readonly CategoryTab[] = [ALL, ...OFFERING_CATEGORIES]
const isCategory = (v: string): v is OfferingCategory =>
  (OFFERING_CATEGORIES as readonly string[]).includes(v)

interface FixedLinkState {
  badLink: true
}

/** Case-insensitive "contains" on the English and Malayalam names. */
function matches(offering: Offering, q: string): boolean {
  const needle = q.trim().toLocaleLowerCase()
  if (!needle) return true
  return (
    offering.name.en.toLocaleLowerCase().includes(needle) ||
    offering.name.ml.toLocaleLowerCase().includes(needle)
  )
}

/** Search box: types freely, writes ?q= to the URL 200 ms after typing stops. */
function OfferingSearch({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const { t } = useT()
  const [text, setText] = useState(value)
  const debounced = useDebouncedValue(text, 200)
  const [lastUrlValue, setLastUrlValue] = useState(value)
  if (value !== lastUrlValue) {
    setLastUrlValue(value)
    setText(value)
  }
  useEffect(() => {
    if (debounced !== value) onSearch(debounced)
    // Only react to typing, not to the URL catching up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <FormField
      id="offering-search"
      label={t('vazhipadu.search')}
      className="min-w-0 flex-1 basis-56"
    >
      {(control) => (
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            {...control}
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-11 ps-9"
          />
        </div>
      )}
    </FormField>
  )
}

/** Phone width: total + "View cart" fixed to the bottom, opening the cart in a sheet. */
function MobileCartBar() {
  const { t } = useT()
  const count = useAppSelector(selectCartCount)
  const total = useAppSelector(selectCartTotal)
  const [open, setOpen] = useState(false)
  if (count === 0) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="text-sm">
          <p className="text-muted-foreground">{t('cart.items', { count })}</p>
          <Price amount={total} className="text-lg font-semibold" />
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button className="h-11 px-5">
              <ShoppingBasket aria-hidden="true" />
              {t('cart.view')}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            closeLabel={t('common.close')}
            className="max-h-[85dvh] overflow-y-auto px-4 pb-6"
          >
            <SheetHeader className="px-0">
              <SheetTitle>{t('cart.title')}</SheetTitle>
            </SheetHeader>
            <CartPanel idPrefix="sheet" onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}

export function VazhipaduPage() {
  const { t, pick, err } = useT()
  const dispatch = useAppDispatch()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const temples = useTemples()
  const offerings = useAppSelector(selectOfferings)
  const cart = useAppSelector(selectCart)
  const [pending, setPending] = useState<Offering | null>(null)

  const templeParam = params.get('temple') ?? ''
  const q = params.get('q') ?? ''
  const categoryParam = params.get('category') ?? ''
  const ready = temples.status === 'success'
  const validTemple = temples.data.some((x) => x.id === templeParam)
  const category: CategoryTab = isCategory(categoryParam) ? categoryParam : ALL
  const badLink = (location.state as FixedLinkState | null)?.badLink === true

  // Default temple: the cart's temple, else the first one. Unknown temple/category → reset with a notice.
  useEffect(() => {
    if (!ready) return
    const badCategory = categoryParam !== '' && !isCategory(categoryParam)
    if (validTemple && !badCategory) return
    const fallback = cart.templeId ?? temples.data[0]?.id
    if (!fallback) return
    const next = new URLSearchParams(params)
    next.set('temple', validTemple ? templeParam : fallback)
    if (badCategory) next.delete('category')
    const bad = (templeParam !== '' && !validTemple) || badCategory
    setParams(next, {
      replace: true,
      state: bad ? ({ badLink: true } satisfies FixedLinkState) : null,
    })
  }, [
    ready,
    validTemple,
    templeParam,
    categoryParam,
    cart.templeId,
    temples.data,
    params,
    setParams,
  ])

  useEffect(() => {
    if (validTemple) dispatch(offeringsRequested(templeParam))
  }, [dispatch, validTemple, templeParam])

  const update = (patch: Record<string, string>, replace = false) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace })
  }

  const visible = offerings.data.filter(
    (o) => o.isActive && (category === ALL || o.category === category) && matches(o, q),
  )

  const add = (offering: Offering) => {
    if (cart.templeId && cart.templeId !== offering.templeId) {
      setPending(offering)
      return
    }
    dispatch(itemAdded(offering))
    dispatch(announce(t('vazhipadu.added', { name: pick(offering.name) })))
  }
  const inCart = (id: string) => cart.items.find((i) => i.offeringId === id)?.quantity ?? 0

  const results =
    offerings.status === 'error' && offerings.error ? (
      <ErrorState
        message={err(offerings.error)}
        onRetry={() => dispatch(offeringsRequested(templeParam))}
      />
    ) : offerings.status !== 'success' && offerings.data.length === 0 ? (
      <LoadingState rows={3} />
    ) : visible.length === 0 ? (
      q ? (
        <EmptyState
          title={t('vazhipadu.noMatch', { q })}
          action={
            <Button variant="outline" className="h-11" onClick={() => update({ q: '' })}>
              {t('vazhipadu.clearSearch')}
            </Button>
          }
        />
      ) : (
        <EmptyState title={t('vazhipadu.empty')} />
      )
    ) : (
      <div className="space-y-3">
        <p role="status" className="text-sm text-muted-foreground">
          {visible.length === 1
            ? t('vazhipadu.resultsOne')
            : t('vazhipadu.results', { count: visible.length })}
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((o) => (
            <li key={o.id}>
              <OfferingCard offering={o} inCart={inCart(o.id)} onAdd={() => add(o)} />
            </li>
          ))}
        </ul>
      </div>
    )

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <PageHeading title={t('vazhipadu.title')} intro={t('vazhipadu.intro')} />

      {badLink && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border bg-secondary/50 p-3 text-sm"
        >
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t('vazhipadu.badLink')}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          {temples.status === 'error' && temples.error ? (
            <ErrorState message={err(temples.error)} onRetry={temples.retry} />
          ) : (
            <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4">
              <FormField
                id="vazhipadu-temple"
                label={t('vazhipadu.temple')}
                className="min-w-0 flex-1 basis-56"
              >
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={validTemple ? templeParam : ''}
                    disabled={!ready}
                    onChange={(e) => update({ temple: e.target.value, q: '', category: '' })}
                  >
                    {!ready && <option value="">{t('common.loading')}</option>}
                    {temples.data.map((x) => (
                      <option key={x.id} value={x.id}>
                        {pick(x.name)}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <OfferingSearch value={q} onSearch={(text) => update({ q: text }, true)} />
            </div>
          )}

          <Tabs value={category} onValueChange={(v) => update({ category: v === ALL ? '' : v })}>
            <TabsList
              aria-label={t('vazhipadu.categories')}
              className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0"
            >
              {TABS.map((c) => (
                <TabsTrigger
                  key={c}
                  value={c}
                  className="h-11 flex-none rounded-full border border-border bg-card px-4 data-active:border-primary data-active:bg-primary data-active:text-primary-foreground"
                >
                  {c === ALL ? t('vazhipadu.all') : t(`category.${c}`)}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={category} className="pt-2">
              {results}
            </TabsContent>
          </Tabs>
        </div>

        <aside
          aria-labelledby="cart-heading"
          className="hidden self-start rounded-xl border bg-card p-4 lg:sticky lg:top-24 lg:block"
        >
          <h2 id="cart-heading" className="mb-2 text-xl font-semibold text-primary">
            {t('cart.title')}
          </h2>
          <CartPanel idPrefix="aside" />
        </aside>
      </div>

      <MobileCartBar />
      <ReplaceCartDialog offering={pending} onClose={() => setPending(null)} />
    </div>
  )
}
