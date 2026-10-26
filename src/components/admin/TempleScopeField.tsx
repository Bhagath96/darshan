import { FormField } from '@/components/common/FormField'
import { NativeSelect } from '@/components/common/NativeSelect'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { useAppSelector } from '@/store/hooks'

interface TempleScopeFieldProps {
  id: string
  value: string
  onChange: (templeId: string) => void
  /** Offer "All temples" (admins only). */
  allowAll?: boolean
  allLabel?: string
}

/**
 * Temple picker for admin screens. Staff are tied to one temple, so they see its name
 * instead of a picker (the server enforces the same limit).
 */
export function TempleScopeField({
  id,
  value,
  onChange,
  allowAll = false,
  allLabel,
}: TempleScopeFieldProps) {
  const { t, pick } = useT()
  const user = useAppSelector(selectCurrentUser)
  const temples = useTemples()

  if (user?.templeId) {
    const own = temples.data.find((x) => x.id === user.templeId)
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t('common.temple')}</p>
        <p className="flex h-11 items-center rounded-lg border border-dashed px-3 text-sm">
          {own ? pick(own.name) : '…'}
        </p>
      </div>
    )
  }

  return (
    <FormField id={id} label={t('common.temple')}>
      {(control) => (
        <NativeSelect
          {...control}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={temples.status !== 'success'}
        >
          {allowAll && <option value="">{allLabel ?? t('common.allTemples')}</option>}
          {temples.data.map((temple) => (
            <option key={temple.id} value={temple.id}>
              {pick(temple.name)}
            </option>
          ))}
        </NativeSelect>
      )}
    </FormField>
  )
}
