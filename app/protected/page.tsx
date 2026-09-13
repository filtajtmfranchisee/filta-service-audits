import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import CorrectiveActionComplete from "./corrective-action-complete"

type ManagementUser = {
  full_name: string | null
  email: string
  role:
    | "administrator"
    | "manager"
    | "auditor"
    | "read_only"
  is_active: boolean
  must_change_password: boolean
}

type CorrectiveAction = {
  id: string
  audit_id: string
  action_text: string | null
  owner_name: string | null
  due_date: string | null
  priority: string | null
  status: string | null
}

type Audit = {
  id: string
  audit_type: string | null
  audit_date: string | null
}

const auditNames: Record<string, string> = {
  equipment: "MFU/MBU Equipment",
  service_delivery: "Service Delivery",
  warehouse: "Warehouse / Oil Storage",
  vehicle: "Service Vehicle",
}

function formatDate(value: string | null) {
  if (!value) return "—"

  const [year, month, day] = value
    .slice(0, 10)
    .split("-")

  return year && month && day
    ? `${month}/${day}/${year}`
    : value
}

function todayEastern() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function roleLabel(
  role: ManagementUser["role"]
) {
  if (role === "administrator") {
    return "Administrator"
  }

  if (role === "manager") {
    return "Manager"
  }

  if (role === "auditor") {
    return "Auditor"
  }

  return "Read Only"
}

export default async function ProtectedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const {
    data: managementUserData,
    error: managementUserError,
  } = await supabaseAdmin
    .from("management_users")
    .select(`
      full_name,
      email,
      role,
      is_active,
      must_change_password
    `)
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (managementUserError) {
    throw new Error(
      managementUserError.message
    )
  }

  if (
    !managementUserData ||
    !managementUserData.is_active
  ) {
    await supabase.auth.signOut()
    redirect("/")
  }

  const managementUser =
    managementUserData as ManagementUser

  if (
    managementUser.must_change_password
  ) {
    redirect(
      "/protected/change-password"
    )
  }

  const role = managementUser.role

  const isAdministrator =
    role === "administrator"

  const isManager =
    role === "manager"

  const isAuditor =
    role === "auditor"

  const isReadOnly =
    role === "read_only"

  const canStartAudit =
    isAdministrator ||
    isManager ||
    isAuditor

  const canViewReports =
    isAdministrator ||
    isManager ||
    isAuditor ||
    isReadOnly

  const canUseAdministration =
    isAdministrator ||
    isManager

  const canViewCorrectiveActions =
    isAdministrator ||
    isManager ||
    isAuditor

  let myCorrectiveActions:
    CorrectiveAction[] = []

  let auditMap =
    new Map<string, Audit>()

  if (
    canViewCorrectiveActions &&
    managementUser.full_name
  ) {
    const {
      data: actionData,
      error: actionError,
    } = await supabaseAdmin
      .from("corrective_actions")
      .select(`
        id,
        audit_id,
        action_text,
        owner_name,
        due_date,
        priority,
        status
      `)
      .neq("status", "completed")
      .order("due_date", {
        ascending: true,
        nullsFirst: false,
      })

    if (actionError) {
      throw new Error(
        actionError.message
      )
    }

    const normalizedName =
      managementUser.full_name
        .trim()
        .toLowerCase()

    myCorrectiveActions = (
      (actionData ?? []) as CorrectiveAction[]
    ).filter((action) => {
      return (
        action.owner_name
          ?.trim()
          .toLowerCase() ===
        normalizedName
      )
    })

    const auditIds =
      Array.from(
        new Set(
          myCorrectiveActions.map(
            (action) =>
              action.audit_id
          )
        )
      )

    if (auditIds.length > 0) {
      const {
        data: auditData,
        error: auditError,
      } = await supabaseAdmin
        .from("audits")
        .select(`
          id,
          audit_type,
          audit_date
        `)
        .in("id", auditIds)

      if (auditError) {
        throw new Error(
          auditError.message
        )
      }

      auditMap = new Map(
        (
          (auditData ?? []) as Audit[]
        ).map((audit) => [
          audit.id,
          audit,
        ])
      )
    }
  }

  const today = todayEastern()

  const overdueCount =
    myCorrectiveActions.filter(
      (action) =>
        Boolean(
          action.due_date &&
            action.due_date < today
        )
    ).length

  return (
    <main className="page">
      <div className="container">
        <section className="hero">
          <Image
            src="/filta-logo-clear.png"
            alt="Filta"
            width={300}
            height={110}
            className="logo"
            priority
          />

          <p className="eyebrow">
            DORADO ENVIRONMENTAL
          </p>

          <h1>
            Welcome,{" "}
            {managementUser.full_name?.split(
              " "
            )[0] ||
              "Team Member"}
          </h1>

          <p className="description">
            Dorado Service Audit System
          </p>

          <div className="userStatus">
            <span>
              {managementUser.full_name ||
                managementUser.email}
            </span>

            <span className="roleBadge">
              {roleLabel(role)}
            </span>
          </div>
        </section>

        <section className="accessSection">
          <p className="sectionEyebrow">
            YOUR ACCESS
          </p>

          <h2>Choose an Area</h2>

          <div className="accessGrid">
            {canStartAudit && (
              <Link
                href="/protected/audits/new"
                className="accessCard serviceAccess"
              >
                <span className="cardIcon">
                  ✓
                </span>

                <div>
                  <h3>
                    Service Audits
                  </h3>

                  <p>
                    Start equipment,
                    service-delivery,
                    warehouse and vehicle
                    inspections.
                  </p>
                </div>

                <strong>
                  Open Service Audits →
                </strong>
              </Link>
            )}

            {canViewReports && (
              <Link
                href="/protected/audits"
                className="accessCard"
              >
                <span className="cardIcon">
                  ▦
                </span>

                <div>
                  <h3>
                    Audit Results
                  </h3>

                  <p>
                    Review completed audits,
                    scores, findings and
                    historical results.
                  </p>
                </div>

                <strong>
                  Open Reports →
                </strong>
              </Link>
            )}

            {canViewReports && (
              <Link
                href="/protected/admin/trends"
                className="accessCard"
              >
                <span className="cardIcon">
                  ↗
                </span>

                <div>
                  <h3>
                    Score Trends
                  </h3>

                  <p>
                    Review performance trends
                    across technicians,
                    equipment and audit types.
                  </p>
                </div>

                <strong>
                  View Trends →
                </strong>
              </Link>
            )}

            {canUseAdministration && (
              <Link
                href="/protected/admin"
                className="accessCard managementAccess"
              >
                <span className="cardIcon">
                  ⚙
                </span>

                <div>
                  <h3>
                    Management (Admin)
                  </h3>

                  <p>
                    Manage technicians,
                    equipment, vehicles,
                    warehouses and operating
                    setup.
                  </p>
                </div>

                <strong>
                  Open Admin →
                </strong>
              </Link>
            )}

            {canUseAdministration && (
              <Link
                href="/protected/admin/corrective-actions"
                className="accessCard"
              >
                <span className="cardIcon">
                  !
                </span>

                <div>
                  <h3>
                    Corrective Actions
                  </h3>

                  <p>
                    Review open findings,
                    assignments, due dates and
                    completed corrective work.
                  </p>
                </div>

                <strong>
                  Manage Actions →
                </strong>
              </Link>
            )}
          </div>
        </section>

        {canViewCorrectiveActions && (
          <section className="correctiveSection">
            <div className="correctiveHeader">
              <div>
                <p className="sectionEyebrow">
                  MY RESPONSIBILITIES
                </p>

                <h2>
                  My Corrective Actions
                </h2>

                <p className="correctiveDescription">
                  Open findings currently
                  assigned to you.
                </p>
              </div>

              <div className="correctiveMetrics">
                <div>
                  <strong>
                    {
                      myCorrectiveActions.length
                    }
                  </strong>

                  <span>Open</span>
                </div>

                <div
                  className={
                    overdueCount > 0
                      ? "overdueMetric"
                      : ""
                  }
                >
                  <strong>
                    {overdueCount}
                  </strong>

                  <span>Overdue</span>
                </div>
              </div>
            </div>

            {myCorrectiveActions.length ===
            0 ? (
              <div className="emptyActions">
                <strong>
                  No open corrective actions
                  assigned to you.
                </strong>

                <p>
                  New assigned findings will
                  appear here automatically.
                </p>
              </div>
            ) : (
              <div className="correctiveList">
                {myCorrectiveActions.map(
                  (action) => {
                    const audit =
                      auditMap.get(
                        action.audit_id
                      )

                    const isOverdue =
                      Boolean(
                        action.due_date &&
                          action.due_date <
                            today
                      )

                    return (
                      <article
                        key={action.id}
                        className={`correctiveCard ${
                          isOverdue
                            ? "correctiveCardOverdue"
                            : ""
                        }`}
                      >
                        <div className="correctiveTop">
                          <div>
                            <div className="tags">
                              <span className="auditTag">
                                {auditNames[
                                  audit?.audit_type ||
                                    ""
                                ] ||
                                  "Service Audit"}
                              </span>

                              <span
                                className={`priorityTag priority-${(
                                  action.priority ||
                                  "medium"
                                ).toLowerCase()}`}
                              >
                                {action.priority ||
                                  "Medium"}{" "}
                                Priority
                              </span>

                              {isOverdue && (
                                <span className="overdueTag">
                                  Overdue
                                </span>
                              )}
                            </div>

                            <h3>
                              {action.action_text ||
                                "Corrective action required"}
                            </h3>

                            <p>
                              Audit Date:{" "}
                              {formatDate(
                                audit?.audit_date ||
                                  null
                              )}
                              {" · "}
                              Due:{" "}
                              {formatDate(
                                action.due_date
                              )}
                            </p>
                          </div>

                          <Link
                            className="viewReportButton"
                            href={`/protected/audits/${action.audit_id}/report`}
                          >
                            View Report →
                          </Link>
                        </div>

                        <CorrectiveActionComplete
                          actionId={action.id}
                        />
                      </article>
                    )
                  }
                )}
              </div>
            )}
          </section>
        )}

        {canStartAudit && (
          <section className="auditSection">
            <p className="sectionEyebrow">
              SERVICE AUDITS
            </p>

            <h2>
              Start a Specific Audit
            </h2>

            <div className="auditGrid">
              <Link
                className="auditCard"
                href="/protected/audits/new/details?type=equipment"
              >
                <h3>
                  MFU/MBU Equipment
                </h3>

                <p>
                  Inspect function,
                  condition, cleanliness,
                  maintenance and safety.
                </p>

                <span>
                  Begin Equipment Audit →
                </span>
              </Link>

              <Link
                className="auditCard"
                href="/protected/audits/new/details?type=service_delivery"
              >
                <h3>
                  Technician Service
                  Delivery
                </h3>

                <p>
                  Evaluate customer arrival,
                  service execution and
                  departure.
                </p>

                <span>
                  Begin Service Audit →
                </span>
              </Link>

              <Link
                className="auditCard"
                href="/protected/audits/new/details?type=warehouse"
              >
                <h3>
                  Warehouse and 6K
                </h3>

                <p>
                  Inspect cleanliness,
                  responsibilities, safety
                  and oil-storage systems.
                </p>

                <span>
                  Begin Warehouse Audit →
                </span>
              </Link>

              <Link
                className="auditCard"
                href="/protected/audits/new/details?type=vehicle"
              >
                <h3>
                  Vans and Service Vehicles
                </h3>

                <p>
                  Inspect function,
                  cleanliness, organization
                  and presentation.
                </p>

                <span>
                  Begin Vehicle Audit →
                </span>
              </Link>
            </div>
          </section>
        )}
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f1f5f9;
          color: #10152c;
          font-family: Arial, Helvetica, sans-serif;
        }

        .page {
          min-height: 100vh;
          padding: 38px 20px 70px;
        }

        .container {
          width: min(1080px, 100%);
          margin: 0 auto;
        }

        .hero {
          padding: 34px;
          border-radius: 22px;
          background: #10152c;
          color: white;
          box-shadow:
            0 12px 28px
            rgba(15, 23, 42, 0.16);
        }

        .logo {
          display: block;
          width: auto;
          max-width: 225px;
          height: auto;
          max-height: 90px;
          margin-bottom: 25px;
          object-fit: contain;
        }

        .eyebrow,
        .sectionEyebrow {
          margin: 0 0 10px;
          color: #58d49a;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .hero h1 {
          margin: 0;
          font-size:
            clamp(36px, 6vw, 50px);
          line-height: 1.05;
        }

        .description {
          margin: 14px 0 0;
          color: #dbe4ff;
          font-size: 17px;
        }

        .userStatus {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin-top: 22px;
          color: #cbd5e1;
          font-size: 14px;
        }

        .roleBadge {
          padding: 6px 10px;
          border-radius: 999px;
          background:
            rgba(88, 212, 154, 0.14);
          color: #58d49a;
          font-size: 12px;
          font-weight: 800;
        }

        .accessSection,
        .correctiveSection,
        .auditSection {
          margin-top: 28px;
        }

        .accessSection > h2,
        .auditSection > h2 {
          margin: 0 0 16px;
          font-size: 28px;
        }

        .accessGrid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .accessCard {
          display: flex;
          min-height: 245px;
          flex-direction: column;
          padding: 25px;
          border: 1px solid #dbe2ea;
          border-top: 5px solid #253453;
          border-radius: 16px;
          background: white;
          color: #10152c;
          text-decoration: none;
          box-shadow:
            0 3px 9px
            rgba(15, 23, 42, 0.05);
        }

        .serviceAccess {
          border-top-color: #57bb83;
        }

        .managementAccess {
          border-top-color: #57bb83;
        }

        .cardIcon {
          display: flex;
          width: 46px;
          height: 46px;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          border-radius: 13px;
          background: #e7f8ef;
          color: #168554;
          font-size: 21px;
          font-weight: 900;
        }

        .accessCard > div {
          flex: 1;
        }

        .accessCard h3 {
          margin: 0;
          font-size: 21px;
        }

        .accessCard p {
          margin: 11px 0 20px;
          color: #526078;
          font-size: 15px;
          line-height: 1.55;
        }

        .accessCard strong {
          color: #168554;
          font-size: 14px;
        }

        .correctiveSection {
          padding: 25px;
          border: 1px solid #dbe2ea;
          border-radius: 18px;
          background: white;
          box-shadow:
            0 3px 9px
            rgba(15, 23, 42, 0.05);
        }

        .correctiveHeader {
          display: flex;
          justify-content:
            space-between;
          gap: 20px;
        }

        .correctiveHeader h2 {
          margin: 0;
          font-size: 27px;
        }

        .correctiveDescription {
          margin: 7px 0 0;
          color: #64748b;
        }

        .correctiveMetrics {
          display: flex;
          gap: 10px;
        }

        .correctiveMetrics div {
          min-width: 82px;
          padding: 12px;
          border-radius: 12px;
          background: #f1f5f9;
          text-align: center;
        }

        .correctiveMetrics strong {
          display: block;
          font-size: 25px;
        }

        .correctiveMetrics span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        .overdueMetric strong {
          color: #b91c1c;
        }

        .correctiveList {
          display: grid;
          gap: 16px;
          margin-top: 22px;
        }

        .correctiveCard {
          padding: 20px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: white;
        }

        .correctiveCardOverdue {
          border-color: #fecaca;
          background: #fffafa;
        }

        .correctiveTop {
          display: flex;
          justify-content:
            space-between;
          gap: 20px;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .tags span {
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .auditTag {
          background: #e2e8f0;
        }

        .priorityTag {
          background: #fef3c7;
          color: #92400e;
        }

        .priority-high,
        .priority-critical {
          background: #fee2e2;
          color: #991b1b;
        }

        .overdueTag {
          background: #b91c1c;
          color: white;
        }

        .correctiveCard h3 {
          margin: 12px 0 6px;
          font-size: 18px;
        }

        .correctiveCard p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .viewReportButton {
          flex-shrink: 0;
          height: fit-content;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          color: #10152c;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
        }

        .emptyActions {
          margin-top: 20px;
          padding: 20px;
          border-radius: 12px;
          background: #f8fafc;
        }

        .emptyActions p {
          margin: 5px 0 0;
          color: #64748b;
        }

        .auditGrid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .auditCard {
          display: flex;
          min-height: 190px;
          flex-direction: column;
          padding: 25px;
          border: 1px solid #dbe2ea;
          border-radius: 16px;
          background: white;
          color: #10152c;
          text-decoration: none;
          box-shadow:
            0 3px 9px
            rgba(15, 23, 42, 0.05);
        }

        .auditCard h3 {
          margin: 0;
          font-size: 21px;
        }

        .auditCard p {
          flex: 1;
          margin: 11px 0 20px;
          color: #526078;
          font-size: 15px;
          line-height: 1.55;
        }

        .auditCard span {
          color: #168554;
          font-size: 14px;
          font-weight: 800;
        }

        @media (max-width: 720px) {
          .page {
            padding:
              18px 12px 50px;
          }

          .hero {
            padding: 26px 22px;
          }

          .accessGrid,
          .auditGrid {
            grid-template-columns: 1fr;
          }

          .correctiveHeader,
          .correctiveTop {
            flex-direction: column;
          }

          .correctiveMetrics {
            width: 100%;
          }

          .correctiveMetrics div {
            flex: 1;
          }

          .viewReportButton {
            text-align: center;
          }

          .logo {
            max-width: 200px;
          }
        }
      `}</style>
    </main>
  )
}