import { useRef, type KeyboardEvent } from 'react'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import type { IsoDate } from '@/types'

interface DayPickerProps {
  days: IsoDate[]
  value: IsoDate
  onChange: (day: IsoDate) => void
  labelId: string
}

/** Short parts of a date for the button face, e.g. "Tue", "27", "Oct", in the UI language. */
function useDayParts() {
  const { lang } = useT()
  const locale = lang === 'ml' ? 'ml-IN' : 'en-IN'
  return (day: IsoDate) => {
    const d = new Date(`${day}T00:00:00Z`)
    const fmt = (o: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, { ...o, timeZone: 'UTC' }).format(d)
    return {
      weekday: fmt({ weekday: 'short' }),
      day: fmt({ day: 'numeric' }),
      month: fmt({ month: 'short' }),
    }
  }
}

/**
 * The next 7 days as a radio group (WAI-ARIA pattern): Tab enters on the selected day,
 * arrow keys / Home / End move and select, so one Tab stop covers the whole row.
 */
export function DayPicker({ days, value, onChange, labelId }: DayPickerProps) {
  const { date } = useT()
  const parts = useDayParts()
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const index = Math.max(0, days.indexOf(value))

  const move = (next: number) => {
    const target = (next + days.length) % days.length
    const day = days[target]
    if (!day) return
    onChange(day)
    refs.current[target]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: days.length - 1,
    }
    const next = keys[e.key]
    if (next === undefined) return
    e.preventDefault()
    move(next)
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      onKeyDown={onKeyDown}
      className="grid grid-cols-4 gap-2 sm:grid-cols-7"
    >
      {days.map((day, i) => {
        const selected = day === value
        const p = parts(day)
        return (
          <button
            key={day}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={date(day)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(day)}
            className={cn(
              'flex min-h-16 flex-col items-center justify-center rounded-lg border px-1 py-2 text-sm transition-colors',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:border-primary/50 hover:bg-secondary',
            )}
          >
            <span className="text-xs">{p.weekday}</span>
            <span className="text-lg leading-tight font-semibold">{p.day}</span>
            <span className="text-xs">{p.month}</span>
          </button>
        )
      })}
    </div>
  )
}
