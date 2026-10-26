import type { ComponentProps } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField } from '@/components/common/FormField'
import { NativeSelect } from '@/components/common/NativeSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useT } from '@/i18n'
import { IMAGE_KEYS, imageFor } from '@/lib/images'

interface BilingualFieldProps {
  id: string
  /** Field name without the language, e.g. "Temple name". */
  label: string
  en: UseFormRegisterReturn
  ml: UseFormRegisterReturn
  errorEn?: string
  errorMl?: string
  multiline?: boolean
}

/** The same text in English and Malayalam, side by side on wide screens. */
export function BilingualField({
  id,
  label,
  en,
  ml,
  errorEn,
  errorMl,
  multiline,
}: BilingualFieldProps) {
  const { t } = useT()
  const control = (lang: 'en' | 'ml', reg: UseFormRegisterReturn) => (props: object) =>
    multiline ? (
      <Textarea {...props} {...reg} lang={lang} rows={3} />
    ) : (
      <Input {...props} {...reg} lang={lang} className="h-11" />
    )
  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <FormField id={`${id}-en`} label={t('manage.inEnglish', { label })} error={errorEn}>
        {control('en', en)}
      </FormField>
      <FormField id={`${id}-ml`} label={t('manage.inMalayalam', { label })} error={errorMl}>
        {control('ml', ml)}
      </FormField>
    </div>
  )
}

/** Picks one of the bundled photos, with a small preview. */
export function ImageField({
  id,
  value,
  register,
}: {
  id: string
  value: string
  register: UseFormRegisterReturn
}) {
  const { t } = useT()
  return (
    <FormField id={id} label={t('manage.photo')}>
      {(control) => (
        <div className="flex items-center gap-3">
          <img
            src={imageFor(value)}
            alt=""
            className="size-11 shrink-0 rounded-lg border object-cover"
          />
          <NativeSelect {...control} {...register} className="flex-1">
            {IMAGE_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
    </FormField>
  )
}

/** Opens an add dialog. Passes other props on, so it works as a dialog trigger. */
export function AddButton({ children, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button className="h-11 px-4" {...props}>
      <Plus aria-hidden="true" />
      {children}
    </Button>
  )
}

/** Opens an edit dialog. `label` names the item for screen readers. */
export function EditButton({ label, ...props }: ComponentProps<typeof Button> & { label: string }) {
  const { t } = useT()
  return (
    <Button variant="outline" className="h-11 px-3" aria-label={label} {...props}>
      <Pencil aria-hidden="true" />
      {t('manage.edit')}
    </Button>
  )
}

interface DeleteButtonProps {
  /** Screen reader name of the button, e.g. "Delete temple Sree Krishna Temple". */
  label: string
  title: string
  description: string
  onConfirm: () => void
  disabled?: boolean
}

/** Delete with an "Are you sure?" step. */
export function DeleteButton({
  label,
  title,
  description,
  onConfirm,
  disabled,
}: DeleteButtonProps) {
  const { t } = useT()
  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" className="h-11 px-3" aria-label={label} disabled={disabled}>
          <Trash2 aria-hidden="true" />
          {t('manage.delete')}
        </Button>
      }
      title={title}
      description={description}
      confirmLabel={t('manage.confirmDelete')}
      cancelLabel={t('manage.keep')}
      onConfirm={onConfirm}
    />
  )
}
