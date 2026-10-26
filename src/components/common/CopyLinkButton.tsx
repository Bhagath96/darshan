import { useId, useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useT } from '@/i18n'

/**
 * Copies the current page link. If the clipboard is blocked (insecure origin, browser
 * policy), it shows the link in a read-only box instead, selected and ready to copy.
 */
export function CopyLinkButton() {
  const { t } = useT()
  const [state, setState] = useState<'idle' | 'copied' | 'fallback'>('idle')
  const fallbackId = useId()
  const url = window.location.href

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard not available')
      await navigator.clipboard.writeText(window.location.href)
      setState('copied')
      setTimeout(() => setState('idle'), 2500)
    } catch {
      setState('fallback')
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="h-11 px-3" onClick={() => void copy()}>
        {state === 'copied' ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
        {t('darshan.copyLink')}
      </Button>
      <span role="status" className="sr-only">
        {state === 'copied' ? t('darshan.linkCopied') : ''}
      </span>
      {state === 'fallback' && (
        <div className="space-y-1">
          <label htmlFor={fallbackId} className="text-sm">
            {t('darshan.copyFallback')}
          </label>
          <Input
            id={fallbackId}
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            autoFocus
            className="h-11"
          />
        </div>
      )}
    </div>
  )
}
