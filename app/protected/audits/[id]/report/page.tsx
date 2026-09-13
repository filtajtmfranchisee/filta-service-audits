import Image from "next/image"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import PrintReportButton from "./print-report-button"

type PageProps = {
  params: Promise<{ id: string }>
}

type Audit = {
  id: string
  audit_type: string | null
  audit_date: string | null
  status: string | null
  overall_score: number | null
  letter_grade: string | null
  result_classification: string | null
  critical_failure: boolean | null
  auditor_first_name: string | null
  auditor_last_name: string | null
  technician_id: string | null
  asset_id: string | null
  location_id: string | null
  oil_storage_system: string | null
  general_notes: string | null
  positive_observations: string | null
  improvement_areas: string | null
  immediate_concerns: string | null
  recommended_actions: string | null
  follow_up_required: boolean | null
  recommended_follow_up_date: string | null
  submitted_at: string | null
}

type AuditResponse = {
  id?: string
  question_key: string | null
  section_name: string | null
  question_text: string | null
  response_value: string | null
  auditor_comment: string | null
  issue_found?: boolean | null
  critical_failure?: boolean | null
}

type Technician = {
  first_name: string | null
  last_name: string | null
}

type Asset = {
  asset_type: string | null
  asset_number: string | null
  description: string | null
}

type Location = {
  name: string | null
  city?: string | null
  state?: string | null
}

type AuditPhoto = {
  id: string
  storage_path: string
  caption: string | null
  created_at: string
  signedUrl: string
}

type CorrectiveAction = {
  id: string
  question_key: string | null
  action_text: string | null
  owner_name: string | null
  due_date: string | null
  priority: string | null
  status: string | null
  completion_date: string | null
  completion_notes: string | null
}

const auditNames: Record<string, string> = {
  equipment: "MFU/MBU Equipment Audit",
  service_delivery: "Technician Service Delivery Audit",
  warehouse: "Warehouse and Oil Storage System Audit",
  vehicle: "Van and Service Vehicle Audit",
}

function formatDate(value: string | null) {
  if (!value) return "—"

  const parts = value.slice(0, 10).split("-")
  if (parts.length !== 3) return value

  return `${parts[1]}/${parts[2]}/${parts[0]}`
}

function formatResponse(value: string | null) {
  if (!value) return "Not Answered"
  if (value === "needs_attention") return "Needs Attention"
  if (value === "not_applicable") return "N/A"

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function responseClass(value: string | null) {
  if (value === "pass") return "bg-emerald-100 text-emerald-800"
  if (value === "needs_attention") return "bg-amber-100 text-amber-800"
  if (value === "fail") return "bg-red-100 text-red-800"

  return "bg-slate-100 text-slate-700"
}

export default async function CompletedAuditReportPage({
  params,
}: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.is_anonymous) {
    redirect("/auth/login")
  }

  const { data: auditData, error: auditError } =
    await supabase
      .from("audits")
      .select("*")
      .eq("id", id)
      .maybeSingle()

  if (auditError || !auditData) {
    notFound()
  }

  const audit = auditData as Audit

  const [
    responsesResult,
    technicianResult,
    assetResult,
    locationResult,
    photosResult,
    actionsResult,
  ] = await Promise.all([
    supabase
      .from("audit_responses")
      .select("*")
      .eq("audit_id", id)
      .order("created_at", { ascending: true }),

    audit.technician_id
      ? supabase
          .from("technicians")
          .select("first_name, last_name")
          .eq("id", audit.technician_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    audit.asset_id
      ? supabase
          .from("assets")
          .select("asset_type, asset_number, description")
          .eq("id", audit.asset_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    audit.location_id
      ? supabase
          .from("locations")
          .select("name, city, state")
          .eq("id", audit.location_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    supabase
      .from("audit_photos")
      .select("id, storage_path, caption, created_at")
      .eq("audit_id", id)
      .order("created_at", { ascending: true }),

    supabase
      .from("corrective_actions")
      .select(`
        id,
        question_key,
        action_text,
        owner_name,
        due_date,
        priority,
        status,
        completion_date,
        completion_notes
      `)
      .eq("audit_id", id)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ])

  if (responsesResult.error) {
    throw new Error(
      `Audit responses could not be loaded: ${responsesResult.error.message}`
    )
  }

  if (photosResult.error) {
    throw new Error(
      `Audit photos could not be loaded: ${photosResult.error.message}`
    )
  }

  if (actionsResult.error) {
    throw new Error(
      `Corrective actions could not be loaded: ${actionsResult.error.message}`
    )
  }

  const responses =
    (responsesResult.data ?? []) as AuditResponse[]
  const technician =
    technicianResult.data as Technician | null
  const asset = assetResult.data as Asset | null
  const location = locationResult.data as Location | null

  const photos = await Promise.all(
    (photosResult.data ?? []).map(async (photo) => {
      const { data } = await supabase.storage
        .from("audit-photos")
        .createSignedUrl(photo.storage_path, 3600)

      return {
        ...photo,
        signedUrl: data?.signedUrl || "",
      } as AuditPhoto
    })
  )

  const correctiveActions =
    (actionsResult.data ?? []) as CorrectiveAction[]

  const responseByQuestion = new Map(
    responses.map((response) => [response.question_key, response])
  )

  const technicianName = technician
    ? [technician.first_name, technician.last_name]
        .filter(Boolean)
        .join(" ")
    : "—"

  const assetName = asset
    ? [
        [asset.asset_type, asset.asset_number]
          .filter(Boolean)
          .join(" "),
        asset.description,
      ]
        .filter(Boolean)
        .join(" — ")
    : "—"

  const locationName = location
    ? [location.name, location.city, location.state]
        .filter(Boolean)
        .join(" — ")
    : "—"

  const auditorName = [
    audit.auditor_first_name,
    audit.auditor_last_name,
  ]
    .filter(Boolean)
    .join(" ")

  const groupedResponses = responses.reduce<
    Record<string, AuditResponse[]>
  >((groups, response) => {
    const section =
      response.section_name || "General Inspection"

    if (!groups[section]) groups[section] = []
    groups[section].push(response)

    return groups
  }, {})

  const needsAttention = responses.filter(
    (response) =>
      response.response_value === "needs_attention"
  ).length

  const failures = responses.filter(
    (response) => response.response_value === "fail"
  ).length

  const notes = [
    ["General Auditor Notes", audit.general_notes],
    ["Positive Observations", audit.positive_observations],
    ["Areas Requiring Improvement", audit.improvement_areas],
    ["Immediate Concerns", audit.immediate_concerns],
    ["Recommended Corrective Actions", audit.recommended_actions],
  ].filter(([, value]) => Boolean(value))

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <article className="report-document mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <nav className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
          <Link
            href="/protected/audits"
            className="font-semibold text-slate-700"
          >
            ← Management Reports
          </Link>

          <div className="flex flex-wrap gap-3">
            <PrintReportButton />

            <Link
              href="/protected/audits/new"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Start Another Audit
            </Link>
          </div>
        </nav>

        <header className="report-header grid gap-7 bg-slate-900 p-7 text-white sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <Image
            src="/filta-logo-clear.png"
            alt="Filta"
            width={220}
            height={85}
            className="h-auto max-h-20 w-auto max-w-44 object-contain"
            priority
          />

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
              Dorado Environmental
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              {auditNames[audit.audit_type || ""] ||
                "Service Audit"}
            </h1>

            <p className="mt-2 text-slate-300">
              Completed Audit Report
            </p>
          </div>

          <div className="rounded-xl border border-white/20 px-6 py-4 text-center">
            <span className="block text-xs text-slate-300">
              Final Result
            </span>
            <strong className="mt-1 block text-3xl text-emerald-400">
              {audit.overall_score === null
                ? "—"
                : `${audit.overall_score}%`}
            </strong>
            <span className="block text-sm font-bold">
              Grade {audit.letter_grade || "—"}
            </span>
          </div>
        </header>

        <section className="report-information grid border-b border-slate-200 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Audit Date" value={formatDate(audit.audit_date)} />
          <Info label="Auditor" value={auditorName || "—"} />
          <Info label="Technician" value={technicianName} />
          <Info label="Equipment/Vehicle" value={assetName} />
          <Info label="Warehouse/Location" value={locationName} />
          <Info
            label="Oil Storage System"
            value={audit.oil_storage_system || "—"}
          />
        </section>

        <section className="report-summary grid gap-3 bg-slate-50 p-6 sm:grid-cols-4">
          <Summary label="Questions" value={String(responses.length)} />
          <Summary label="Needs Attention" value={String(needsAttention)} warning={needsAttention > 0} />
          <Summary label="Failed" value={String(failures)} danger={failures > 0} />
          <Summary label="Classification" value={audit.result_classification || "—"} danger={Boolean(audit.critical_failure)} />
        </section>

        <div className="report-body space-y-6 p-6">
          {Object.entries(groupedResponses).map(
            ([section, sectionResponses]) => (
              <section key={section} className="report-section rounded-xl border border-slate-200 p-5">
                <h2 className="text-xl font-bold text-slate-900">
                  {section}
                </h2>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                        <th className="border-b p-3">Inspection Standard</th>
                        <th className="border-b p-3">Result</th>
                        <th className="border-b p-3">Auditor Comment</th>
                      </tr>
                    </thead>

                    <tbody>
                      {sectionResponses.map((response, index) => (
                        <tr key={response.question_key || index}>
                          <td className="border-b p-3 align-top">
                            {response.question_text || "Inspection question"}
                          </td>
                          <td className="border-b p-3 align-top">
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${responseClass(response.response_value)}`}>
                              {formatResponse(response.response_value)}
                            </span>
                          </td>
                          <td className="border-b p-3 align-top text-slate-600">
                            {response.auditor_comment || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          )}

          {correctiveActions.length > 0 && (
            <section className="report-section corrective-actions-section rounded-xl border border-slate-200 p-5">
              <h2 className="text-xl font-bold text-slate-900">
                Corrective Action Plan
              </h2>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                      <th className="border-b p-3">Finding</th>
                      <th className="border-b p-3">Action Required</th>
                      <th className="border-b p-3">Owner</th>
                      <th className="border-b p-3">Due</th>
                      <th className="border-b p-3">Priority</th>
                      <th className="border-b p-3">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {correctiveActions.map((action) => {
                      const response = responseByQuestion.get(action.question_key)

                      return (
                        <tr key={action.id}>
                          <td className="border-b p-3 align-top">
                            {response?.question_text || action.question_key || "Audit finding"}
                          </td>
                          <td className="border-b p-3 align-top">
                            {action.action_text || "—"}
                            {action.completion_notes && (
                              <p className="mt-2 text-xs text-slate-500">
                                <strong>Completion notes:</strong>{" "}
                                {action.completion_notes}
                              </p>
                            )}
                          </td>
                          <td className="border-b p-3 align-top">
                            {action.owner_name || "—"}
                          </td>
                          <td className="border-b p-3 align-top whitespace-nowrap">
                            {formatDate(action.due_date)}
                          </td>
                          <td className="border-b p-3 align-top capitalize">
                            {action.priority || "—"}
                          </td>
                          <td className="border-b p-3 align-top">
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                              action.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : action.status === "in_progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                            }`}>
                              {action.status === "in_progress"
                                ? "In Progress"
                                : action.status
                                  ? action.status.charAt(0).toUpperCase() + action.status.slice(1)
                                  : "Open"}
                            </span>
                            {action.completion_date && (
                              <span className="mt-1 block whitespace-nowrap text-xs text-slate-500">
                                {formatDate(action.completion_date)}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {photos.length > 0 && (
            <section className="report-section photo-section rounded-xl border border-slate-200 p-5">
              <h2 className="text-xl font-bold text-slate-900">
                Audit Photos
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {photos.map((photo, index) => (
                  <figure
                    key={photo.id}
                    className="photo-card overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {photo.signedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.signedUrl}
                        alt={photo.caption || `Audit photo ${index + 1}`}
                        className="h-64 w-full object-contain bg-white"
                      />
                    ) : (
                      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                        Photo preview unavailable
                      </div>
                    )}

                    <figcaption className="p-3 text-sm text-slate-700">
                      <span className="font-bold">Photo {index + 1}:</span>{" "}
                      {photo.caption || "No caption provided"}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {notes.length > 0 && (
            <section className="report-section rounded-xl border border-slate-200 p-5">
              <h2 className="text-xl font-bold text-slate-900">
                Auditor Notes
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {notes.map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      {label}
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {audit.follow_up_required && (
            <section className="follow-up-section rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
              <h2 className="font-bold">Follow-Up Inspection Required</h2>
              <p className="mt-1 text-sm">
                Recommended date: {formatDate(audit.recommended_follow_up_date)}
              </p>
            </section>
          )}
        </div>

        <footer className="report-footer flex flex-wrap justify-between gap-3 border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
          <span>Dorado Environmental Service Audit</span>
          <span>Audit ID: {audit.id}</span>
        </footer>
      </article>

      <style>{`
        @page {
          size: letter portrait;
          margin: 0.45in;
        }

        @media print {

          .no-print {
            display: none !important;
          }

          body nav,
          body header:not(.report-header),
          body footer:not(.report-footer),
          .auditNavigation {
            display: none !important;
          }

          body {
            margin: 0 !important;
          }

          .report-document {
            overflow: visible !important;
          }

          .report-header {
            grid-template-columns: 115px 1fr 120px !important;
            gap: 14px !important;
            padding: 14px 16px !important;
          }

          .report-header h1 {
            font-size: 20px !important;
            line-height: 1.15 !important;
          }

          .report-header img {
            max-width: 105px !important;
            max-height: 55px !important;
          }

          .report-information {
            grid-template-columns: repeat(3, 1fr) !important;
          }

          .report-information > div {
            padding: 9px 11px !important;
          }

          .report-summary {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 7px !important;
            padding: 9px 12px !important;
          }

          .report-summary > div {
            padding: 8px 10px !important;
          }

          .report-body {
            padding: 10px 12px !important;
          }

          .report-section {
            margin: 0 0 10px !important;
            padding: 11px !important;
            break-inside: auto;
          }

          .report-section h2 {
            font-size: 16px !important;
            margin-bottom: 6px !important;
          }

          .report-section table {
            font-size: 9px !important;
            line-height: 1.25 !important;
          }

          .report-section thead {
            display: table-header-group;
          }

          .report-section tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .report-section th,
          .report-section td {
            padding: 5px 6px !important;
          }

          .report-section th:nth-child(2),
          .report-section td:nth-child(2) {
            width: 92px;
          }

          .report-section th:nth-child(3),
          .report-section td:nth-child(3) {
            width: 145px;
          }

          .follow-up-section {
            break-inside: avoid;
            padding: 10px 12px !important;
          }

          .photo-section {
            break-before: page;
          }

          .corrective-actions-section {
            break-before: page;
          }

          .corrective-actions-section table {
            font-size: 8px !important;
          }

          .corrective-actions-section th,
          .corrective-actions-section td {
            padding: 5px !important;
          }

          .corrective-actions-section th:nth-child(1),
          .corrective-actions-section td:nth-child(1) {
            width: 25%;
          }

          .corrective-actions-section th:nth-child(2),
          .corrective-actions-section td:nth-child(2) {
            width: 27%;
          }

          .photo-section > div {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }

          .photo-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .photo-card img,
          .photo-card > div:first-child {
            height: 210px !important;
          }

          .photo-card figcaption {
            font-size: 9px !important;
            padding: 6px 8px !important;
          }

          .report-footer {
            padding: 8px 12px !important;
            font-size: 8px !important;
          }

          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-200 p-5 sm:border-r">
      <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <strong className="mt-2 block text-sm text-slate-900">
        {value}
      </strong>
    </div>
  )
}

function Summary({
  label,
  value,
  warning = false,
  danger = false,
}: {
  label: string
  value: string
  warning?: boolean
  danger?: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <strong
        className={`mt-2 block text-lg ${
          danger
            ? "text-red-700"
            : warning
              ? "text-amber-700"
              : "text-slate-900"
        }`}
      >
        {value}
      </strong>
    </div>
  )
}
