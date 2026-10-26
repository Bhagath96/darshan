import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { EditorDialog } from '@/components/admin/EditorDialog'
import { AddButton, DeleteButton, EditButton } from '@/components/admin/fields'
import { RBody, RCell, RHead, RHeader, RRow, RTable } from '@/components/admin/ResponsiveTable'
import { FormField } from '@/components/common/FormField'
import { NativeSelect } from '@/components/common/NativeSelect'
import { PageHeading } from '@/components/common/PageTitle'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { RoleBadge } from '@/components/common/UserMenu'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useQueryParams } from '@/hooks/useQueryParams'
import { useFieldMessage } from '@/hooks/useFieldMessage'
import { useTemples } from '@/hooks/useTemples'
import { useT, type MessageKey } from '@/i18n'
import { USER_ROLES } from '@/lib/constants'
import { isValidPhone } from '@/lib/phone'
import { isStrongPassword, NAME_PATTERN, USERNAME_PATTERN } from '@/lib/validators'
import { z } from '@/lib/zod'
import { userDeleteRequested, userSaveRequested } from '@/store/admin/manageActions'
import { selectAdminUsers, usersRequested } from '@/store/admin/usersSlice'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { AuthUser, UserRole } from '@/types'

const key = (k: MessageKey) => k
const isRole = (v: string): v is UserRole => (USER_ROLES as readonly string[]).includes(v)

/** On edit an empty password keeps the current one; on create it is required. */
const userSchema = (isNew: boolean) =>
  z
    .object({
      name: z
        .string()
        .transform((v) => v.trim().replace(/\s+/g, ' '))
        .pipe(z.string().regex(NAME_PATTERN, key('manage.nameInvalid'))),
      phone: z.string().trim().refine(isValidPhone, key('validation.phoneInvalid')),
      username: z
        .string()
        .trim()
        .toLowerCase()
        .regex(USERNAME_PATTERN, key('validation.usernameInvalid')),
      role: z.enum(USER_ROLES),
      templeId: z.string(),
      password: z.string(),
    })
    .superRefine((v, ctx) => {
      if (v.role === 'STAFF' && !v.templeId)
        ctx.addIssue({
          code: 'custom',
          path: ['templeId'],
          message: key('manage.staffTempleRequired'),
        })
      if ((isNew || v.password) && !isStrongPassword(v.password))
        ctx.addIssue({
          code: 'custom',
          path: ['password'],
          message: key('validation.passwordWeak'),
        })
    })
type UserValues = z.infer<ReturnType<typeof userSchema>>

function UserForm({ formId, user }: { formId: string; user?: AuthUser }) {
  const { t, pick } = useT()
  const dispatch = useAppDispatch()
  const temples = useTemples()
  const me = useAppSelector(selectCurrentUser)
  const isSelf = user?.id === me?.id
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UserValues>({
    resolver: zodResolver(userSchema(!user)),
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      username: user?.username ?? '',
      role: user?.role ?? 'STAFF',
      templeId: user?.templeId ?? '',
      password: '',
    },
  })
  const role = useWatch({ control, name: 'role' })
  const message = useFieldMessage(errors)

  const onSubmit = handleSubmit((v) =>
    dispatch(
      userSaveRequested({
        id: user?.id,
        input: { ...v, templeId: v.role === 'STAFF' ? v.templeId : null },
      }),
    ),
  )

  return (
    <form id={formId} noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <FormField id="user-name" label={t('manage.fullName')} error={message('name')}>
        {(c) => <Input {...c} {...register('name')} autoComplete="off" className="h-11" />}
      </FormField>
      <FormField id="user-phone" label={t('common.phone')} error={message('phone')}>
        {(c) => (
          <Input {...c} {...register('phone')} type="tel" inputMode="numeric" className="h-11" />
        )}
      </FormField>
      <FormField id="user-username" label={t('manage.username')} error={message('username')}>
        {(c) => (
          <Input
            {...c}
            {...register('username')}
            autoCapitalize="none"
            autoComplete="off"
            className="h-11"
          />
        )}
      </FormField>
      {isSelf && user ? (
        // Your own role can't change (the server refuses too), so it isn't a field.
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t('manage.role')}</p>
          <p className="flex h-11 items-center rounded-lg border border-dashed px-3 text-sm">
            {t(`role.${user.role}`)}
          </p>
          <p className="text-xs text-muted-foreground">{t('manage.ownRoleHint')}</p>
        </div>
      ) : (
        <FormField id="user-role" label={t('manage.role')}>
          {(c) => (
            <NativeSelect {...c} {...register('role')}>
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`role.${r}`)}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      )}
      {role === 'STAFF' && (
        <FormField id="user-temple" label={t('common.temple')} error={message('templeId')}>
          {(c) => (
            <NativeSelect {...c} {...register('templeId')}>
              <option value="">{t('manage.chooseTemple')}</option>
              {temples.data.map((temple) => (
                <option key={temple.id} value={temple.id}>
                  {pick(temple.name)}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      )}
      <FormField
        id="user-password"
        label={user ? t('manage.newPassword') : t('manage.password')}
        hint={user ? t('manage.passwordKeepHint') : t('register.passwordHint')}
        error={message('password')}
      >
        {(c) => (
          <Input
            {...c}
            {...register('password')}
            type="password"
            autoComplete="new-password"
            className="h-11"
          />
        )}
      </FormField>
    </form>
  )
}

function UserRow({ user }: { user: AuthUser }) {
  const { t, pick } = useT()
  const dispatch = useAppDispatch()
  const temples = useTemples()
  const me = useAppSelector(selectCurrentUser)
  const temple = temples.data.find((x) => x.id === user.templeId)
  return (
    <RRow>
      <RCell label={t('manage.fullName')} className="font-medium">
        {user.name}
        {user.id === me?.id && (
          <span className="ms-2 text-xs font-normal text-muted-foreground">{t('manage.you')}</span>
        )}
      </RCell>
      <RCell label={t('manage.username')} className="font-mono">
        {user.username}
      </RCell>
      <RCell label={t('common.phone')} className="tabular-nums">
        {user.phone}
      </RCell>
      <RCell label={t('manage.role')}>
        <RoleBadge user={user} />
      </RCell>
      <RCell label={t('common.temple')}>{temple ? pick(temple.name) : '—'}</RCell>
      <RCell>
        <span className="flex flex-wrap gap-1">
          <EditorDialog
            trigger={<EditButton label={t('manage.editOf', { name: user.name })} />}
            title={t('manage.editUser')}
            submitLabel={t('common.save')}
          >
            {(formId) => <UserForm formId={formId} user={user} />}
          </EditorDialog>
          {user.id !== me?.id && (
            <DeleteButton
              label={t('manage.deleteOf', { name: user.name })}
              title={t('manage.deleteUserTitle', { name: user.name })}
              description={t('manage.deleteUserText')}
              onConfirm={() => dispatch(userDeleteRequested(user.id))}
            />
          )}
        </span>
      </RCell>
    </RRow>
  )
}

export function AdminUsersPage() {
  const { t, err } = useT()
  const dispatch = useAppDispatch()
  const users = useAppSelector(selectAdminUsers)
  const { get, update } = useQueryParams()
  const role = isRole(get('role')) ? (get('role') as UserRole) : ''
  const [search, setSearch] = useState(get('q'))
  const q = useDebouncedValue(search.trim(), 300)

  useEffect(() => {
    update({ q }, { replace: true })
  }, [q, update])

  const load = () => dispatch(usersRequested({ role: role || undefined, q: q || undefined }))
  useEffect(() => {
    load()
    // `load` reads exactly these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, q])

  return (
    <div className="space-y-6">
      <PageHeading title={t('manage.usersTitle')} intro={t('manage.usersIntro')} />
      <EditorDialog
        trigger={<AddButton>{t('manage.addUser')}</AddButton>}
        title={t('manage.addUser')}
        description={t('manage.addUserText')}
        submitLabel={t('manage.create')}
      >
        {(formId) => <UserForm formId={formId} />}
      </EditorDialog>

      <form
        role="search"
        aria-label={t('common.filters')}
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2"
      >
        <FormField id="users-search" label={t('manage.searchUsers')}>
          {(c) => (
            <Input
              {...c}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11"
            />
          )}
        </FormField>
        <FormField id="users-role" label={t('manage.role')}>
          {(c) => (
            <NativeSelect {...c} value={role} onChange={(e) => update({ role: e.target.value })}>
              <option value="">{t('manage.anyRole')}</option>
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`role.${r}`)}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      </form>

      {users.status === 'error' && users.error ? (
        <ErrorState message={err(users.error)} onRetry={load} />
      ) : users.status !== 'success' && users.data.length === 0 ? (
        <LoadingState rows={4} />
      ) : users.data.length === 0 ? (
        <EmptyState title={t('manage.usersEmpty')} />
      ) : (
        <div className="space-y-4" aria-busy={users.status === 'loading'}>
          <p role="status" className="text-sm text-muted-foreground">
            {t('manage.usersCount', { count: users.data.length })}
          </p>
          <RTable>
            <RHead>
              <tr role="row">
                <RHeader>{t('manage.fullName')}</RHeader>
                <RHeader>{t('manage.username')}</RHeader>
                <RHeader>{t('common.phone')}</RHeader>
                <RHeader>{t('manage.role')}</RHeader>
                <RHeader>{t('common.temple')}</RHeader>
                <RHeader>{t('common.actions')}</RHeader>
              </tr>
            </RHead>
            <RBody>
              {users.data.map((u) => (
                <UserRow key={u.id} user={u} />
              ))}
            </RBody>
          </RTable>
        </div>
      )}
    </div>
  )
}
