import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { EditorDialog } from '@/components/admin/EditorDialog'
import {
  AddButton,
  BilingualField,
  DeleteButton,
  EditButton,
  ImageField,
} from '@/components/admin/fields'
import { FormField } from '@/components/common/FormField'
import { PageHeading } from '@/components/common/PageTitle'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFieldMessage } from '@/hooks/useFieldMessage'
import { useTemples } from '@/hooks/useTemples'
import { useT, type MessageKey } from '@/i18n'
import { MAX_SCHEDULE_ITEMS, TEMPLE_ABOUT_MAX, TEMPLE_TEXT_MAX } from '@/lib/constants'
import { imageFor } from '@/lib/images'
import { z } from '@/lib/zod'
import { templeDeleteRequested, templeSaveRequested } from '@/store/admin/manageActions'
import { useAppDispatch } from '@/store/hooks'
import type { Temple } from '@/types'

const key = (k: MessageKey) => k
const text = (max: number) =>
  z.string().trim().min(1, key('manage.required')).max(max, key('manage.tooLong'))
const short = text(TEMPLE_TEXT_MAX)
const long = text(TEMPLE_ABOUT_MAX)

const templeSchema = z.object({
  nameEn: short,
  nameMl: short,
  locationEn: short,
  locationMl: short,
  deityEn: short,
  deityMl: short,
  aboutEn: long,
  aboutMl: long,
  addressEn: long,
  addressMl: long,
  timings: short,
  contactPhone: z
    .string()
    .trim()
    .regex(/^\+?[\d -]{6,20}$/, key('manage.contactPhoneInvalid')),
  image: z.string().min(1),
  schedule: z
    .array(
      z.object({
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, key('manage.timeInvalid')),
        nameEn: short,
        nameMl: short,
      }),
    )
    .max(MAX_SCHEDULE_ITEMS),
  addStandardSlots: z.boolean(),
})
type TempleValues = z.infer<typeof templeSchema>

function toValues(temple: Temple | undefined): TempleValues {
  return {
    nameEn: temple?.name.en ?? '',
    nameMl: temple?.name.ml ?? '',
    locationEn: temple?.location.en ?? '',
    locationMl: temple?.location.ml ?? '',
    deityEn: temple?.deity.en ?? '',
    deityMl: temple?.deity.ml ?? '',
    aboutEn: temple?.about.en ?? '',
    aboutMl: temple?.about.ml ?? '',
    addressEn: temple?.address.en ?? '',
    addressMl: temple?.address.ml ?? '',
    timings: temple?.timings ?? '',
    contactPhone: temple?.contactPhone ?? '',
    image: temple?.image ?? 'temple-krishna',
    schedule:
      temple?.schedule.map((s) => ({ time: s.time, nameEn: s.name.en, nameMl: s.name.ml })) ?? [],
    addStandardSlots: true,
  }
}

function TempleForm({ formId, temple }: { formId: string; temple?: Temple }) {
  const { t } = useT()
  const dispatch = useAppDispatch()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TempleValues>({
    resolver: zodResolver(templeSchema),
    defaultValues: toValues(temple),
  })
  const schedule = useFieldArray({ control, name: 'schedule' })
  const image = useWatch({ control, name: 'image' })
  const message = useFieldMessage(errors)

  const onSubmit = handleSubmit((v) =>
    dispatch(
      templeSaveRequested({
        id: temple?.id,
        addStandardSlots: v.addStandardSlots,
        input: {
          name: { en: v.nameEn, ml: v.nameMl },
          location: { en: v.locationEn, ml: v.locationMl },
          deity: { en: v.deityEn, ml: v.deityMl },
          about: { en: v.aboutEn, ml: v.aboutMl },
          address: { en: v.addressEn, ml: v.addressMl },
          timings: v.timings,
          contactPhone: v.contactPhone,
          image: v.image,
          schedule: v.schedule.map((s) => ({ time: s.time, name: { en: s.nameEn, ml: s.nameMl } })),
        },
      }),
    ),
  )

  const bilingual = (
    id: string,
    label: MessageKey,
    base: 'name' | 'location' | 'deity' | 'about' | 'address',
    multiline = false,
  ) => (
    <BilingualField
      id={`temple-${id}`}
      label={t(label)}
      en={register(`${base}En`)}
      ml={register(`${base}Ml`)}
      errorEn={message(`${base}En`)}
      errorMl={message(`${base}Ml`)}
      multiline={multiline}
    />
  )

  return (
    <form id={formId} noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {bilingual('name', 'manage.templeName', 'name')}
      {bilingual('location', 'manage.location', 'location')}
      {bilingual('deity', 'manage.deity', 'deity')}
      {bilingual('about', 'manage.about', 'about', true)}
      {bilingual('address', 'manage.address', 'address', true)}
      <FormField
        id="temple-timings"
        label={t('manage.timings')}
        hint={t('manage.timingsHint')}
        error={message('timings')}
      >
        {(c) => <Input {...c} {...register('timings')} className="h-11" />}
      </FormField>
      <FormField id="temple-phone" label={t('manage.contactPhone')} error={message('contactPhone')}>
        {(c) => <Input {...c} {...register('contactPhone')} type="tel" className="h-11" />}
      </FormField>
      <ImageField id="temple-image" value={image} register={register('image')} />

      <fieldset className="space-y-3 sm:col-span-2">
        <legend className="text-sm font-medium">{t('manage.schedule')}</legend>
        {schedule.fields.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('manage.scheduleEmpty')}</p>
        )}
        {schedule.fields.map((field, i) => (
          <div
            key={field.id}
            className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[7rem_1fr_1fr_auto] sm:items-start"
          >
            <FormField
              id={`schedule-${i}-time`}
              label={t('manage.time')}
              error={message(`schedule.${i}.time`)}
            >
              {(c) => (
                <Input {...c} {...register(`schedule.${i}.time`)} type="time" className="h-11" />
              )}
            </FormField>
            <FormField
              id={`schedule-${i}-en`}
              label={t('manage.inEnglish', { label: t('manage.pooja') })}
              error={message(`schedule.${i}.nameEn`)}
            >
              {(c) => (
                <Input {...c} {...register(`schedule.${i}.nameEn`)} lang="en" className="h-11" />
              )}
            </FormField>
            <FormField
              id={`schedule-${i}-ml`}
              label={t('manage.inMalayalam', { label: t('manage.pooja') })}
              error={message(`schedule.${i}.nameMl`)}
            >
              {(c) => (
                <Input {...c} {...register(`schedule.${i}.nameMl`)} lang="ml" className="h-11" />
              )}
            </FormField>
            <Button
              type="button"
              variant="ghost"
              className="h-11 sm:mt-6"
              aria-label={t('manage.removePooja', { n: i + 1 })}
              onClick={() => schedule.remove(i)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        ))}
        {schedule.fields.length < MAX_SCHEDULE_ITEMS && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => schedule.append({ time: '06:00', nameEn: '', nameMl: '' })}
          >
            <Plus aria-hidden="true" />
            {t('manage.addPooja')}
          </Button>
        )}
      </fieldset>

      {!temple && (
        <div className="flex items-start gap-3 sm:col-span-2">
          <input
            id="temple-slots"
            type="checkbox"
            {...register('addStandardSlots')}
            className="mt-0.5 size-5 accent-primary"
          />
          <label htmlFor="temple-slots" className="text-sm">
            {t('manage.addStandardSlots')}
          </label>
        </div>
      )}
    </form>
  )
}

function TempleCard({ temple }: { temple: Temple }) {
  const { t, pick } = useT()
  const dispatch = useAppDispatch()
  const name = pick(temple.name)
  return (
    <li className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
      <img
        src={imageFor(temple.image)}
        alt=""
        className="h-24 w-full shrink-0 rounded-lg object-cover sm:size-20"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">{name}</p>
        <p className="text-sm text-muted-foreground">
          {pick(temple.deity)} · {pick(temple.location)}
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">{temple.contactPhone}</p>
      </div>
      <div className="flex items-center gap-1">
        <EditorDialog
          wide
          trigger={<EditButton label={t('manage.editOf', { name })} />}
          title={t('manage.editTemple')}
          submitLabel={t('common.save')}
        >
          {(formId) => <TempleForm formId={formId} temple={temple} />}
        </EditorDialog>
        <DeleteButton
          label={t('manage.deleteOf', { name })}
          title={t('manage.deleteTempleTitle', { name })}
          description={t('manage.deleteTempleText')}
          onConfirm={() => dispatch(templeDeleteRequested(temple.id))}
        />
      </div>
    </li>
  )
}

export function AdminTemplesPage() {
  const { t, err } = useT()
  const temples = useTemples()

  return (
    <div className="space-y-6">
      <PageHeading title={t('manage.templesTitle')} intro={t('manage.templesIntro')} />
      <EditorDialog
        wide
        trigger={<AddButton>{t('manage.addTemple')}</AddButton>}
        title={t('manage.addTemple')}
        submitLabel={t('manage.create')}
      >
        {(formId) => <TempleForm formId={formId} />}
      </EditorDialog>

      {temples.status === 'error' && temples.error ? (
        <ErrorState message={err(temples.error)} onRetry={temples.retry} />
      ) : temples.status !== 'success' ? (
        <LoadingState rows={3} />
      ) : temples.data.length === 0 ? (
        <EmptyState title={t('manage.templesEmpty')} />
      ) : (
        <ul className="space-y-3">
          {temples.data.map((temple) => (
            <TempleCard key={temple.id} temple={temple} />
          ))}
        </ul>
      )}
    </div>
  )
}
