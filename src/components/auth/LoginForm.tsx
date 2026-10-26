import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from '@/lib/zod'
import { FormField } from '@/components/common/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useT, type MessageKey } from '@/i18n'
import { DEMO_ACCOUNTS } from '@/lib/demoAccounts'
import { PORTAL_LOGIN_PATH } from '@/lib/redirect'
import { loginErrorCleared, loginRequested, selectAuth } from '@/store/auth/authSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { LoginPortal } from '@/types'

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'login.usernameRequired' satisfies MessageKey),
  password: z.string().min(1, 'login.passwordRequired' satisfies MessageKey),
})
type LoginValues = z.infer<typeof loginSchema>

interface LoginFormProps {
  portal: LoginPortal
  /** Passed on to the other login page if the user picked the wrong one. */
  redirectQuery: string
}

/** Username + password form shared by the devotee and staff login pages. */
export function LoginForm({ portal, redirectQuery }: LoginFormProps) {
  const { t, err } = useT()
  const dispatch = useAppDispatch()
  const auth = useAppSelector(selectAuth)
  const [showPassword, setShowPassword] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const submitting = auth.status === 'loading'
  const other: LoginPortal = portal === 'devotee' ? 'staff' : 'devotee'

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  // Leaving the page with an old error shouldn't show it next time.
  useEffect(() => () => void dispatch(loginErrorCleared()), [dispatch])

  // Move focus to the error so screen reader and keyboard users notice it.
  useEffect(() => {
    if (auth.status === 'error') errorRef.current?.focus()
  }, [auth.status, auth.error])

  const onSubmit = handleSubmit((values) => dispatch(loginRequested({ ...values, portal })))

  const fillAccount = (username: string, password: string) => {
    setValue('username', username, { shouldValidate: true })
    setValue('password', password, { shouldValidate: true })
    dispatch(loginErrorCleared())
    setFocus('password')
  }

  const loginError =
    auth.error && (auth.error.code === 'UNAUTHORIZED' ? t('login.failed') : err(auth.error))
  const wrongPortal = auth.error?.code === 'FORBIDDEN'
  const accounts = DEMO_ACCOUNTS.filter((a) =>
    portal === 'staff' ? a.role !== 'DEVOTEE' : a.role === 'DEVOTEE',
  )
  const fieldError = (key: keyof LoginValues) => errors[key] && t(errors[key].message as MessageKey)

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
      <div className="space-y-4">
        {loginError && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm font-medium text-destructive outline-none"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              {loginError}{' '}
              {wrongPortal && (
                <Link
                  to={PORTAL_LOGIN_PATH[other] + redirectQuery}
                  className="underline underline-offset-2"
                >
                  {t('login.switchPortal')}
                </Link>
              )}
            </span>
          </div>
        )}

        <form
          noValidate
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border bg-card p-5 shadow-sm"
        >
          <FormField
            id={`${portal}-username`}
            label={t('login.username')}
            error={fieldError('username')}
          >
            {(control) => (
              <Input
                {...control}
                {...register('username', { onChange: () => dispatch(loginErrorCleared()) })}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className="h-11"
              />
            )}
          </FormField>

          <FormField
            id={`${portal}-password`}
            label={t('login.password')}
            error={fieldError('password')}
          >
            {(control) => (
              <div className="relative">
                <Input
                  {...control}
                  {...register('password', { onChange: () => dispatch(loginErrorCleared()) })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="h-11 pe-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="absolute end-1 top-1/2 size-9 -translate-y-1/2"
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </Button>
              </div>
            )}
          </FormField>

          <Button type="submit" className="h-11 w-full text-base" disabled={submitting}>
            {submitting && <Loader2 aria-hidden="true" className="animate-spin" />}
            {submitting ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>

        <div className="space-y-1 text-sm">
          {portal === 'devotee' && (
            <p>
              {t('login.noAccount')}{' '}
              <Link
                to={`/register${redirectQuery}`}
                className="font-medium text-primary underline underline-offset-4"
              >
                {t('login.createAccount')}
              </Link>
            </p>
          )}
          <p>
            <Link
              to={PORTAL_LOGIN_PATH[other] + redirectQuery}
              className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
            >
              {portal === 'devotee' ? t('login.staffLink') : t('login.devoteeLink')}
            </Link>
          </p>
        </div>
      </div>

      <aside
        aria-labelledby={`${portal}-demo`}
        className="space-y-3 self-start rounded-xl border border-dashed bg-secondary/40 p-4 text-sm"
      >
        <h2 id={`${portal}-demo`} className="text-lg font-semibold text-primary">
          {t('login.demoTitle')}
        </h2>
        <p className="text-muted-foreground">{t('login.demoText')}</p>
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li
              key={account.username}
              className="flex items-center justify-between gap-2 rounded-lg bg-card p-2"
            >
              <span className="min-w-0">
                <span className="block font-mono font-medium break-all">
                  {account.username} / {account.password}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t(`role.${account.role}`)} · {account.note}
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0"
                aria-label={t('login.useAccount', { username: account.username })}
                onClick={() => fillAccount(account.username, account.password)}
              >
                {t('login.use')}
              </Button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
