import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { useAppDispatch } from '@/store/hooks'
import { setLanguage } from '@/store/i18n/i18nSlice'

/** EN ⇄ മലയാളം switch. The visible text is the *other* language, written in that language. */
export function LanguageToggle({ className }: { className?: string }) {
  const { t, lang } = useT()
  const dispatch = useAppDispatch()
  const next = lang === 'en' ? 'ml' : 'en'
  return (
    <Button
      type="button"
      variant="outline"
      className={className ?? 'h-11 px-3'}
      aria-label={t('lang.switchLabel')}
      onClick={() => dispatch(setLanguage(next))}
    >
      <Languages aria-hidden="true" />
      <span lang={next}>{t('lang.switchText')}</span>
    </Button>
  )
}
