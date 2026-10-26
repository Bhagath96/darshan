import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useT } from '@/i18n'

interface PhoneSearchFieldProps {
  id: string
  /** Current value from the URL. */
  value: string
  /** Called with the digits once typing pauses. */
  onSearch: (digits: string) => void
}

/** Phone search box: keeps only digits and searches 300 ms after typing stops. */
export function PhoneSearchField({ id, value, onSearch }: PhoneSearchFieldProps) {
  const { t } = useT()
  const [text, setText] = useState(value)
  const debounced = useDebouncedValue(text.replace(/\D/g, ''), 300)

  // Back/forward or "Clear filters" changes the URL: show that value.
  const [lastUrlValue, setLastUrlValue] = useState(value)
  if (value !== lastUrlValue) {
    setLastUrlValue(value)
    setText(value)
  }

  useEffect(() => {
    if (debounced !== value) onSearch(debounced)
    // Only react to typing, not to the URL catching up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <FormField id={id} label={t('common.phone')} hint={t('common.phoneSearchHint')}>
      {(control) => (
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            {...control}
            type="search"
            inputMode="numeric"
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-11 ps-9"
          />
        </div>
      )}
    </FormField>
  )
}
