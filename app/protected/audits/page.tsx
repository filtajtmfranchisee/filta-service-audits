import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import ExportButtons from "./export-buttons"
import AuditRecordActions from "./audit-record-actions"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type PageProps = {
  searchParams: Promise<{
    from?: string
    to?: string
    type?: string
    technician?: string
    status?: string
  }>
}

type AuditRecord = {
  id: string
  audit_date: string | null
  audit_type: string | null
  technician_id: string | null
  asset_id: string | null
  location_id: string | null
  auditor_first_name: string | null
  auditor_last_name: string | null
  overall_score: number | null
  letter_grade: string | null
  result_classification: string | null
  critical_failure: boolean | null
  oil_storage_system: string | null
  status: string | null
  created_at: string | null
}

type Technician = {
  id: string
  first_name: string | null
  last_name: string | null
  name?: string | null
  active?: boolean | null
}

type Asset = {
  id: string
  name: string | null
  asset_number?: string | null
  unit_number?: string | null
}

type Location = {
  id: string
  name: string
}

type ManagementUser = {
  role:
    | "administrator"
    | "manager"
    | "auditor"
    | "read_only"
  is_active: boolean
}

const AUDIT_TYPES = [
  {
    value: "equipment",
    label: "MFU/MBU Equipment",
  },
  {
    value: "service_delivery",
    label: "Technician Service Delivery",
  },
  {
    value: "warehouse",
    label: "Warehouse and Oil Storage System",
  },
  {
    value: "vehicle",
    label: "Van/Service Vehicle",
  },
]

function getAuditTypeLabel(value: string | null) {
  if (!value) return "Audit"

  const matchingType = AUDIT_TYPES.find(
    (auditType) => auditType.value === value
  )

  if (matchingType) return matchingType.label

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    )
}

function getPrintAuditTypeLabel(value: string | null) {
  if (value === "equipment") return "MFU/MBU"
  if (value === "service_delivery")
    return "Service Delivery"
  if (value === "warehouse")
    return "Warehouse / Oil Storage"
  if (value === "vehicle") return "Vehicle"

  return getAuditTypeLabel(value)
}

function getTechnicianName(
  technician: Technician
) {
  if (technician.name?.trim()) {
    return technician.name.trim()
  }

  const fullName = [
    technician.first_name,
    technician.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim()

  return fullName || "Unnamed technician"
}

function getAuditorName(audit: AuditRecord) {
  const fullName = [
    audit.auditor_first_name,
    audit.auditor_last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim()

  return fullName || "Not entered"
}

function getGrade(score: number | null) {
  if (
    score === null ||
    score === undefined
  ) {
    return "—"
  }

  if (score >= 90) return "A"
  if (score >= 80) return "B"
  if (score >= 70) return "C"
  if (score >= 60) return "D"

  return "F"
}

function formatDate(value: string | null) {
  if (!value) return "—"

  const parts =
    value.slice(0, 10).split("-")

  if (parts.length !== 3) return value

  return `${parts[1]}/${parts[2]}/${parts[0]}`
}

function isCritical(audit: AuditRecord) {
  return (
    audit.critical_failure === true ||
    audit.result_classification ===
      "Critical Action Required"
  )
}

async function requireRecordManager() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.is_anonymous) {
    redirect("/auth/login")
  }

  const {
    data: managementUser,
  } = await supabaseAdmin
    .from("management_users")
    .select("role, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (
    !managementUser ||
    !managementUser.is_active ||
    ![
      "administrator",
      "manager",
    ].includes(managementUser.role)
  ) {
    throw new Error(
      "You do not have permission to modify audit records."
    )
  }

  return supabase
}

export default async function AuditResultsPage({
  searchParams,
}: PageProps) {
  const filters = await searchParams

  const supabase =
    await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.is_anonymous) {
    redirect("/auth/login")
  }

  const {
    data: managementUser,
    error: managementUserError,
  } = await supabaseAdmin
    .from("management_users")
    .select("role, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (
    managementUserError ||
    !managementUser ||
    !managementUser.is_active
  ) {
    redirect("/protected")
  }

  const currentUser =
    managementUser as ManagementUser

  const isAdministrator =
    currentUser.role === "administrator"

  const isManager =
    currentUser.role === "manager"

  const isAuditor =
    currentUser.role === "auditor"

  const isReadOnly =
    currentUser.role === "read_only"

  const canManageRecords =
    isAdministrator || isManager

  const canStartAudit =
    isAdministrator ||
    isManager ||
    isAuditor

  let auditQuery = supabase
    .from("audits")
    .select("*")
    .order("audit_date", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    })

  if (filters.from) {
    auditQuery = auditQuery.gte(
      "audit_date",
      filters.from
    )
  }

  if (filters.to) {
    auditQuery = auditQuery.lte(
      "audit_date",
      filters.to
    )
  }

  if (filters.type) {
    auditQuery = auditQuery.eq(
      "audit_type",
      filters.type
    )
  }

  if (filters.technician) {
    auditQuery = auditQuery.eq(
      "technician_id",
      filters.technician
    )
  }

  if (filters.status) {
    auditQuery =
      filters.status === "critical"
        ? auditQuery.eq(
            "critical_failure",
            true
          )
        : auditQuery.eq(
            "status",
            filters.status
          )
  }

  const [
    auditsResult,
    techniciansResult,
    assetsResult,
    locationsResult,
  ] = await Promise.all([
    auditQuery,

    supabase
      .from("technicians")
      .select("*")
      .order("first_name", {
        ascending: true,
      }),

    supabase
      .from("assets")
      .select("*")
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("locations")
      .select("*")
      .order("name", {
        ascending: true,
      }),
  ])

  if (auditsResult.error) {
    throw new Error(
      `Audit results could not be loaded: ${auditsResult.error.message}`
    )
  }

  const audits =
    (auditsResult.data ??
      []) as AuditRecord[]

  const technicians =
    (techniciansResult.data ??
      []) as Technician[]

  const assets =
    (assetsResult.data ??
      []) as Asset[]

  const locations =
    (locationsResult.data ??
      []) as Location[]

  const technicianNames =
    new Map(
      technicians.map(
        (technician) => [
          technician.id,
          getTechnicianName(
            technician
          ),
        ]
      )
    )

  const assetNames =
    new Map(
      assets.map((asset) => [
        asset.id,
        asset.name ||
          asset.asset_number ||
          asset.unit_number ||
          "Unnamed equipment",
      ])
    )

  const locationNames =
    new Map(
      locations.map(
        (location) => [
          location.id,
          location.name,
        ]
      )
    )

  const submittedAudits =
    audits.filter(
      (audit) =>
        audit.status ===
        "submitted"
    )

  const scoredAudits =
    audits.filter(
      (audit) =>
        typeof audit.overall_score ===
        "number"
    )

  const averageScore =
    scoredAudits.length > 0
      ? Math.round(
          scoredAudits.reduce(
            (total, audit) =>
              total +
              Number(
                audit.overall_score
              ),
            0
          ) /
            scoredAudits.length
        )
      : null

  const criticalAudits =
    audits.filter(isCritical).length

  async function reopenAudit(
    formData: FormData
  ) {
    "use server"

    const supabase =
      await requireRecordManager()

    const auditId = String(
      formData.get("audit_id") || ""
    )

    if (!auditId) {
      throw new Error(
        "Audit ID is required."
      )
    }

    const { error } = await supabase
      .from("audits")
      .update({
        status: "draft",
        overall_score: null,
        letter_grade: null,
        result_classification: null,
        critical_failure: false,
        submitted_at: null,
      })
      .eq("id", auditId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(
      "/protected/audits"
    )
  }

  async function deleteDraft(
    formData: FormData
  ) {
    "use server"

    const supabase =
      await requireRecordManager()

    const auditId = String(
      formData.get("audit_id") || ""
    )

    if (!auditId) {
      throw new Error(
        "Audit ID is required."
      )
    }

    const {
      data: audit,
    } = await supabase
      .from("audits")
      .select("status")
      .eq("id", auditId)
      .maybeSingle()

    if (
      !audit ||
      audit.status === "submitted"
    ) {
      throw new Error(
        "Only draft audits can be deleted."
      )
    }

    const {
      data: photos,
    } = await supabase
      .from("audit_photos")
      .select("storage_path")
      .eq("audit_id", auditId)

    const storagePaths =
      (photos ?? [])
        .map(
          (photo) =>
            photo.storage_path
        )
        .filter(Boolean)

    if (
      storagePaths.length > 0
    ) {
      const {
        error: storageError,
      } =
        await supabase.storage
          .from("audit-photos")
          .remove(storagePaths)

      if (storageError) {
        throw new Error(
          storageError.message
        )
      }
    }

    const { error } =
      await supabase
        .from("audits")
        .delete()
        .eq("id", auditId)

    if (error) {
      throw new Error(
        error.message
      )
    }

    revalidatePath(
      "/protected/audits"
    )
  }

  return (
    <main className="page">
      <div className="container">
        <nav className="topNavigation noPrint">
          <Link href="/protected">
            ← Dashboard
          </Link>

          <div className="navigationLinks">
            {canStartAudit && (
              <Link href="/protected/audits/new">
                Start New Audit
              </Link>
            )}

            {canManageRecords && (
              <Link href="/protected/admin">
                Administration
              </Link>
            )}
          </div>
        </nav>

        <section className="hero">
          <Image
            src="/filta-logo-clear.png"
            alt="Filta"
            width={240}
            height={90}
            className="heroLogo"
            priority
          />

          <p className="eyebrow">
            DORADO ENVIRONMENTAL
          </p>

          <h1>Audit Results</h1>

          <p className="heroText">
            Review, filter and export
            service-audit results.
          </p>

          <p className="roleLabel">
            {isAdministrator
              ? "Administrator"
              : isManager
                ? "Manager"
                : isAuditor
                  ? "Auditor — View Only"
                  : isReadOnly
                    ? "Read Only"
                    : ""}
          </p>
        </section>

        <form className="filters noPrint">
          <div className="field">
            <label htmlFor="from">
              From Date
            </label>

            <input
              id="from"
              name="from"
              type="date"
              defaultValue={
                filters.from ?? ""
              }
            />
          </div>

          <div className="field">
            <label htmlFor="to">
              To Date
            </label>

            <input
              id="to"
              name="to"
              type="date"
              defaultValue={
                filters.to ?? ""
              }
            />
          </div>

          <div className="field">
            <label htmlFor="type">
              Audit Type
            </label>

            <select
              id="type"
              name="type"
              defaultValue={
                filters.type ?? ""
              }
            >
              <option value="">
                All audit types
              </option>

              {AUDIT_TYPES.map(
                (auditType) => (
                  <option
                    key={
                      auditType.value
                    }
                    value={
                      auditType.value
                    }
                  >
                    {
                      auditType.label
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div className="field">
            <label htmlFor="technician">
              Technician
            </label>

            <select
              id="technician"
              name="technician"
              defaultValue={
                filters.technician ??
                ""
              }
            >
              <option value="">
                All technicians
              </option>

              {technicians.map(
                (technician) => (
                  <option
                    key={
                      technician.id
                    }
                    value={
                      technician.id
                    }
                  >
                    {getTechnicianName(
                      technician
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="field">
            <label htmlFor="status">
              Status
            </label>

            <select
              id="status"
              name="status"
              defaultValue={
                filters.status ??
                ""
              }
            >
              <option value="">
                All statuses
              </option>

              <option value="draft">
                Draft
              </option>

              <option value="submitted">
                Submitted
              </option>

              <option value="critical">
                Critical
              </option>
            </select>
          </div>

          <div className="filterActions">
            <button type="submit">
              Apply Filters
            </button>

            <Link href="/protected/audits">
              Clear
            </Link>
          </div>
        </form>

        <section className="summaryGrid">
          <article className="summaryCard">
            <span>
              Audits Shown
            </span>

            <strong>
              {audits.length}
            </strong>
          </article>

          <article className="summaryCard">
            <span>
              Submitted
            </span>

            <strong>
              {
                submittedAudits.length
              }
            </strong>
          </article>

          <article className="summaryCard">
            <span>
              Average Score
            </span>

            <strong>
              {averageScore === null
                ? "—"
                : `${averageScore}%`}
            </strong>
          </article>

          <article className="summaryCard criticalCard">
            <span>
              Critical Results
            </span>

            <strong>
              {criticalAudits}
            </strong>
          </article>
        </section>

        <section className="resultsSection">
          <div className="resultsHeading">
            <div>
              <h2>
                Audit Records
              </h2>

              <p>
                Exports include the
                records currently shown
                below.
              </p>
            </div>

            <div className="noPrint">
              <ExportButtons />
            </div>
          </div>

          {audits.length === 0 ? (
            <div className="emptyState">
              <h3>
                No audits found
              </h3>

              <p>
                Adjust the filters or
                begin a new audit.
              </p>
            </div>
          ) : (
            <div className="tableWrapper">
              <table
                data-audit-results-table
              >
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>
                      Audit Type
                    </th>
                    <th>
                      Technician
                    </th>
                    <th>
                      Equipment /
                      Location
                    </th>
                    <th>
                      Auditor
                    </th>
                    <th>
                      Score / Grade
                    </th>
                    <th>
                      Status
                    </th>
                    <th className="actionColumn noPrint">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {audits.map(
                    (audit) => {
                      const technicianName =
                        audit.technician_id
                          ? technicianNames.get(
                              audit.technician_id
                            )
                          : null

                      const assetName =
                        audit.asset_id
                          ? assetNames.get(
                              audit.asset_id
                            )
                          : null

                      const locationName =
                        audit.location_id
                          ? locationNames.get(
                              audit.location_id
                            )
                          : null

                      const equipmentOrLocation =
                        audit.audit_type ===
                        "warehouse"
                          ? [
                              locationName,
                              audit.oil_storage_system
                                ? `${audit.oil_storage_system} Oil Storage`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" — ")
                          : assetName ||
                            locationName ||
                            "—"

                      const savedGrade =
                        audit.letter_grade ||
                        getGrade(
                          audit.overall_score
                        )

                      return (
                        <tr key={audit.id}>
                          <td>
                            {formatDate(
                              audit.audit_date
                            )}
                          </td>

                          <td>
                            <span className="screenAuditType">
                              {getAuditTypeLabel(
                                audit.audit_type
                              )}
                            </span>

                            <span className="printAuditType">
                              {getPrintAuditTypeLabel(
                                audit.audit_type
                              )}
                            </span>
                          </td>

                          <td>
                            {technicianName ||
                              "—"}
                          </td>

                          <td>
                            {
                              equipmentOrLocation
                            }
                          </td>

                          <td>
                            {getAuditorName(
                              audit
                            )}
                          </td>

                          <td>
                            {audit.overall_score ===
                            null
                              ? "—"
                              : `${Math.round(
                                  Number(
                                    audit.overall_score
                                  )
                                )}% / ${savedGrade}`}
                          </td>

                          <td>
                            <span
                              className={`status status-${
                                audit.status ??
                                "draft"
                              }`}
                            >
                              {audit.status ||
                                "draft"}
                            </span>
                          </td>

                          <td className="actionColumn noPrint">
                            <AuditRecordActions
                              auditId={
                                audit.id
                              }
                              status={
                                audit.status ||
                                "draft"
                              }
                              canManageRecords={
                                canManageRecords
                              }
                              openHref={
                                audit.status ===
                                "submitted"
                                  ? `/protected/audits/${audit.id}/report`
                                  : canManageRecords
                                    ? `/protected/audits/${audit.id}`
                                    : `/protected/audits/${audit.id}/report`
                              }
                              reopenAction={
                                reopenAudit
                              }
                              deleteAction={
                                deleteDraft
                              }
                            />
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f1f5f9;
          color: #11182f;
          font-family: Arial, Helvetica, sans-serif;
        }

        .page {
          min-height: 100vh;
          padding: 38px 20px 70px;
        }

        .container {
          width: min(1280px, 100%);
          margin: 0 auto;
        }

        .topNavigation {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .topNavigation a {
          color: #253453;
          font-weight: 700;
          text-decoration: none;
        }

        .navigationLinks {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        .recordActions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          min-width: 215px;
        }

        .recordActions form {
          margin: 0;
        }

        .recordActions button {
          border-radius: 8px;
          padding: 7px 10px;
          background: white;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .reopenButton {
          border: 1px solid #94a3b8;
          color: #334155;
        }

        .deleteButton {
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        .hero {
          padding: 32px;
          border-radius: 22px;
          background: #10152c;
          color: white;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
        }

        .heroLogo {
          display: block;
          width: auto;
          max-width: 185px;
          height: auto;
          max-height: 70px;
          margin-bottom: 20px;
          object-fit: contain;
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #58d49a;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(30px, 5vw, 46px);
        }

        .heroText {
          margin: 12px 0 0;
          color: #dbe4ff;
          font-size: 17px;
        }

        .roleLabel {
          margin: 12px 0 0;
          color: #58d49a;
          font-size: 13px;
          font-weight: 800;
        }

        .filters {
          display: grid;
          grid-template-columns: repeat(5, minmax(150px, 1fr));
          gap: 16px;
          margin-top: 24px;
          padding: 22px;
          border: 1px solid #dbe2ea;
          border-radius: 16px;
          background: white;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field label {
          font-size: 13px;
          font-weight: 800;
        }

        .field input,
        .field select {
          width: 100%;
          min-height: 44px;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          background: white;
          color: #11182f;
          font: inherit;
        }

        .filterActions {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .filterActions button {
          min-height: 44px;
          padding: 10px 22px;
          border: 0;
          border-radius: 9px;
          background: #57bb83;
          color: white;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .filterActions a {
          color: #253453;
          font-weight: 700;
          text-decoration: none;
        }

        .summaryGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 24px;
        }

        .summaryCard {
          padding: 22px;
          border: 1px solid #dbe2ea;
          border-radius: 16px;
          background: white;
        }

        .summaryCard span {
          display: block;
          margin-bottom: 9px;
          color: #64748b;
          font-size: 14px;
          font-weight: 700;
        }

        .summaryCard strong {
          font-size: 30px;
        }

        .criticalCard strong {
          color: #c0392b;
        }

        .resultsSection {
          margin-top: 24px;
          padding: 24px;
          border: 1px solid #dbe2ea;
          border-radius: 16px;
          background: white;
        }

        .resultsHeading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 18px;
        }

        .resultsHeading h2 {
          margin: 0 0 6px;
        }

        .resultsHeading p {
          margin: 0;
          color: #64748b;
        }

        .tableWrapper {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        th,
        td {
          padding: 14px 13px;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
          vertical-align: middle;
          white-space: nowrap;
        }

        th {
          background: #f8fafc;
          color: #475569;
          font-size: 12px;
          letter-spacing: 0.35px;
          text-transform: uppercase;
        }

        td {
          font-size: 14px;
        }

        tbody tr:last-child td {
          border-bottom: 0;
        }

        tbody tr:hover {
          background: #f8fafc;
        }

        .status {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          background: #e2e8f0;
          font-size: 12px;
          font-weight: 800;
          text-transform: capitalize;
        }

        .status-submitted {
          background: #dcfce7;
          color: #166534;
        }

        .status-draft {
          background: #fef3c7;
          color: #92400e;
        }

        .status-critical {
          background: #fee2e2;
          color: #991b1b;
        }

        .openLink {
          color: #168554;
          font-weight: 800;
          text-decoration: none;
        }

        .printAuditType {
          display: none;
        }

        .actionColumn {
          position: sticky;
          right: 0;
          z-index: 2;
          min-width: 112px;
          background: white;
          box-shadow: -5px 0 8px rgba(15, 23, 42, 0.05);
        }

        th.actionColumn {
          z-index: 3;
          background: #f8fafc;
        }

        tbody tr:hover .actionColumn {
          background: #f8fafc;
        }

        .emptyState {
          padding: 50px 20px;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          text-align: center;
        }

        .emptyState h3 {
          margin: 0 0 8px;
        }

        .emptyState p {
          margin: 0;
          color: #64748b;
        }

        @media (max-width: 1000px) {
          .filters {
            grid-template-columns: repeat(2, 1fr);
          }

          .summaryGrid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 650px) {
          .page {
            padding: 20px 12px 50px;
          }

          .topNavigation,
          .resultsHeading {
            align-items: stretch;
            flex-direction: column;
          }

          .filters,
          .summaryGrid {
            grid-template-columns: 1fr;
          }

          .hero,
          .resultsSection {
            padding: 20px;
          }
        }

        @page {
          size: letter landscape;
          margin: 0.4in;
        }

        @media print {
          body,
          .page {
            background: white;
          }

          body {
            margin: 0 !important;
          }

          body nav,
          body header,
          body footer,
          .auditNavigation {
            display: none !important;
          }

          .page {
            padding: 0;
          }

          .noPrint {
            display: none !important;
          }

          .hero {
            display: grid;
            grid-template-columns: 145px 1fr;
            column-gap: 22px;
            align-items: center;
            padding: 18px 22px;
            border-radius: 0;
            box-shadow: none;
            background: #10152c !important;
            color: white !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .heroLogo {
            grid-row: 1 / 5;
            max-width: 130px;
            max-height: 60px;
            margin: 0;
          }

          .eyebrow {
            margin-bottom: 3px;
            color: #58d49a !important;
            font-size: 10px;
          }

          .hero h1 {
            font-size: 25px;
          }

          .heroText {
            margin-top: 4px;
            color: #dbe4ff !important;
            font-size: 11px;
          }

          .roleLabel {
            display: none;
          }

          .summaryGrid {
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-top: 10px;
          }

          .summaryCard,
          .resultsSection {
            box-shadow: none;
          }

          .summaryCard {
            padding: 10px 12px;
            border-radius: 8px;
          }

          .summaryCard span {
            margin-bottom: 3px;
            font-size: 9px;
          }

          .summaryCard strong {
            font-size: 20px;
          }

          .resultsSection {
            margin-top: 10px;
            padding: 10px 0 0;
            border: 0;
          }

          .resultsHeading {
            margin-bottom: 8px;
          }

          .resultsHeading h2 {
            margin-bottom: 2px;
            font-size: 16px;
          }

          .resultsHeading p {
            font-size: 9px;
          }

          .tableWrapper {
            overflow: visible;
            border-radius: 0;
          }

          table {
            table-layout: fixed;
            font-size: 8px !important;
          }

          thead {
            display: table-header-group;
          }

          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          th,
          td {
            padding: 5px 3px;
            font-size: 8px !important;
            white-space: normal;
            line-height: 1.2;
            overflow-wrap: anywhere;
          }

          th {
            background: #f1f5f9 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .screenAuditType {
            display: none;
          }

          .printAuditType {
            display: inline;
          }
        }
      `}</style>
    </main>
  )
}