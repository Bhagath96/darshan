import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useT } from '@/i18n'

export interface SummaryError {
  /** id of the field, so the link can move focus to it. */
  fieldId: string
  label: string
  message: string
}

/**
 * Listed at the top of a form after a failed submit (WCAG 3.3.1): it takes focus,
 * says how many fields need fixing, and links to each one.
 * `submitCount` re-focuses the summary on every failed attempt.
 */
export function ErrorSummary({
  errors,
  submitCount,
}: {
  errors: SummaryError[]
  submitCount: number
}) {
  const { t } = useT()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (errors.length > 0) ref.current?.focus()
    // Only on a new submit, not while the user fixes fields one by one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount])

  if (errors.length === 0) return null

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="flex items-center gap-2 font-medium text-destructive">
        <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
        {errors.length === 1
          ? t('register.errorSummaryOne')
          : t('register.errorSummary', { count: errors.length })}
      </p>
      <ul className="list-disc space-y-1 ps-6">
        {errors.map((e) => (
          <li key={e.fieldId}>
            <a
              href={`#${e.fieldId}`}
              className="text-destructive underline underline-offset-2"
              onClick={(event) => {
                event.preventDefault()
                document.getElementById(e.fieldId)?.focus()
              }}
            >
              {e.label}: {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
