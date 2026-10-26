import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from '@/lib/zod'
import { FormField } from '@/components/common/FormField'
import { PageHeading } from '@/components/common/PageTitle'
import { RoleBadge } from '@/components/common/UserMenu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTemples } from '@/hooks/useTemples'
import { useT, type MessageKey } from '@/i18n'
import { nameSchema, newPasswordSchema, phoneSchema, requiredSchema } from '@/lib/schemas'
import {
  accountFormsReset,
  passwordChangeRequested,
  profileUpdateRequested,
  selectAuth,
  type FormRequest,
} from '@/store/auth/authSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { AuthUser } from '@/types'

/** Inline result line under a form: saved, or the server's error. */
function FormResult({ request, successText }: { request: FormRequest; successText: string }) {
  const { err } = useT()
  if (request.status === 'success') {
    return (
      <p role="status" className="flex items-center gap-2 text-sm font-medium text-success">
        <CheckCircle2 aria-hidden="true" className="size-4" />
        {successText}
      </p>
    )
  }
  if (request.status === 'error' && request.error) {
    return (
      <p role="alert" className="flex items-center gap-2 text-sm font-medium text-destructive">
        <AlertTriangle aria-hidden="true" className="size-4" />
        {err(request.error)}
      </p>
    )
  }
  return null
}

const profileSchema = z.object({ name: nameSchema, phone: phoneSchema })
type ProfileInput = z.input<typeof profileSchema>
type ProfileValues = z.output<typeof profileSchema>

function ProfileForm({ user }: { user: AuthUser }) {
  const { t } = useT()
  const dispatch = useAppDispatch()
  const request = useAppSelector((s) => s.auth.profile)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput, unknown, ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, phone: user.phone },
  })
  const saving = request.status === 'loading'

  return (
    <section aria-labelledby="account-profile" className="space-y-4 rounded-xl border bg-card p-5">
      <h2 id="account-profile" className="text-xl font-semibold text-primary">
        {t('account.profile')}
      </h2>
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) => dispatch(profileUpdateRequested(values)))}
      >
        <FormField
          id="account-name"
          label={t('register.name')}
          error={errors.name && t(errors.name.message as MessageKey)}
        >
          {(control) => (
            <Input {...control} {...register('name')} autoComplete="name" className="h-11" />
          )}
        </FormField>
        <FormField
          id="account-phone"
          label={t('register.phone')}
          hint={t('register.phoneHint')}
          error={errors.phone && t(errors.phone.message as MessageKey)}
        >
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
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" className="h-11 px-5" disabled={saving}>
            {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
            {saving ? t('account.saving') : t('account.save')}
          </Button>
          <FormResult request={request} successText={t('account.saved')} />
        </div>
      </form>
    </section>
  )
}

const passwordSchema = z
  .object({
    currentPassword: requiredSchema,
    newPassword: newPasswordSchema,
    confirmPassword: requiredSchema,
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'validation.passwordMismatch' satisfies MessageKey,
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'validation.passwordSame' satisfies MessageKey,
  })
type PasswordValues = z.infer<typeof passwordSchema>

function PasswordForm() {
  const { t } = useT()
  const dispatch = useAppDispatch()
  const request = useAppSelector((s) => s.auth.password)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const saving = request.status === 'loading'

  // Clear the fields once the change went through.
  useEffect(() => {
    if (request.status === 'success') reset()
  }, [request.status, reset])

  const message = (key: keyof PasswordValues) => errors[key] && t(errors[key].message as MessageKey)

  return (
    <section aria-labelledby="account-password" className="space-y-4 rounded-xl border bg-card p-5">
      <h2 id="account-password" className="text-xl font-semibold text-primary">
        {t('account.passwordTitle')}
      </h2>
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(({ currentPassword, newPassword }) =>
          dispatch(passwordChangeRequested({ currentPassword, newPassword })),
        )}
      >
        <FormField
          id="account-current-password"
          label={t('account.currentPassword')}
          error={message('currentPassword')}
        >
          {(control) => (
            <Input
              {...control}
              {...register('currentPassword')}
              type="password"
              autoComplete="current-password"
              className="h-11"
            />
          )}
        </FormField>
        <FormField
          id="account-new-password"
          label={t('account.newPassword')}
          hint={t('register.passwordHint')}
          error={message('newPassword')}
        >
          {(control) => (
            <Input
              {...control}
              {...register('newPassword')}
              type="password"
              autoComplete="new-password"
              className="h-11"
            />
          )}
        </FormField>
        <FormField
          id="account-confirm-password"
          label={t('account.confirmNewPassword')}
          error={message('confirmPassword')}
        >
          {(control) => (
            <Input
              {...control}
              {...register('confirmPassword')}
              type="password"
              autoComplete="new-password"
              className="h-11"
            />
          )}
        </FormField>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="outline" className="h-11 px-5" disabled={saving}>
            {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
            {saving ? t('account.changingPassword') : t('account.changePassword')}
          </Button>
          <FormResult request={request} successText={t('account.passwordChanged')} />
        </div>
      </form>
    </section>
  )
}

export function AccountPage() {
  const { t, pick } = useT()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector(selectAuth)
  const temples = useTemples()

  useEffect(() => {
    dispatch(accountFormsReset())
  }, [dispatch])

  if (!user) return null // RequireAuth handles guests
  const temple = temples.data.find((x) => x.id === user.templeId)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeading title={t('account.title')} intro={t('account.intro')} />

      <section aria-labelledby="account-details" className="rounded-xl border bg-card p-5">
        <h2 id="account-details" className="mb-3 text-xl font-semibold text-primary">
          {t('account.details')}
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">{t('account.username')}</dt>
            <dd className="font-mono font-medium">{user.username}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('account.role')}</dt>
            <dd>
              <RoleBadge user={user} />
            </dd>
          </div>
          {user.role !== 'DEVOTEE' && (
            <div>
              <dt className="text-muted-foreground">{t('account.temple')}</dt>
              <dd className="font-medium">
                {temple ? pick(temple.name) : t('account.allTemples')}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* key: re-create the form with fresh defaults if the saved user changes */}
      <ProfileForm key={`${user.id}-${user.name}-${user.phone}`} user={user} />
      <PasswordForm />
    </div>
  )
}
