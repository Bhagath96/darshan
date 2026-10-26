import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'

/**
 * Live regions for screen readers. They stay mounted all the time (a region added
 * together with its text is often not read), and the text is cleared first so the
 * same message can be announced twice in a row.
 */
export function Announcer() {
  const { id, message, politeness } = useAppSelector((s) => s.ui.announcement)
  const [text, setText] = useState({ polite: '', assertive: '' })

  useEffect(() => {
    if (id === 0) return
    const clear = setTimeout(() => setText({ polite: '', assertive: '' }), 0)
    const show = setTimeout(() => setText((prev) => ({ ...prev, [politeness]: message })), 50)
    return () => {
      clearTimeout(clear)
      clearTimeout(show)
    }
  }, [id, message, politeness])

  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {text.polite}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {text.assertive}
      </div>
    </>
  )
}
