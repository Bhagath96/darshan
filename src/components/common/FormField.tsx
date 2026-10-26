import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** Props a field control needs so its label, hint and error are announced together. */
export interface FieldControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
}

interface FormFieldProps {
  id: string
  label: ReactNode
  /** Already-translated error text; shown under the field and linked with aria-describedby. */
  error?: string
  hint?: ReactNode
  className?: string
  children: (control: FieldControlProps) => ReactNode
}

/**
 * Label + control + hint + error, wired for screen readers:
 * the label names the field, and the hint and error are read after it.
 */
export function FormField({ id, label, error, hint, className, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
