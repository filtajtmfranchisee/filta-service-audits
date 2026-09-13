import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import { createClient } from "@/lib/supabase/server"

type SearchParams = Promise<{
  from?: string
  to?: string
  type?: string
}>

type Audit = {
  id: string
  audit_type: string
  audit_date: string
  overall_score: number
  critical_failure: boolean | null
  technician_id: string | null
  location_id: string | null
  asset_id: string | null
}

type NamedRecord = {
  id: string
  label: string
}

const auditNames: Record<string, string> = {
  equipment: "MFU/MBU Equipment",
  service_delivery: "Service Delivery",
  warehouse: "Warehouse / Oil Storage",
  vehicle: "Service Vehicle",
}

function dateInEastern(daysFromToday = 0) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function monthsAgo(months: number) {
  const date = new Date()
  date.setMonth(date.getMonth() - months)

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function average(values: number[]) {
  if (!values.length) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

function scoreColor(score: number | null) {
  if (score === null) return "text-slate-500"
  if (score >= 95) return "text-emerald-700"
  if (score >= 83) return "text-blue-700"
  if (score >= 75) return "text-amber-700"
  return "text-red-700"
}

export default async function ScoreTrendsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const filters = await searchParams
  const from = filters.from || monthsAgo(6)
  const to = filters.to || dateInEastern()
  const auditType = filters.type || ""

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.is_anonymous) redirect("/auth/login")

  let auditQuery = supabase
    .from("audits")
    .select(`
      id,
      audit_type,
      audit_date,
      overall_score,
      critical_failure,
      technician_id,
      location_id,
      asset_id
    `)
    .eq("status", "submitted")
    .not("overall_score", "is", null)
    .gte("audit_date", from)
    .lte("audit_date", to)
    .order("audit_date", { ascending: true })

  if (auditType) auditQuery = auditQuery.eq("audit_type", auditType)

  const { data: auditData, error: auditError } = await auditQuery
  if (auditError) throw new Error(auditError.message)

  const audits = (auditData ?? []) as Audit[]
  const auditIds = audits.map((audit) => audit.id)

  const [responsesResult, actionsResult, techniciansResult, locationsResult, assetsResult] =
    await Promise.all([
      auditIds.length
        ? supabase
            .from("audit_responses")
            .select("audit_id, response_value")
            .in("audit_id", auditIds)
        : Promise.resolve({ data: [], error: null }),
      auditIds.length
        ? supabase
            .from("corrective_actions")
            .select("audit_id, status, due_date")
            .in("audit_id", auditIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("technicians").select("id, first_name, last_name"),
      supabase.from("locations").select("id, name"),
      supabase.from("assets").select("id, asset_type, asset_number, description"),
    ])

  if (responsesResult.error) throw new Error(responsesResult.error.message)
  if (actionsResult.error) throw new Error(actionsResult.error.message)

  const responses = responsesResult.data ?? []
  const actions = actionsResult.data ?? []
  const overallAverage = average(audits.map((audit) => Number(audit.overall_score)))
  const criticalCount = audits.filter((audit) => audit.critical_failure).length
  const needsAttention = responses.filter(
    (response) => response.response_value === "needs_attention"
  ).length
  const failed = responses.filter((response) => response.response_value === "fail").length
  const openActions = actions.filter((action) => action.status !== "completed")
  const overdueActions = openActions.filter(
    (action) => Boolean(action.due_date && action.due_date < dateInEastern())
  ).length

  const technicians: NamedRecord[] = (techniciansResult.data ?? []).map((item) => ({
    id: item.id,
    label: [item.first_name, item.last_name].filter(Boolean).join(" ") || "Unnamed Technician",
  }))
  const locations: NamedRecord[] = (locationsResult.data ?? []).map((item) => ({
    id: item.id,
    label: item.name || "Unnamed Location",
  }))
  const assets: NamedRecord[] = (assetsResult.data ?? []).map((item) => ({
    id: item.id,
    label:
      [[item.asset_type, item.asset_number].filter(Boolean).join(" "), item.description]
        .filter(Boolean)
        .join(" — ") || "Unnamed Asset",
  }))

  const monthlyMap = new Map<string, number[]>()
  for (const audit of audits) {
    const month = audit.audit_date.slice(0, 7)
    monthlyMap.set(month, [...(monthlyMap.get(month) || []), Number(audit.overall_score)])
  }
  const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, scores]) => ({
    label: new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(new Date(`${month}-01T12:00:00Z`)),
    value: average(scores) || 0,
    count: scores.length,
  }))

  const typeBreakdown = Object.keys(auditNames)
    .map((type) => {
      const matches = audits.filter((audit) => audit.audit_type === type)
      return {
        label: auditNames[type],
        count: matches.length,
        value: average(matches.map((audit) => Number(audit.overall_score))),
      }
    })
    .filter((item) => item.count > 0)

  const technicianPerformance = buildPerformance(audits, technicians, "technician_id")
  const locationPerformance = buildPerformance(audits, locations, "location_id")
  const assetPerformance = buildPerformance(audits, assets, "asset_id")

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/protected/admin"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Return to Administration
          </Link>
          <Link
            href="/protected/audits"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-600"
          >
            Management Reports →
          </Link>
        </div>

        <header className="mt-6 rounded-2xl bg-slate-900 p-8 text-white shadow-lg">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-28 w-36 shrink-0 items-center justify-center">
              <Image
                src="/filta-logo-clear.png"
                alt="Filta Environmental Kitchen Solutions"
                width={240}
                height={120}
                className="h-auto max-h-28 w-auto max-w-36 object-contain"
                priority
              />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
                Dorado Environmental
              </p>
              <h1 className="mt-2 text-3xl font-bold">Audit Score Trends</h1>
              <p className="mt-3 text-slate-300">
                Monitor inspection performance, recurring issues and accountability over time.
              </p>
            </div>
          </div>
        </header>

        <form className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-4">
          <FilterField label="From">
            <input type="date" name="from" defaultValue={from} className="field" />
          </FilterField>
          <FilterField label="To">
            <input type="date" name="to" defaultValue={to} className="field" />
          </FilterField>
          <FilterField label="Audit Type">
            <select name="type" defaultValue={auditType} className="field bg-white">
              <option value="">All audit types</option>
              {Object.entries(auditNames).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FilterField>
          <div className="flex items-end gap-3">
            <button className="min-h-12 flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white hover:bg-emerald-400">
              Apply Filters
            </button>
            <Link href="/protected/admin/trends" className="inline-flex min-h-12 items-center font-semibold text-slate-600">
              Clear
            </Link>
          </div>
        </form>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Completed Audits" value={String(audits.length)} />
          <Metric label="Average Score" value={overallAverage === null ? "—" : `${overallAverage}%`} color={scoreColor(overallAverage)} />
          <Metric label="Needs Attention / Fail" value={`${needsAttention} / ${failed}`} color={failed ? "text-red-700" : needsAttention ? "text-amber-700" : "text-emerald-700"} />
          <Metric label="Open / Overdue Actions" value={`${openActions.length} / ${overdueActions}`} color={overdueActions ? "text-red-700" : "text-slate-900"} />
        </section>

        {audits.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">No submitted audits in this period</h2>
            <p className="mt-2 text-slate-600">Adjust the filters or submit additional audits to begin building trends.</p>
          </section>
        ) : (
          <>
            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Average Score Over Time</h2>
                  <p className="mt-1 text-sm text-slate-500">Monthly average for submitted audits in the selected period.</p>
                </div>
                <span className="text-sm font-semibold text-slate-500">Critical audits: {criticalCount}</span>
              </div>
              <TrendChart points={monthlyTrend} />
            </section>

            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Performance by Audit Type</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {typeBreakdown.map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200 p-5">
                    <span className="text-sm font-semibold text-slate-600">{item.label}</span>
                    <strong className={`mt-3 block text-3xl ${scoreColor(item.value)}`}>
                      {item.value}%
                    </strong>
                    <span className="mt-2 block text-xs text-slate-500">{item.count} audit{item.count === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-3">
              <PerformanceTable title="Technician Performance" rows={technicianPerformance} empty="No service-delivery technician data" />
              <PerformanceTable title="Location Performance" rows={locationPerformance} empty="No warehouse/location data" />
              <PerformanceTable title="Equipment & Vehicles" rows={assetPerformance} empty="No equipment or vehicle data" />
            </section>
          </>
        )}
      </div>

      <style>{`
        .field {
          width: 100%;
          min-height: 48px;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          color: rgb(15 23 42);
        }
      `}</style>
    </main>
  )
}

function buildPerformance(
  audits: Audit[],
  records: NamedRecord[],
  key: "technician_id" | "location_id" | "asset_id"
) {
  const labelMap = new Map(records.map((record) => [record.id, record.label]))
  const scores = new Map<string, number[]>()

  for (const audit of audits) {
    const id = audit[key]
    if (!id) continue
    scores.set(id, [...(scores.get(id) || []), Number(audit.overall_score)])
  }

  return Array.from(scores.entries())
    .map(([id, values]) => ({
      label: labelMap.get(id) || "Unknown",
      value: average(values) || 0,
      count: values.length,
    }))
    .sort((a, b) => b.value - a.value)
}

function TrendChart({
  points,
}: {
  points: { label: string; value: number; count: number }[]
}) {
  if (!points.length) return null

  const width = 900
  const height = 260
  const padX = 48
  const padY = 34
  const usableWidth = width - padX * 2
  const usableHeight = height - padY * 2
  const x = (index: number) =>
    points.length === 1
      ? width / 2
      : padX + (index / (points.length - 1)) * usableWidth
  const y = (value: number) => padY + ((100 - value) / 100) * usableHeight
  const polyline = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ")

  return (
    <div className="mt-6 overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[650px] w-full" role="img" aria-label="Average audit score over time">
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line x1={padX} x2={width - padX} y1={y(value)} y2={y(value)} stroke="#e2e8f0" strokeWidth="1" />
            <text x="8" y={y(value) + 4} fontSize="11" fill="#64748b">{value}%</text>
          </g>
        ))}
        {points.length > 1 && <polyline points={polyline} fill="none" stroke="#10b981" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={x(index)} cy={y(point.value)} r="6" fill="#10b981" stroke="white" strokeWidth="3" />
            <text x={x(index)} y={y(point.value) - 13} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">{point.value}%</text>
            <text x={x(index)} y={height - 8} textAnchor="middle" fontSize="11" fill="#64748b">{point.label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function Metric({ label, value, color = "text-slate-900" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <strong className={`mt-2 block text-3xl ${color}`}>{value}</strong>
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-800">{label}</span>
      {children}
    </label>
  )
}

function PerformanceTable({
  title,
  rows,
  empty,
}: {
  title: string
  rows: { label: string; value: number; count: number }[]
  empty: string
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {rows.length ? (
        <div className="mt-4 divide-y divide-slate-200">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-semibold text-slate-800">{row.label}</p>
                <p className="text-xs text-slate-500">{row.count} audit{row.count === 1 ? "" : "s"}</p>
              </div>
              <strong className={scoreColor(row.value)}>{row.value}%</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">{empty}</p>
      )}
    </section>
  )
}
