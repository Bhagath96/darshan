import { useEffect, useState } from 'react'

/**
 * The current time in ms, refreshed every `intervalMs`. Lets screens like
 * "this darshan has started" update by themselves without reading the clock during render.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
