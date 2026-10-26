import { useT } from '@/i18n'

/** Sets the browser tab title. React 19 hoists <title> into <head>. */
export function PageTitle({ title }: { title: string }) {
  const { t } = useT()
  return <title>{`${title} · ${t('app.titleSuffix')}`}</title>
}

/** Page heading with an optional intro line, used at the top of every page. */
export function PageHeading({ title, intro }: { title: string; intro?: string }) {
  return (
    <header className="space-y-2">
      <PageTitle title={title} />
      <h1 className="text-3xl font-semibold text-primary">{title}</h1>
      {intro && <p className="max-w-prose text-muted-foreground">{intro}</p>}
    </header>
  )
}
