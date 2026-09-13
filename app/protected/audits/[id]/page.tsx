import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import AuditForm from "./audit-form"

const auditNames: Record<string, string> = {
  equipment: "MFU/MBU Equipment Audit",
  service_delivery: "Technician Service Delivery Audit",
  warehouse: "Warehouse and Oil Storage System Audit",
  vehicle: "Van and Service Vehicle Audit",
}

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: audit, error } = await supabase
    .from("audits")
    .select(`
      id,
      audit_type,
      audit_date,
      status,
      general_notes,
      auditor_first_name,
      auditor_last_name,
      oil_storage_system
    `)
    .eq("id", id)
    .maybeSingle()

  if (error || !audit) {
    notFound()
  }

  const { data: savedResponses } = await supabase
    .from("audit_responses")
    .select(
      "question_key, response_value, auditor_comment"
    )
    .eq("audit_id", id)

  const title =
    auditNames[audit.audit_type] || "Service Audit"

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/protected/audits/new"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Choose Another Audit
        </Link>

        <section className="mt-6 rounded-2xl bg-slate-900 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Dorado Environmental
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {title}
          </h1>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-4 py-2">
              Auditor: {audit.auditor_first_name}{" "}
              {audit.auditor_last_name}
            </span>

            <span className="rounded-full bg-white/10 px-4 py-2">
              Audit Date: {audit.audit_date}
            </span>

            {audit.audit_type === "warehouse" &&
              audit.oil_storage_system && (
                <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-emerald-100">
                  Oil Storage System:{" "}
                  {audit.oil_storage_system}
                </span>
              )}

            <span className="rounded-full bg-white/10 px-4 py-2 capitalize">
              Status: {audit.status}
            </span>
          </div>
        </section>

        <div className="mt-8">
          <AuditForm
            auditId={audit.id}
            auditType={audit.audit_type}
            isManagementUser={!user.is_anonymous}
            initialStatus={audit.status}
            oilStorageSystem={
              audit.oil_storage_system || null
            }
            initialGeneralNotes={
              audit.general_notes || ""
            }
            initialResponses={savedResponses || []}
          />
        </div>
      </div>
    </main>
  )
}
