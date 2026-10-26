import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * The standard data table for the admin portal: compact rows, a muted header and a
 * hover highlight. On narrow screens it scrolls sideways instead of wrapping.
 */

export function RTable({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className={cn('w-full min-w-max border-collapse text-sm', className)} {...props} />
    </div>
  )
}

export function RHead({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={cn('border-b bg-muted/50', className)} {...props} />
}

export function RBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody className={cn('[&>tr:last-child]:border-b-0', className)} {...props} />
}

export function RRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={cn('border-b transition-colors hover:bg-muted/40', className)} {...props} />
}

export function RHeader({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn(
        'h-10 px-3 text-start align-middle text-xs font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase',
        className,
      )}
      {...props}
    />
  )
}

/** `label` is the column name; kept for callers, the header row already shows it. */
export function RCell({
  label: _label,
  className,
  ...props
}: ComponentProps<'td'> & { label?: string }) {
  return <td className={cn('px-3 py-2 align-middle', className)} {...props} />
}
