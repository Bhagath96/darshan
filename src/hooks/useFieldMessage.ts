import { get, type FieldErrors, type FieldValues } from 'react-hook-form'
import { useT, type MessageKey } from '@/i18n'

/** Translated error for a form field (nested names like "schedule.0.time" work too). */
export function useFieldMessage<T extends FieldValues>(errors: FieldErrors<T>) {
  const { t } = useT()
  return (name: string): string | undefined => {
    const message = (get(errors, name) as { message?: string } | undefined)?.message
    return message ? t(message as MessageKey) : undefined
  }
}
