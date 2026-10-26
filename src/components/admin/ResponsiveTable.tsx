import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * A real <table> on wide screens that turns into one card per row below `md`.
 * Each cell repeats its column name (data-label) in card view. Explicit ARIA roles
 * keep the table semantics that some browsers drop when `display` changes.
 */

export function RTable({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="md:overflow-hidden md:rounded-xl md:border md:bg-card">
      <table role="table" className={cn('w-full text-sm max-md:block', className)} {...props} />
    </div>
  )
}

export function RHead(props: ComponentProps<'thead'>) {
  return <thead role="rowgroup" className="bg-secondary/60 max-md:sr-only" {...props} />
}

export function RBody({ className, ...props }: ComponentProps<'tbody'>) {
  return (
    <tbody role="rowgroup" className={cn('max-md:block max-md:space-y-3', className)} {...props} />
  )
}

export function RRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      role="row"
      className={cn(
        'border-t align-top first:border-t-0 max-md:block max-md:rounded-xl max-md:border max-md:bg-card max-md:p-3 max-md:shadow-sm max-md:first:border-t',
        className,
      )}
      {...props}
    />
  )
}

export function RHeader({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      role="columnheader"
      scope="col"
      className={cn('px-3 py-2.5 text-start font-medium', className)}
      {...props}
    />
  )
}

/** `label` is shown before the value in card view. */
export function RCell({ label, className, ...props }: ComponentProps<'td'> & { label?: string }) {
  return (
    <td
      role="cell"
      data-label={label}
      className={cn(
        'px-3 py-3 max-md:flex max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 max-md:px-0 max-md:py-1.5',
        label &&
          'max-md:before:shrink-0 max-md:before:font-medium max-md:before:text-muted-foreground max-md:before:content-[attr(data-label)]',
        className,
      )}
      {...props}
    />
  )
}
