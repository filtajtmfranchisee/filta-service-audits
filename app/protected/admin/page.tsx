import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import AdminManager from "./admin-manager"

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const {
    data: currentManagementUser,
    error: managementLookupError,
  } = await supabaseAdmin
    .from("management_users")
    .select("role, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (managementLookupError) {
    throw new Error(managementLookupError.message)
  }

  if (
    !currentManagementUser ||
    !currentManagementUser.is_active
  ) {
    redirect("/protected")
  }

  if (
    currentManagementUser.role !== "administrator" &&
    currentManagementUser.role !== "manager"
  ) {
    redirect("/protected")
  }

  const isAdministrator =
    currentManagementUser.role === "administrator"

  const [
    technicianResult,
    locationResult,
    assetResult,
    managementUserResult,
  ] = await Promise.all([
    supabase
      .from("technicians")
      .select(`
        id,
        first_name,
        last_name,
        employee_number,
        active
      `)
      .order("last_name")
      .order("first_name"),

    supabase
      .from("locations")
      .select(`
        id,
        name,
        city,
        state
      `)
      .eq("active", true)
      .order("name"),

    supabase
      .from("assets")
      .select(`
        id,
        asset_type,
        asset_number,
        description,
        status,
        location_id,
        assigned_technician_id
      `)
      .order("asset_type")
      .order("asset_number"),

    isAdministrator
      ? supabaseAdmin
          .from("management_users")
          .select(`
            id,
            auth_user_id,
            email,
            full_name,
            role,
            is_active
          `)
          .order("full_name")
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ])

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/protected"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Return to Dashboard
        </Link>

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

            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
                Dorado Environmental
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Administration
              </h1>

              <p className="mt-3 text-slate-300">
                Manage technicians, equipment, vehicles, warehouse assignments,
                and operational settings.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/protected/admin/corrective-actions"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-400"
                >
                  Corrective Actions
                </Link>

                <Link
                  href="/protected/audits"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  Management Reports
                </Link>

                <Link
                  href="/protected/admin/trends"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  Score Trends
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-8">
          <AdminManager
            technicians={technicianResult.data ?? []}
            locations={locationResult.data ?? []}
            assets={assetResult.data ?? []}
            managementUsers={managementUserResult.data ?? []}
            isAdministrator={isAdministrator}
          />
        </div>
      </div>
    </main>
  )
}