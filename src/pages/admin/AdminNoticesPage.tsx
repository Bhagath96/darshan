import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from '@/lib/zod'
import { TempleScopeField } from '@/components/admin/TempleScopeField'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField } from '@/components/common/FormField'
import { NativeSelect } from '@/components/common/NativeSelect'
import { PageHeading } from '@/components/common/PageTitle'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { NoticeCategoryBadge, NoticeMeta } from '@/components/notices/NoticeCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useTemples } from '@/hooks/useTemples'
import { useT, type MessageKey } from '@/i18n'
import { NOTICE_BODY_MAX, NOTICE_CATEGORIES, NOTICE_TITLE_MAX } from '@/lib/constants'
import { isValidIsoDate } from '@/lib/date'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  noticeCreateRequested,
  noticeCreateReset,
  noticeDeleteRequested,
  noticesRequested,
  selectNoticeList,
} from '@/store/notices/noticesSlice'
import type { Notice, NoticeCategory } from '@/types'

const key = (k: MessageKey) => k
const title = z
  .string()
  .trim()
  .min(1, key('adminNotices.titleRequired'))
  .max(NOTICE_TITLE_MAX, key('adminNotices.titleTooLong'))
const body = z
  .string()
  .trim()
  .min(1, key('adminNotices.bodyRequired'))
  .max(NOTICE_BODY_MAX, key('adminNotices.bodyTooLong'))

const noticeSchema = z.object({
  templeId: z.string(),
  category: z.enum(NOTICE_CATEGORIES),
  important: z.boolean(),
  titleEn: title,
  titleMl: title,
  bodyEn: body,
  bodyMl: body,
  eventDate: z.string().refine((v) => v === '' || isValidIsoDate(v)),
})
type NoticeValues = z.infer<typeof noticeSchema>

function NewNoticeForm() {
  const { t, err } = useT()
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const create = useAppSelector((s) => s.notices.create)
  const defaults: NoticeValues = {
    templeId: user?.templeId ?? '',
    category: 'GENERAL',
    important: false,
    titleEn: '',
    titleMl: '',
    bodyEn: '',
    bodyMl: '',
    eventDate: '',
  }
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<NoticeValues>({ resolver: zodResolver(noticeSchema), defaultValues: defaults })
  const templeId = useWatch({ control, name: 'templeId' })

  useEffect(() => {
    dispatch(noticeCreateReset())
  }, [dispatch])

  // Clear the form once the notice is published.
  useEffect(() => {
    if (create.status === 'success') reset()
  }, [create.status, reset])

  const message = (field: keyof NoticeValues) => {
    const e = errors[field]
    return e?.message ? t(e.message as MessageKey) : undefined
  }
  const publishing = create.status === 'loading'

  const onSubmit = handleSubmit((v) =>
    dispatch(
      noticeCreateRequested({
        templeId: v.templeId || null,
        category: v.category,
        important: v.important,
        title: { en: v.titleEn, ml: v.titleMl },
        body: { en: v.bodyEn, ml: v.bodyMl },
        eventDate: v.eventDate || null,
      }),
    ),
  )

  return (
    <section aria-labelledby="new-notice" className="space-y-4 rounded-xl border bg-card p-5">
      <h2 id="new-notice" className="text-xl font-semibold text-primary">
        {t('adminNotices.new')}
      </h2>
      {create.status === 'error' && create.error && (
        <p role="alert" className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertTriangle aria-hidden="true" className="size-4" />
          {err(create.error)}
        </p>
      )}
      <form noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <TempleScopeField
          id="notice-temple"
          value={templeId}
          allowAll
          allLabel={t('adminNotices.allTemples')}
          onChange={(id) => setValue('templeId', id)}
        />
        <FormField id="notice-category" label={t('adminNotices.category')}>
          {(control) => (
            <NativeSelect {...control} {...register('category')}>
              {NOTICE_CATEGORIES.map((c: NoticeCategory) => (
                <option key={c} value={c}>
                  {t(`notices.category.${c}`)}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField
          id="notice-title-en"
          label={t('adminNotices.titleEn')}
          error={message('titleEn')}
        >
          {(control) => <Input {...control} {...register('titleEn')} lang="en" className="h-11" />}
        </FormField>
        <FormField
          id="notice-title-ml"
          label={t('adminNotices.titleMl')}
          error={message('titleMl')}
        >
          {(control) => <Input {...control} {...register('titleMl')} lang="ml" className="h-11" />}
        </FormField>
        <FormField id="notice-body-en" label={t('adminNotices.bodyEn')} error={message('bodyEn')}>
          {(control) => <Textarea {...control} {...register('bodyEn')} lang="en" rows={4} />}
        </FormField>
        <FormField id="notice-body-ml" label={t('adminNotices.bodyMl')} error={message('bodyMl')}>
          {(control) => <Textarea {...control} {...register('bodyMl')} lang="ml" rows={4} />}
        </FormField>
        <FormField id="notice-date" label={t('adminNotices.eventDate')}>
          {(control) => (
            <Input {...control} {...register('eventDate')} type="date" className="h-11" />
          )}
        </FormField>
        <div className="flex items-start gap-3 self-end pb-2">
          <input
            id="notice-important"
            type="checkbox"
            {...register('important')}
            aria-describedby="notice-important-hint"
            className="mt-0.5 size-5 accent-primary"
          />
          <div>
            <label htmlFor="notice-important" className="text-sm font-medium">
              {t('adminNotices.important')}
            </label>
            <p id="notice-important-hint" className="text-xs text-muted-foreground">
              {t('adminNotices.importantHint')}
            </p>
          </div>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" className="h-11 px-5" disabled={publishing}>
            {publishing && <Loader2 aria-hidden="true" className="animate-spin" />}
            {publishing ? t('adminNotices.publishing') : t('adminNotices.publish')}
          </Button>
        </div>
      </form>
    </section>
  )
}

function NoticeRow({ notice }: { notice: Notice }) {
  const { t, pick } = useT()
  const dispatch = useAppDispatch()
  const temples = useTemples()
  const noticeTitle = pick(notice.title)
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <NoticeCategoryBadge category={notice.category} />
          {notice.important && <Badge>{t('notices.important')}</Badge>}
        </div>
        <p className="font-medium">{noticeTitle}</p>
        <NoticeMeta notice={notice} temple={temples.data.find((x) => x.id === notice.templeId)} />
      </div>
      <ConfirmDialog
        trigger={
          <Button
            variant="destructive"
            className="h-11 shrink-0 px-3"
            aria-label={t('adminNotices.deleteOf', { title: noticeTitle })}
          >
            <Trash2 aria-hidden="true" />
            {t('adminNotices.delete')}
          </Button>
        }
        title={t('adminNotices.confirmTitle')}
        description={t('adminNotices.confirmText', { title: noticeTitle })}
        confirmLabel={t('adminNotices.confirm')}
        cancelLabel={t('adminNotices.keep')}
        onConfirm={() => dispatch(noticeDeleteRequested(notice.id))}
      />
    </li>
  )
}

export function AdminNoticesPage() {
  const { t, err } = useT()
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const list = useAppSelector(selectNoticeList)

  // Staff see their temple's notices; admins see everything.
  const load = () => dispatch(noticesRequested({ templeId: user?.templeId ?? undefined }))
  useEffect(() => {
    load()
    // `load` reads exactly this value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.templeId])

  // Staff can't delete notices meant for all temples, so don't offer it.
  const manageable = list.data.filter((n) => !user?.templeId || n.templeId === user.templeId)

  return (
    <div className="space-y-6">
      <PageHeading title={t('adminNotices.title')} intro={t('adminNotices.intro')} />
      <NewNoticeForm />
      <section aria-labelledby="notice-list" className="space-y-3">
        <h2 id="notice-list" className="text-xl font-semibold text-primary">
          {t('adminNotices.list')}
        </h2>
        {list.status === 'error' && list.error ? (
          <ErrorState message={err(list.error)} onRetry={load} />
        ) : list.status !== 'success' ? (
          <LoadingState rows={3} />
        ) : manageable.length === 0 ? (
          <EmptyState title={t('adminNotices.empty')} />
        ) : (
          <ul className="space-y-3">
            {manageable.map((n) => (
              <NoticeRow key={n.id} notice={n} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
