import { Clock, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { useT } from '@/i18n'
import { imageFor } from '@/lib/images'
import type { Temple } from '@/types'

/** Temple summary card. The whole card is one link, named by the temple. */
export function TempleCard({ temple, headingLevel = 3 }: { temple: Temple; headingLevel?: 2 | 3 }) {
  const { t, pick } = useT()
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition focus-within:ring-2 focus-within:ring-ring hover:shadow-md">
      <img
        src={imageFor(temple.image)}
        alt=""
        loading="lazy"
        decoding="async"
        width={640}
        height={360}
        className="aspect-[16/9] w-full object-cover"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Heading className="text-xl font-semibold text-primary">
          <Link
            to={`/temples/${temple.id}`}
            className="outline-none after:absolute after:inset-0 group-hover:underline focus-visible:underline"
          >
            {pick(temple.name)}
          </Link>
        </Heading>
        <p className="text-sm text-muted-foreground">{pick(temple.deity)}</p>
        <p className="flex items-center gap-1.5 text-sm">
          <MapPin aria-hidden="true" className="size-4 shrink-0 text-gold" />
          {pick(temple.location)}
        </p>
        <p className="flex items-start gap-1.5 text-sm">
          <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold" />
          <span>
            <span className="sr-only">{t('temples.timings')}: </span>
            {temple.timings}
          </span>
        </p>
      </div>
    </article>
  )
}
