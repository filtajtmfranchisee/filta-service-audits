import type { ReactNode } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import QuickEntryFields from "./quick-entry-fields"

type AuditType =
  | "equipment"
  | "service_delivery"
  | "warehouse"
  | "vehicle"

type ManagementUser = {
  full_name: string | null
  role:
    | "administrator"
    | "manager"
    | "auditor"
    | "read_only"
  is_active: boolean
}

const auditNames: Record<AuditType, string> = {
  equipment: "MFU/MBU Equipment Audit",
  service_delivery: "Technician Service Delivery Audit",
  warehouse: "Warehouse and Oil Storage System Audit",
  vehicle: "Van and Service Vehicle Audit",
}

function isAuditType(
  value: string | undefined
): value is AuditType {
  return (
    value === "equipment" ||
    value === "service_delivery" ||
    value === "warehouse" ||
    value === "vehicle"
  )
}

function getEasternDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const year = parts.find(
    (part) => part.type === "year"
  )?.value

  const month = parts.find(
    (part) => part.type === "month"
  )?.value

  const day = parts.find(
    (part) => part.type === "day"
  )?.value

  return `${year}-${month}-${day}`
}

function allowedStorageSystems(locationName: string) {
  const normalizedName =
    locationName.toLowerCase()

  if (normalizedName.includes("roselle")) {
    return ["1K", "6K"]
  }

  if (
    normalizedName.includes("ocean") ||
    normalizedName.includes("pa warehouse") ||
    normalizedName.includes("pennsylvania")
  ) {
    return ["1K"]
  }

  return []
}

async function requireAuditEntryUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const {
    data: managementUser,
    error,
  } = await supabaseAdmin
    .from("management_users")
    .select(`
      full_name,
      role,
      is_active
    `)
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (
    error ||
    !managementUser ||
    !managementUser.is_active
  ) {
    redirect("/")
  }

  const allowedRoles = [
    "administrator",
    "manager",
    "auditor",
  ]

  if (
    !allowedRoles.includes(
      managementUser.role
    )
  ) {
    redirect("/protected")
  }

  return {
    supabase,
    user,
    managementUser:
      managementUser as ManagementUser,
  }
}

export default async function AuditDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string
  }>
}) {
  const parameters = await searchParams
  const requestedType = parameters.type

  if (!isAuditType(requestedType)) {
    redirect("/protected/audits/new")
  }

  const auditType = requestedType

  const {
    supabase,
    managementUser,
  } = await requireAuditEntryUser()

  const [
    locationResult,
    technicianResult,
    assetResult,
  ] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name, city, state")
      .eq("active", true)
      .order("name"),

    auditType === "service_delivery"
      ? supabase
          .from("technicians")
          .select(`
            id,
            first_name,
            last_name
          `)
          .eq("active", true)
          .order("last_name")
          .order("first_name")
      : Promise.resolve({
          data: [],
          error: null,
        }),

    auditType === "equipment" ||
    auditType === "vehicle"
      ? supabase
          .from("assets")
          .select(`
            id,
            asset_type,
            asset_number,
            description
          `)
          .eq("status", "active")
          .order("asset_type")
          .order("asset_number")
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ])

  if (locationResult.error) {
    throw new Error(
      locationResult.error.message
    )
  }

  if (technicianResult.error) {
    throw new Error(
      technicianResult.error.message
    )
  }

  if (assetResult.error) {
    throw new Error(
      assetResult.error.message
    )
  }

  const locations =
    locationResult.data ?? []

  const technicians =
    technicianResult.data ?? []

  const allAssets =
    assetResult.data ?? []

  const assets = allAssets.filter(
    (asset) => {
      if (auditType === "equipment") {
        return [
          "MFU",
          "MBU",
          "VAC",
          "OTHER",
        ].includes(asset.asset_type)
      }

      if (auditType === "vehicle") {
        return [
          "VAN",
          "TRUCK",
        ].includes(asset.asset_type)
      }

      return false
    }
  )

  const auditorNameParts =
    (
      managementUser.full_name || ""
    )
      .trim()
      .split(/\s+/)

  const defaultFirstName =
    auditorNameParts[0] || ""

  const defaultLastName =
    auditorNameParts
      .slice(1)
      .join(" ")

  async function createAudit(
    formData: FormData
  ) {
    "use server"

    const {
      supabase,
      user,
    } = await requireAuditEntryUser()

    const auditTypeValue = String(
      formData.get("audit_type") || ""
    )

    if (
      !isAuditType(
        auditTypeValue
      )
    ) {
      throw new Error(
        "A valid audit type is required."
      )
    }

    const auditorFirstName =
      String(
        formData.get(
          "auditor_first_name"
        ) || ""
      ).trim()

    const auditorLastName =
      String(
        formData.get(
          "auditor_last_name"
        ) || ""
      ).trim()

    if (
      !auditorFirstName ||
      !auditorLastName
    ) {
      throw new Error(
        "The auditor’s first and last name are required."
      )
    }

    const auditDate =
      String(
        formData.get(
          "audit_date"
        ) || ""
      )

    if (!auditDate) {
      throw new Error(
        "The audit date is required."
      )
    }

    const submittedTechnicianId =
      String(
        formData.get(
          "technician_id"
        ) || ""
      )

    const submittedLocationId =
      String(
        formData.get(
          "location_id"
        ) || ""
      )

    const submittedAssetId =
      String(
        formData.get(
          "asset_id"
        ) || ""
      )

    const oilStorageSystem =
      String(
        formData.get(
          "oil_storage_system"
        ) || ""
      )

    const customerLocation =
      String(
        formData.get(
          "customer_location"
        ) || ""
      ).trim()

    const startingNotes =
      String(
        formData.get(
          "starting_notes"
        ) || ""
      ).trim()

    if (
      auditTypeValue ===
        "service_delivery" &&
      !submittedTechnicianId
    ) {
      throw new Error(
        "A technician is required for a service delivery audit."
      )
    }

    if (
      auditTypeValue ===
        "service_delivery" &&
      !customerLocation
    ) {
      throw new Error(
        "A customer or service location is required."
      )
    }

    if (
      auditTypeValue ===
        "warehouse" &&
      !submittedLocationId
    ) {
      throw new Error(
        "A warehouse is required for a warehouse audit."
      )
    }

    if (
      auditTypeValue ===
        "warehouse" &&
      !["1K", "6K"].includes(
        oilStorageSystem
      )
    ) {
      throw new Error(
        "A valid oil storage system is required."
      )
    }

    if (
      auditTypeValue ===
        "warehouse" &&
      submittedLocationId
    ) {
      const {
        data: selectedLocation,
        error,
      } = await supabase
        .from("locations")
        .select("name")
        .eq(
          "id",
          submittedLocationId
        )
        .single()

      if (
        error ||
        !selectedLocation
      ) {
        throw new Error(
          "The selected warehouse could not be verified."
        )
      }

      const permittedSystems =
        allowedStorageSystems(
          selectedLocation.name
        )

      if (
        !permittedSystems.includes(
          oilStorageSystem
        )
      ) {
        throw new Error(
          `${oilStorageSystem} is not available at ${selectedLocation.name}.`
        )
      }
    }

    const technicianId =
      auditTypeValue ===
      "service_delivery"
        ? submittedTechnicianId
        : null

    const locationId =
      auditTypeValue === "warehouse"
        ? submittedLocationId
        : null

    const assetId =
      auditTypeValue ===
        "equipment" ||
      auditTypeValue ===
        "vehicle"
        ? submittedAssetId || null
        : null

    const savedOilStorageSystem =
      auditTypeValue === "warehouse"
        ? oilStorageSystem
        : null

    const combinedNotes = [
      customerLocation
        ? `Customer/Service Location: ${customerLocation}`
        : "",
      startingNotes,
    ]
      .filter(Boolean)
      .join("\n\n")

    const {
      data: audit,
      error,
    } = await supabase
      .from("audits")
      .insert({
        template_id: null,
        operating_unit_id: null,
        location_id: locationId,
        technician_id: technicianId,
        asset_id: assetId,
        auditor_id: user.id,
        auditor_first_name:
          auditorFirstName,
        auditor_last_name:
          auditorLastName,
        audit_type: auditTypeValue,
        audit_date: auditDate,
        status: "draft",
        general_notes:
          combinedNotes || null,
        oil_storage_system:
          savedOilStorageSystem,
      })
      .select("id")
      .single()

    if (
      error ||
      !audit
    ) {
      throw new Error(
        error?.message ||
          "The audit could not be created."
      )
    }

    redirect(
      `/protected/audits/${audit.id}`
    )
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/protected/audits/new"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Change Audit Type
        </Link>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
            Dorado Environmental
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {auditNames[auditType]}
          </h1>

          <p className="mt-3 text-slate-600">
            Enter the audit details before beginning
            the inspection.
          </p>

          <form
            action={createAudit}
            className="mt-8 space-y-6"
          >
            <input
              type="hidden"
              name="audit_type"
              value={auditType}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Auditor First Name">
                <input
                  type="text"
                  name="auditor_first_name"
                  defaultValue={
                    defaultFirstName
                  }
                  required
                  autoComplete="given-name"
                  placeholder="First name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                />
              </FormField>

              <FormField label="Auditor Last Name">
                <input
                  type="text"
                  name="auditor_last_name"
                  defaultValue={
                    defaultLastName
                  }
                  required
                  autoComplete="family-name"
                  placeholder="Last name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                />
              </FormField>
            </div>

            <FormField label="Audit Date">
              <input
                type="date"
                name="audit_date"
                defaultValue={
                  getEasternDate()
                }
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
              />
            </FormField>

            <QuickEntryFields
              auditType={auditType}
              initialTechnicians={
                technicians
              }
              initialAssets={assets}
              locations={locations}
            />

            {auditType ===
              "service_delivery" && (
              <FormField label="Customer or Service Location">
                <input
                  type="text"
                  name="customer_location"
                  required
                  placeholder="Enter customer or site name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                />
              </FormField>
            )}

            <FormField
              label="Starting Notes"
              optional
            >
              <textarea
                name="starting_notes"
                rows={4}
                placeholder="Enter any initial observations or relevant information."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
              />
            </FormField>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
              <button
                type="submit"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-400"
              >
                Begin Audit
              </button>

              <Link
                href="/protected/audits/new"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}

function FormField({
  label,
  optional = false,
  children,
}: {
  label: string
  optional?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-800">
        {label}

        {optional && (
          <span className="ml-2 font-normal text-slate-500">
            Optional
          </span>
        )}
      </span>

      {children}
    </label>
  )
}