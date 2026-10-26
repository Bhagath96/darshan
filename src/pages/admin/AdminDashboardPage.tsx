import { useEffect, useState } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import { TempleScopeField } from '@/components/admin/TempleScopeField'
import { PageHeading } from '@/components/common/PageTitle'
import { ErrorState, LoadingState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { useQueryParams } from '@/hooks/useQueryParams'
import { useTemples } from '@/hooks/useTemples'
import { useT } from '@/i18n'
import { ORDER_STATUSES } from '@/lib/constants'
import { formatINR } from '@/lib/currency'
import { dashboardRequested, selectDashboard } from '@/store/admin/dashboardSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { DashboardStats } from '@/types'

/** One headline number with a label and an optional note underneath. */
function StatTile({
  label,
  value,
  note,
}: {
  label: string
  value: string | number
  note?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
    </div>
  )
}

/** Share of darshan tickets booked over the next week. Track = a light step of the bar hue. */
function UtilisationMeter({ stats }: { stats: DashboardStats }) {
  const { t } = useT()
  const percent = Math.round(stats.slots.utilisation * 100)
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      <p id="utilisation-label" className="text-sm text-muted-foreground">
        {t('dashboard.utilisation')}
      </p>
      <p className="text-3xl font-semibold">{percent}%</p>
      <div
        role="meter"
        aria-labelledby="utilisation-label"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={t('dashboard.utilisationValue', { percent })}
        className="h-3 overflow-hidden rounded-full bg-chart-track"
      >
        <div className="h-full rounded-full bg-chart-bar" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm text-muted-foreground">
        {t('dashboard.slotsSummary', { full: stats.slots.full, blocked: stats.slots.blocked })}
      </p>
    </div>
  )
}

/**
 * Revenue per temple as horizontal bars (one series, one hue, value labelled at the end),
 * with a table view of the same numbers. Hover or focus a bar for the order count.
 */
function RevenueByTemple({ stats }: { stats: DashboardStats }) {
  const { t, pick } = useT()
  const temples = useTemples()
  const [asTable, setAsTable] = useState(false)
  const max = Math.max(1, ...stats.byTemple.map((r) => r.revenue))
  const name = (id: string) => {
    const temple = temples.data.find((x) => x.id === id)
    return temple ? pick(temple.name) : id
  }

  return (
    <section aria-labelledby="by-temple" className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="by-temple" className="text-lg font-semibold">
          {t('dashboard.byTemple')}
        </h2>
        <Button
          variant="outline"
          className="h-11 px-3"
          aria-pressed={asTable}
          onClick={() => setAsTable((v) => !v)}
        >
          {asTable ? <BarChart3 aria-hidden="true" /> : <Table2 aria-hidden="true" />}
          {asTable ? t('dashboard.showChart') : t('dashboard.showTable')}
        </Button>
      </div>

      {asTable ? (
        <table className="w-full text-sm">
          <caption className="sr-only">{t('dashboard.byTempleCaption')}</caption>
          <thead>
            <tr className="border-b text-muted-foreground">
              <th scope="col" className="py-2 text-start font-medium">
                {t('common.temple')}
              </th>
              <th scope="col" className="py-2 text-end font-medium">
                {t('dashboard.revenue')}
              </th>
              <th scope="col" className="py-2 text-end font-medium">
                {t('dashboard.orders')}
              </th>
              <th scope="col" className="py-2 text-end font-medium">
                {t('dashboard.bookings')}
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.byTemple.map((row) => (
              <tr key={row.templeId} className="border-b last:border-0">
                <th scope="row" className="py-2 text-start font-medium">
                  {name(row.templeId)}
                </th>
                <td className="py-2 text-end tabular-nums">{formatINR(row.revenue)}</td>
                <td className="py-2 text-end tabular-nums">{row.orders}</td>
                <td className="py-2 text-end tabular-nums">{row.bookings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className="space-y-3">
          {stats.byTemple.map((row) => {
            const tip = t('dashboard.barTooltip', {
              revenue: formatINR(row.revenue),
              orders: row.orders,
            })
            return (
              <li
                key={row.templeId}
                className="group relative space-y-1"
                tabIndex={0}
                aria-label={`${name(row.templeId)}: ${tip}`}
              >
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{name(row.templeId)}</span>
                  <span className="font-medium whitespace-nowrap tabular-nums">
                    {formatINR(row.revenue)}
                  </span>
                </div>
                <div className="h-5 rounded-e-[4px] bg-transparent" aria-hidden="true">
                  <div
                    className="h-full rounded-e-[4px] bg-chart-bar"
                    style={{ width: `${(row.revenue / max) * 100}%` }}
                  />
                </div>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute end-0 -top-8 z-10 hidden rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background shadow group-hover:block group-focus-visible:block"
                >
                  {tip}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function AdminDashboardPage() {
  const { t, date, err } = useT()
  const dispatch = useAppDispatch()
  const dashboard = useAppSelector(selectDashboard)
  const { get, update } = useQueryParams()
  const templeId = get('temple')

  const load = () => dispatch(dashboardRequested(templeId || undefined))
  useEffect(() => {
    load()
    // `load` reads exactly this value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templeId])

  const stats = dashboard.data
  const earning = stats ? stats.orders.byStatus.CONFIRMED + stats.orders.byStatus.COMPLETED : 0

  return (
    <div className="space-y-6">
      <PageHeading title={t('dashboard.title')} intro={t('dashboard.intro')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TempleScopeField
          id="dashboard-temple"
          value={templeId}
          allowAll
          onChange={(id) => update({ temple: id })}
        />
      </div>

      {dashboard.status === 'error' && dashboard.error ? (
        <ErrorState message={err(dashboard.error)} onRetry={load} />
      ) : !stats ? (
        <LoadingState rows={4} />
      ) : (
        <div className="space-y-6" aria-busy={dashboard.status === 'loading'}>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.asOf', { date: date(stats.today) })}
          </p>

          <section aria-labelledby="hero-revenue" className="rounded-xl border bg-card p-5">
            <h2 id="hero-revenue" className="text-sm font-normal text-muted-foreground">
              {t('dashboard.revenue')}
            </h2>
            <p className="font-sans text-5xl font-semibold text-foreground">
              {formatINR(stats.orders.revenue)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('dashboard.revenueNote', { count: earning })}
            </p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label={t('dashboard.ticketsToday')}
              value={stats.bookings.ticketsToday}
              note={t('dashboard.bookingsToday', { count: stats.bookings.today })}
            />
            <StatTile label={t('dashboard.ordersToday')} value={stats.orders.today} />
            <StatTile label={t('dashboard.upcoming')} value={stats.bookings.upcoming} />
            <StatTile label={t('dashboard.cancelledBookings')} value={stats.bookings.cancelled} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <UtilisationMeter stats={stats} />
            <section
              aria-labelledby="orders-by-status"
              className="space-y-3 rounded-xl border bg-card p-4"
            >
              <h2 id="orders-by-status" className="text-sm font-normal text-muted-foreground">
                {t('dashboard.ordersByStatus')}
              </h2>
              <dl className="grid grid-cols-3 gap-3">
                {ORDER_STATUSES.map((s) => (
                  <div key={s} className="space-y-1">
                    <dt>
                      <StatusBadge kind="order" status={s} />
                    </dt>
                    <dd className="text-2xl font-semibold">{stats.orders.byStatus[s]}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          <RevenueByTemple stats={stats} />
        </div>
      )}
    </div>
  )
}
