import { formatINR } from '@/lib/currency'
import { cn } from '@/lib/utils'

export function Price({ amount, className }: { amount: number; className?: string }) {
  return <span className={cn('tabular-nums', className)}>{formatINR(amount)}</span>
}
