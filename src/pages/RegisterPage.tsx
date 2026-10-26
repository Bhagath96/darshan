import { useEffect, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { Link, Navigate, useSearchParams } from 'react-router'
import { z } from '@/lib/zod'
import { ErrorSummary } from '@/components/common/ErrorSummary'
import { FormField } from '@/components/common/FormField'
import { PageHeading } from '@/components/common/PageTitle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useT, type MessageKey } from '@/i18n'
import { safeRedirect } from '@/lib/redirect'
import {
  nameSchema,
  newPasswordSchema,
  phoneSchema,
  requiredSchema,
  usernameSchema,
} from '@/lib/schemas'
import { loginErrorCleared, registerRequested, selectAuth } from '@/store/auth/authSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

const registerSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    username: usernameSchema,
    password: newPasswordSchema,
    confirmPassword: requiredSchema,
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'validation.passwordMismatch' satisfies MessageKey,
  })

type RegisterInput = z.input<typeof registerSchema>
type RegisterValues = z.output<typeof registerSchema>

const FIELDS = ['name', 'phone', 'username', 'password', 'confirmPassword'] as const
const LABELS: Record<(typeof FIELDS)[number], MessageKey> = {
  name: 'register.name',
  phone: 'register.phone',
  username: 'register.username',
  password: 'register.password',
  confirmPassword: 'register.confirmPassword',
}
const fieldId = (name: string) => `register-${name}`

export function RegisterPage() {
  const { t, err } = useT()
  const dispatch = useAppDispatch()
  const auth = useAppSelector(selectAuth)
  const [params] = useSearchParams()
  const serverErrorRef = useRef<HTMLDivElement>(null)
  const submitting = auth.status === 'loading'

  const {
    register,
    handleSubmit,
    formState: { errors, submitCount },
  } = useForm<RegisterInput, unknown, RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', phone: '', username: '', password: '', confirmPassword: '' },
  })

  useEffect(() => () => void dispatch(loginErrorCleared()), [dispatch])
  useEffect(() => {
    if (auth.status === 'error') serverErrorRef.current?.focus()
  }, [auth.status, auth.error])

  if (auth.user) return <Navigate to={safeRedirect(params.get('redirect'))} replace />

  const onSubmit = handleSubmit(({ confirmPassword: _confirm, ...values }) =>
    dispatch(registerRequested(values)),
  )

  const message = (e: FieldErrors<RegisterInput>[keyof RegisterInput]) =>
    e && t(e.message as MessageKey)
  const summary = FIELDS.flatMap((name) => {
    const text = message(errors[name])
    return text ? [{ fieldId: fieldId(name), label: t(LABELS[name]), message: text }] : []
  })
  const redirect = params.get('redirect')

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeading title={t('register.title')} intro={t('register.intro')} />

      <ErrorSummary errors={summary} submitCount={submitCount} />

      {auth.status === 'error' && auth.error && (
        <div
          ref={serverErrorRef}
          tabIndex={-1}
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm font-medium text-destructive outline-none"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {err(auth.error)}
        </div>
      )}

      <form
        noValidate
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border bg-card p-5 shadow-sm"
      >
        <FormField id={fieldId('name')} label={t('register.name')} error={message(errors.name)}>
          {(control) => (
            <Input {...control} {...register('name')} autoComplete="name" className="h-11" />
          )}
        </FormField>
        <FormField
          id={fieldId('phone')}
          label={t('register.phone')}
          hint={t('register.phoneHint')}
          error={message(errors.phone)}
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
        <FormField
          id={fieldId('username')}
          label={t('register.username')}
          hint={t('register.usernameHint')}
          error={message(errors.username)}
        >
          {(control) => (
            <Input
              {...control}
              {...register('username')}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className="h-11"
            />
          )}
        </FormField>
        <FormField
          id={fieldId('password')}
          label={t('register.password')}
          hint={t('register.passwordHint')}
          error={message(errors.password)}
        >
          {(control) => (
            <Input
              {...control}
              {...register('password')}
              type="password"
              autoComplete="new-password"
              className="h-11"
            />
          )}
        </FormField>
        <FormField
          id={fieldId('confirmPassword')}
          label={t('register.confirmPassword')}
          error={message(errors.confirmPassword)}
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

        <Button type="submit" className="h-11 w-full text-base" disabled={submitting}>
          {submitting && <Loader2 aria-hidden="true" className="animate-spin" />}
          {submitting ? t('register.submitting') : t('register.submit')}
        </Button>
      </form>

      <p className="text-sm">
        {t('register.haveAccount')}{' '}
        <Link
          to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
          className="font-medium text-primary underline underline-offset-4"
        >
          {t('register.loginLink')}
        </Link>
      </p>
    </div>
  )
}
