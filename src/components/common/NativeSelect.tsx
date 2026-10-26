import type { ComponentProps } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A styled native <select>. Chosen over a custom listbox for pickers like temple,
 * status and birth star: it works with every screen reader, gives the phone's own
 * picker on mobile, and is found by its label in tests.
 */
export function NativeSelect({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className={cn('relative', className)}>
      <select
        className="h-11 w-full min-w-0 appearance-none rounded-lg border border-input bg-card ps-3 pe-9 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}
