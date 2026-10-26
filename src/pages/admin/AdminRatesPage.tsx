import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { EditorDialog } from '@/components/admin/EditorDialog'
import {
  AddButton,
  BilingualField,
  DeleteButton,
  EditButton,
  ImageField,
} from '@/components/admin/fields'
import { RBody, RCell, RHead, RHeader, RRow, RTable } from '@/components/admin/ResponsiveTable'
import { TempleScopeField } from '@/components/admin/TempleScopeField'
import { FormField } from '@/components/common/FormField'
import { NativeSelect } from '@/components/common/NativeSelect'
import { PageHeading } from '@/components/common/PageTitle'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useFieldMessage } from '@/hooks/useFieldMessage'
import { useManagedTempleId } from '@/hooks/useManagedTempleId'
import { useQueryParams } from '@/hooks/useQueryParams'
import { useT, type MessageKey } from '@/i18n'
import {
  MAX_OFFERING_PRICE,
  OFFERING_CATEGORIES,
  OFFERING_DESCRIPTION_MAX,
  OFFERING_NAME_MAX,
} from '@/lib/constants'
import { z } from '@/lib/zod'
import { offeringDeleteRequested, offeringSaveRequested } from '@/store/admin/manageActions'
import {
  adminOfferingsRequested,
  offeringUpdateRequested,
  selectAdminOfferings,
} from '@/store/admin/catalogSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { Offering } from '@/types'

const key = (k: MessageKey) => k
const text = (max: number) =>
  z.string().trim().min(1, key('manage.required')).max(max, key('manage.tooLong'))

const offeringSchema = z.object({
  nameEn: text(OFFERING_NAME_MAX),
  nameMl: text(OFFERING_NAME_MAX),
  descriptionEn: text(OFFERING_DESCRIPTION_MAX),
  descriptionMl: text(OFFERING_DESCRIPTION_MAX),
  price: z
    .string()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= MAX_OFFERING_PRICE, {
      message: key('manage.priceInvalid'),
    }),
  category: z.enum(OFFERING_CATEGORIES),
  image: z.string().min(1),
  isActive: z.boolean(),
})
type OfferingValues = z.infer<typeof offeringSchema>

function OfferingForm({
  formId,
  templeId,
  offering,
}: {
  formId: string
  templeId: string
  offering?: Offering
}) {
  const { t } = useT()
  const dispatch = useAppDispatch()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<OfferingValues>({
    resolver: zodResolver(offeringSchema),
    defaultValues: {
      nameEn: offering?.name.en ?? '',
      nameMl: offering?.name.ml ?? '',
      descriptionEn: offering?.description.en ?? '',
      descriptionMl: offering?.description.ml ?? '',
      price: offering ? String(offering.price) : '',
      category: offering?.category ?? 'POOJA',
      image: offering?.image ?? 'pushpanjali',
      isActive: offering?.isActive ?? true,
    },
  })
  const image = useWatch({ control, name: 'image' })
  const message = useFieldMessage(errors)

  const onSubmit = handleSubmit((v) =>
    dispatch(
      offeringSaveRequested({
        id: offering?.id,
        input: {
          templeId: offering?.templeId ?? templeId,
          name: { en: v.nameEn, ml: v.nameMl },
          description: { en: v.descriptionEn, ml: v.descriptionMl },
          price: Number(v.price),
          category: v.category,
          image: v.image,
          isActive: v.isActive,
        },
      }),
    ),
  )

  return (
    <form id={formId} noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <BilingualField
        id="offering-name"
        label={t('manage.offeringName')}
        en={register('nameEn')}
        ml={register('nameMl')}
        errorEn={message('nameEn')}
        errorMl={message('nameMl')}
      />
      <BilingualField
        id="offering-description"
        label={t('manage.description')}
        en={register('descriptionEn')}
        ml={register('descriptionMl')}
        errorEn={message('descriptionEn')}
        errorMl={message('descriptionMl')}
        multiline
      />
      <FormField id="offering-price" label={t('adminRates.price')} error={message('price')}>
        {(c) => (
          <Input
            {...c}
            {...register('price')}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            className="h-11"
          />
        )}
      </FormField>
      <FormField id="offering-category" label={t('adminRates.category')}>
        {(c) => (
          <NativeSelect {...c} {...register('category')}>
            {OFFERING_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {t(`category.${cat}`)}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <ImageField id="offering-image" value={image} register={register('image')} />
      <div className="flex items-start gap-3 self-end pb-3">
        <input
          id="offering-active"
          type="checkbox"
          {...register('isActive')}
          className="mt-0.5 size-5 accent-primary"
        />
        <label htmlFor="offering-active" className="text-sm font-medium">
          {t('manage.offeringActive')}
        </label>
      </div>
    </form>
  )
}

function OfferingRow({ offering }: { offering: Offering }) {
  const { t, pick } = useT()
  const dispatch = useAppDispatch()
  const saving = useAppSelector((s) => offering.id in s.adminCatalog.offerings.saving)
  const [price, setPrice] = useState(String(offering.price))
  const [error, setError] = useState<string | null>(null)
  const name = pick(offering.name)

  const save = () => {
    const value = Number(price)
    if (!Number.isInteger(value) || value < 1 || value > MAX_OFFERING_PRICE) {
      setError(t('adminRates.priceInvalid', { max: MAX_OFFERING_PRICE.toLocaleString('en-IN') }))
      return
    }
    setError(null)
    dispatch(offeringUpdateRequested({ offeringId: offering.id, price: value }))
  }

  return (
    <RRow className={offering.isActive ? undefined : 'bg-muted/40'}>
      <RCell label={t('adminRates.offering')} className="font-medium">
        {name}
      </RCell>
      <RCell label={t('adminRates.category')}>{t(`category.${offering.category}`)}</RCell>
      <RCell label={t('adminRates.price')}>
        <form
          noValidate
          className="flex items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <div className="space-y-1">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_OFFERING_PRICE}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-label={t('adminRates.priceOf', { name })}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${offering.id}-error` : undefined}
              className="h-11 w-28"
            />
            {error && (
              <p
                id={`${offering.id}-error`}
                className="max-w-48 text-xs font-medium text-destructive"
              >
                {error}
              </p>
            )}
          </div>
          <Button
            type="submit"
            variant="outline"
            className="h-11 px-3"
            disabled={saving || price === String(offering.price)}
            aria-label={t('adminRates.saveOf', { name })}
          >
            {t('common.save')}
          </Button>
        </form>
      </RCell>
      <RCell label={t('adminRates.available')}>
        <span className="flex min-h-11 items-center gap-3">
          <Switch
            checked={offering.isActive}
            disabled={saving}
            aria-label={t('adminRates.availableOf', { name })}
            onCheckedChange={(isActive) =>
              dispatch(offeringUpdateRequested({ offeringId: offering.id, isActive }))
            }
          />
          <span className="text-sm text-muted-foreground" aria-hidden="true">
            {offering.isActive ? t('adminRates.available') : t('adminRates.hidden')}
          </span>
        </span>
      </RCell>
      <RCell className="max-md:justify-end">
        <span className="flex flex-wrap justify-end gap-2 md:justify-start">
          <EditorDialog
            wide
            trigger={<EditButton label={t('manage.editOf', { name })} disabled={saving} />}
            title={t('manage.editOffering')}
            submitLabel={t('common.save')}
          >
            {(formId) => (
              <OfferingForm formId={formId} templeId={offering.templeId} offering={offering} />
            )}
          </EditorDialog>
          <DeleteButton
            label={t('manage.deleteOf', { name })}
            title={t('manage.deleteOfferingTitle', { name })}
            description={t('manage.deleteOfferingText')}
            disabled={saving}
            onConfirm={() => dispatch(offeringDeleteRequested(offering.id))}
          />
        </span>
      </RCell>
    </RRow>
  )
}

export function AdminRatesPage() {
  const { t, err } = useT()
  const dispatch = useAppDispatch()
  const offerings = useAppSelector(selectAdminOfferings)
  const { update } = useQueryParams()
  const templeId = useManagedTempleId()

  const load = () => {
    if (templeId) dispatch(adminOfferingsRequested(templeId))
  }
  useEffect(() => {
    load()
    // `load` reads exactly this value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templeId])

  return (
    <div className="space-y-6">
      <PageHeading title={t('adminRates.title')} intro={t('adminRates.intro')} />
      <form
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2"
      >
        <TempleScopeField
          id="rates-temple"
          value={templeId}
          onChange={(id) => update({ temple: id })}
        />
      </form>
      {templeId && (
        <EditorDialog
          wide
          trigger={<AddButton>{t('manage.addOffering')}</AddButton>}
          title={t('manage.addOffering')}
          submitLabel={t('manage.create')}
        >
          {(formId) => <OfferingForm formId={formId} templeId={templeId} />}
        </EditorDialog>
      )}

      {offerings.status === 'error' && offerings.error ? (
        <ErrorState message={err(offerings.error)} onRetry={load} />
      ) : offerings.status !== 'success' ? (
        <LoadingState rows={5} />
      ) : offerings.data.length === 0 ? (
        <EmptyState title={t('adminRates.empty')} />
      ) : (
        <RTable>
          <RHead>
            <tr role="row">
              <RHeader>{t('adminRates.offering')}</RHeader>
              <RHeader>{t('adminRates.category')}</RHeader>
              <RHeader>{t('adminRates.price')}</RHeader>
              <RHeader>{t('adminRates.available')}</RHeader>
              <RHeader>{t('common.actions')}</RHeader>
            </tr>
          </RHead>
          <RBody>
            {offerings.data.map((o) => (
              <OfferingRow key={`${o.id}-${o.price}`} offering={o} />
            ))}
          </RBody>
        </RTable>
      )}
    </div>
  )
}
