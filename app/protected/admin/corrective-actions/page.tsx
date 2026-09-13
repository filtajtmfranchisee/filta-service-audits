import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

type Action = {
  id: string
  audit_id: string
  question_key: string
  action_text: string | null
  owner_name: string | null
  due_date: string | null
  priority: string | null
  status: string | null
  completion_date: string | null
  completion_notes: string | null
  created_at: string
}

type Audit = {
  id: string
  audit_type: string | null
  audit_date: string | null
  auditor_first_name: string | null
  auditor_last_name: string | null
}

type Response = {
  audit_id: string
  question_key: string | null
  question_text: string | null
}

const auditNames: Record<string, string> = {
  equipment: "MFU/MBU Equipment",
  service_delivery: "Service Delivery",
  warehouse: "Warehouse / Oil Storage",
  vehicle: "Service Vehicle",
}

function formatDate(value: string | null) {
  if (!value) return "—"
  const [year, month, day] = value.slice(0, 10).split("-")
  return year && month && day ? `${month}/${day}/${year}` : value
}

function todayEastern() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export default async function CorrectiveActionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.is_anonymous) redirect("/auth/login")

  const { data: actionData, error } = await supabase
    .from("corrective_actions")
    .select(`
      id,
      audit_id,
      question_key,
      action_text,
      owner_name,
      due_date,
      priority,
      status,
      completion_date,
      completion_notes,
      created_at
    `)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  const actions = (actionData ?? []) as Action[]
  const auditIds = Array.from(new Set(actions.map((action) => action.audit_id)))

  const [auditsResult, responsesResult] = auditIds.length
    ? await Promise.all([
        supabase
          .from("audits")
          .select("id, audit_type, audit_date, auditor_first_name, auditor_last_name")
          .in("id", auditIds),
        supabase
          .from("audit_responses")
          .select("audit_id, question_key, question_text")
          .in("audit_id", auditIds),
      ])
    : [{ data: [] }, { data: [] }]

  const audits = (auditsResult.data ?? []) as Audit[]
  const responses = (responsesResult.data ?? []) as Response[]
  const auditMap = new Map(audits.map((audit) => [audit.id, audit]))
  const questionMap = new Map(
    responses.map((response) => [
      `${response.audit_id}:${response.question_key}`,
      response.question_text,
    ])
  )

  const today = todayEastern()
  const openActions = actions.filter((action) => action.status !== "completed")
  const overdue = openActions.filter(
    (action) => Boolean(action.due_date && action.due_date < today)
  ).length
  const dueSoon = openActions.filter((action) => {
    if (!action.due_date || action.due_date < today) return false
    const due = new Date(`${action.due_date}T12:00:00Z`).getTime()
    const now = new Date(`${today}T12:00:00Z`).getTime()
    return due - now <= 7 * 24 * 60 * 60 * 1000
  }).length

  async function updateCorrectiveAction(formData: FormData) {
    "use server"

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.is_anonymous) redirect("/auth/login")

    const id = String(formData.get("id") || "")
    const status = String(formData.get("status") || "open")
    const ownerName = String(formData.get("owner_name") || "").trim()
    const dueDate = String(formData.get("due_date") || "")
    const completionNotes = String(
      formData.get("completion_notes") || ""
    ).trim()

    if (!id) throw new Error("Corrective action ID is required.")

    const { error } = await supabase
      .from("corrective_actions")
      .update({
        status,
        owner_name: ownerName || null,
        due_date: dueDate || null,
        completion_notes: completionNotes || null,
        completion_date:
          status === "completed" ? todayEastern() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) throw new Error(error.message)
    revalidatePath("/protected/admin/corrective-actions")
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/protected/admin"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Return to Dashboard
          </Link>
          <Link
            href="/protected/audits"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-600"
          >
            Management Reports →
          </Link>
        </div>

        <header className="mt-6 rounded-2xl bg-slate-900 p-8 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Dorado Environmental
          </p>
          <h1 className="mt-2 text-3xl font-bold">Corrective Actions</h1>
          <p className="mt-3 text-slate-300">
            Track audit findings, accountability, due dates and completion.
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-4">
          <Metric label="Total Actions" value={actions.length} />
          <Metric label="Open" value={openActions.length} />
          <Metric label="Due Within 7 Days" value={dueSoon} warning={dueSoon > 0} />
          <Metric label="Overdue" value={overdue} danger={overdue > 0} />
        </section>

        <section className="mt-8 space-y-5">
          {actions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">No corrective actions yet</h2>
              <p className="mt-2 text-slate-600">
                Needs Attention and Fail findings will appear here after an audit is saved.
              </p>
            </div>
          ) : (
            actions.map((action) => {
              const audit = auditMap.get(action.audit_id)
              const isComplete = action.status === "completed"
              const isOverdue = Boolean(
                !isComplete && action.due_date && action.due_date < today
              )
              const question = questionMap.get(
                `${action.audit_id}:${action.question_key}`
              )

              return (
                <article
                  key={action.id}
                  className={`rounded-2xl border bg-white p-6 shadow-sm ${
                    isOverdue ? "border-red-300" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                          {auditNames[audit?.audit_type || ""] || "Service Audit"}
                        </span>
                        <span className={`rounded-full px-3 py-1 ${
                          action.priority === "critical" || action.priority === "high"
                            ? "bg-red-100 text-red-800"
                            : action.priority === "medium"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                        }`}>
                          {action.priority || "Medium"} priority
                        </span>
                        {isOverdue && (
                          <span className="rounded-full bg-red-600 px-3 py-1 text-white">Overdue</span>
                        )}
                      </div>

                      <h2 className="mt-4 text-lg font-bold text-slate-900">
                        {action.action_text || "Corrective action required"}
                      </h2>
                      <p className="mt-2 text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">Finding:</span>{" "}
                        {question || action.question_key}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Audit date: {formatDate(audit?.audit_date || null)} · Auditor:{" "}
                        {[audit?.auditor_first_name, audit?.auditor_last_name]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </p>
                    </div>

                    <Link
                      href={`/protected/audits/${action.audit_id}/report`}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      View Audit
                    </Link>
                  </div>

                  <form action={updateCorrectiveAction} className="mt-6 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-4">
                    <input type="hidden" name="id" value={action.id} />

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-800">Owner</span>
                      <input
                        name="owner_name"
                        defaultValue={action.owner_name || ""}
                        placeholder="First and last name"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-800">Due Date</span>
                      <input
                        type="date"
                        name="due_date"
                        defaultValue={action.due_date || ""}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-800">Status</span>
                      <select
                        name="status"
                        defaultValue={action.status || "open"}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </label>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="min-h-11 w-full rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-white hover:bg-emerald-400"
                      >
                        Save Update
                      </button>
                    </div>

                    <label className="block md:col-span-4">
                      <span className="mb-2 block text-sm font-semibold text-slate-800">Completion Notes</span>
                      <textarea
                        name="completion_notes"
                        rows={2}
                        defaultValue={action.completion_notes || ""}
                        placeholder="Document what was completed or the current progress"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900"
                      />
                    </label>
                  </form>
                </article>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}

function Metric({
  label,
  value,
  warning = false,
  danger = false,
}: {
  label: string
  value: number
  warning?: boolean
  danger?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <strong className={`mt-2 block text-3xl ${
        danger ? "text-red-700" : warning ? "text-amber-700" : "text-slate-900"
      }`}>
        {value}
      </strong>
    </div>
  )
}
