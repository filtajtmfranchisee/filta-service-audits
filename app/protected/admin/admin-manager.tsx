"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"

type Technician = {
  id: string
  first_name: string
  last_name: string
  employee_number: string | null
  active: boolean
}

type Location = {
  id: string
  name: string
  city: string | null
  state: string | null
}

type Asset = {
  id: string
  asset_type: string
  asset_number: string
  description: string | null
  status: string
  location_id: string | null
  assigned_technician_id: string | null
}

type ManagementUser = {
  id: string
  auth_user_id: string | null
  email: string
  full_name: string | null
  role:
    | "administrator"
    | "manager"
    | "auditor"
    | "read_only"
  is_active: boolean
}

type Props = {
  technicians: Technician[]
  locations: Location[]
  assets: Asset[]
  managementUsers: ManagementUser[]
  isAdministrator: boolean
}

export default function AdminManager({
  technicians,
  locations,
  assets,
  managementUsers,
  isAdministrator,
}: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [saving, setSaving] = useState(false)

  function clearMessages() {
    setMessage("")
    setErrorMessage("")
  }

  async function addTechnician(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setSaving(true)
    clearMessages()

    const form = event.currentTarget
    const formData = new FormData(form)

    const firstName = String(
      formData.get("first_name") || ""
    ).trim()

    const lastName = String(
      formData.get("last_name") || ""
    ).trim()

    const employeeNumber = String(
      formData.get("employee_number") || ""
    ).trim()

    try {
      if (!firstName || !lastName) {
        throw new Error(
          "The technician’s first and last name are required."
        )
      }

      const { error } = await supabase
        .from("technicians")
        .insert({
          operating_unit_id: null,
          first_name: firstName,
          last_name: lastName,
          employee_number: employeeNumber || null,
          active: true,
        })

      if (error) throw error

      form.reset()
      setMessage(
        `${firstName} ${lastName} was added successfully.`
      )
      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The technician could not be added."
      )
    } finally {
      setSaving(false)
    }
  }

  async function addWarehouse(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setSaving(true)
    clearMessages()

    const form = event.currentTarget
    const formData = new FormData(form)

    const name = String(
      formData.get("warehouse_name") || ""
    ).trim()

    const city = String(
      formData.get("warehouse_city") || ""
    ).trim()

    const state = String(
      formData.get("warehouse_state") || ""
    )
      .trim()
      .toUpperCase()

    try {
      if (!name) {
        throw new Error("Warehouse name is required.")
      }

      const { error } = await supabase
        .from("locations")
        .insert({
          operating_unit_id: null,
          name,
          city: city || null,
          state: state || null,
          active: true,
        })

      if (error) throw error

      form.reset()
      setMessage(`${name} was added successfully.`)
      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The warehouse could not be added."
      )
    } finally {
      setSaving(false)
    }
  }

  async function addAsset(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setSaving(true)
    clearMessages()

    const form = event.currentTarget
    const formData = new FormData(form)

    const assetType = String(
      formData.get("asset_type") || ""
    )

    const assetNumber = String(
      formData.get("asset_number") || ""
    ).trim()

    const description = String(
      formData.get("description") || ""
    ).trim()

    const locationId = String(
      formData.get("location_id") || ""
    )

    const technicianId = String(
      formData.get("assigned_technician_id") || ""
    )

    try {
      if (!assetType || !assetNumber) {
        throw new Error(
          "Asset type and asset number are required."
        )
      }

      const { error } = await supabase
        .from("assets")
        .insert({
          operating_unit_id: null,
          location_id: locationId || null,
          assigned_technician_id:
            technicianId || null,
          asset_type: assetType,
          asset_number: assetNumber,
          description: description || null,
          status: "active",
        })

      if (error) throw error

      form.reset()
      setMessage(
        `${assetType} ${assetNumber} was added successfully.`
      )
      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The asset could not be added."
      )
    } finally {
      setSaving(false)
    }
  }

  async function addManagementUser(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setSaving(true)
    clearMessages()

    const form = event.currentTarget
    const formData = new FormData(form)

    const fullName = String(
      formData.get("full_name") || ""
    ).trim()

    const email = String(
      formData.get("email") || ""
    )
      .trim()
      .toLowerCase()

    const role = String(
      formData.get("role") || ""
    )

    try {
      if (!fullName || !email || !role) {
        throw new Error(
          "Name, email and role are required."
        )
      }

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          role,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "The management user could not be added."
        )
      }

      form.reset()

      setMessage(
        `${fullName} was added successfully. Temporary password: Filta!1234`
      )

      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The management user could not be added."
      )
    } finally {
      setSaving(false)
    }
  }

  async function resetManagementUserPassword(
    user: ManagementUser
  ) {
    clearMessages()

    if (
      !window.confirm(
        `Reset ${user.full_name || user.email} to the temporary password Filta!1234? They will be required to change it when they log in.`
      )
    ) {
      return
    }

    setSaving(true)

    try {
      const response = await fetch(
        `/api/admin/users/${user.id}/reset-password`,
        {
          method: "POST",
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "The password could not be reset."
        )
      }

      setMessage(
        `${user.full_name || user.email}'s password was reset to Filta!1234. They must change it at their next login.`
      )

      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The password could not be reset."
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleTechnician(
    technician: Technician
  ) {
    clearMessages()

    const newStatus = !technician.active

    const { error } = await supabase
      .from("technicians")
      .update({
        active: newStatus,
      })
      .eq("id", technician.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setMessage(
      `${technician.first_name} ${technician.last_name} is now ${
        newStatus ? "active" : "inactive"
      }.`
    )

    router.refresh()
  }

  async function toggleAsset(asset: Asset) {
    clearMessages()

    const newStatus =
      asset.status === "active"
        ? "out_of_service"
        : "active"

    const { error } = await supabase
      .from("assets")
      .update({
        status: newStatus,
      })
      .eq("id", asset.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setMessage(
      `${asset.asset_type} ${asset.asset_number} is now ${
        newStatus === "active"
          ? "active"
          : "out of service"
      }.`
    )

    router.refresh()
  }

  async function toggleManagementUser(
    user: ManagementUser
  ) {
    clearMessages()
    setSaving(true)

    try {
      const response = await fetch(
        `/api/admin/users/${user.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: !user.is_active,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "The user could not be updated."
        )
      }

      setMessage(
        `${user.full_name || user.email} is now ${
          !user.is_active ? "active" : "inactive"
        }.`
      )

      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The user could not be updated."
      )
    } finally {
      setSaving(false)
    }
  }

  function locationName(locationId: string | null) {
    if (!locationId) return "Not assigned"

    return (
      locations.find(
        (location) => location.id === locationId
      )?.name || "Unknown location"
    )
  }

  function technicianName(
    technicianId: string | null
  ) {
    if (!technicianId) return "Not assigned"

    const technician = technicians.find(
      (item) => item.id === technicianId
    )

    if (!technician) return "Unknown technician"

    return `${technician.first_name} ${technician.last_name}`
  }

  function roleName(role: ManagementUser["role"]) {
    if (role === "administrator") return "Administrator"
    if (role === "manager") return "Manager"
    if (role === "auditor") return "Auditor"
    return "Read Only"
  }

  return (
    <div className="space-y-8">
      {errorMessage && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 font-medium text-red-800">
          {errorMessage}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-medium text-emerald-800">
          {message}
        </div>
      )}

      {isAdministrator && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Management Users
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Add and manage users who can access the management
              side of the Service Audit system.
            </p>
          </div>

          <form
            onSubmit={addManagementUser}
            className="mt-6 grid gap-4 lg:grid-cols-4"
          >
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Full Name
              </span>

              <input
                type="text"
                name="full_name"
                required
                placeholder="Example: Jen Smith"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Email
              </span>

              <input
                type="email"
                name="email"
                required
                placeholder="name@gofilta.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Role
              </span>

              <select
                name="role"
                required
                defaultValue="manager"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="administrator">
                  Administrator
                </option>

                <option value="manager">
                  Manager
                </option>

                <option value="auditor">
                  Auditor
                </option>

                <option value="read_only">
                  Read Only
                </option>
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="min-h-12 w-full rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
              >
                Add User
              </button>
            </div>
          </form>

          {managementUsers.length === 0 ? (
            <p className="mt-6 text-slate-600">
              No management users have been added.
            </p>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {managementUsers.map((user) => {
                    const isPrimaryAdministrator =
                      user.email.toLowerCase() ===
                      "john.michals@gofilta.com"

                    return (
                      <tr
                        key={user.id}
                        className="border-b border-slate-100"
                      >
                        <td className="py-4 font-semibold text-slate-900">
                          {user.full_name || "—"}
                        </td>

                        <td className="py-4 text-slate-600">
                          {user.email}
                        </td>

                        <td className="py-4 text-slate-600">
                          {roleName(user.role)}
                        </td>

                        <td className="py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              user.is_active
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {user.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="py-4">
                          <div className="flex flex-wrap justify-end gap-3">
                            {!isPrimaryAdministrator && (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  resetManagementUserPassword(
                                    user
                                  )
                                }
                                className="font-semibold text-amber-700 hover:text-amber-900 disabled:opacity-50"
                              >
                                Reset Password
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={
                                saving ||
                                isPrimaryAdministrator
                              }
                              onClick={() =>
                                toggleManagementUser(user)
                              }
                              className="font-semibold text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {user.is_active
                                ? "Deactivate"
                                : "Reactivate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={addTechnician}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900">
            Add Technician
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Add a technician who may be assigned to audits,
            vehicles, or equipment.
          </p>

          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">
              First Name
            </span>

            <input
              type="text"
              name="first_name"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">
              Last Name
            </span>

            <input
              type="text"
              name="last_name"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">
              Employee Number{" "}
              <span className="font-normal text-slate-500">
                Optional
              </span>
            </span>

            <input
              type="text"
              name="employee_number"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 min-h-12 w-full rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
          >
            Add Technician
          </button>
        </form>

        <form
          onSubmit={addWarehouse}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900">
            Add Warehouse
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Add an operating warehouse or service location.
          </p>

          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">
              Warehouse Name
            </span>

            <input
              type="text"
              name="warehouse_name"
              required
              placeholder="Example: New Jersey Warehouse"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                City
              </span>

              <input
                type="text"
                name="warehouse_city"
                placeholder="Example: Toms River"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                State
              </span>

              <input
                type="text"
                name="warehouse_state"
                maxLength={2}
                placeholder="NJ"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 uppercase"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 min-h-12 w-full rounded-xl bg-slate-700 px-6 py-3 font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
          >
            Add Warehouse
          </button>
        </form>

        <form
          onSubmit={addAsset}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900">
            Add Equipment or Vehicle
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Add an MFU, MBU, vacuum, van, truck, or 6K.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Asset Type
              </span>

              <select
                name="asset_type"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">Select type</option>
                <option value="MFU">MFU</option>
                <option value="MBU">MBU</option>
                <option value="VAC">Vacuum</option>
                <option value="VAN">Van</option>
                <option value="TRUCK">Truck</option>
                <option value="6K">6K System</option>
                <option value="OTHER">Other</option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Asset Number
              </span>

              <input
                type="text"
                name="asset_number"
                required
                placeholder="Example: MFU-12"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">
              Description{" "}
              <span className="font-normal text-slate-500">
                Optional
              </span>
            </span>

            <input
              type="text"
              name="description"
              placeholder="Make, model, or identifying information"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Warehouse
              </span>

              <select
                name="location_id"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">Not assigned</option>

                {locations.map((location) => (
                  <option
                    key={location.id}
                    value={location.id}
                  >
                    {location.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Technician
              </span>

              <select
                name="assigned_technician_id"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">Not assigned</option>

                {technicians
                  .filter(
                    (technician) => technician.active
                  )
                  .map((technician) => (
                    <option
                      key={technician.id}
                      value={technician.id}
                    >
                      {technician.first_name}{" "}
                      {technician.last_name}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 min-h-12 w-full rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Add Equipment or Vehicle
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">
          Warehouses
        </h2>

        {locations.length === 0 ? (
          <p className="mt-4 text-slate-600">
            No warehouses have been added.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500">
                  <th className="pb-3">Warehouse</th>
                  <th className="pb-3">City</th>
                  <th className="pb-3">State</th>
                </tr>
              </thead>

              <tbody>
                {locations.map((location) => (
                  <tr
                    key={location.id}
                    className="border-b border-slate-100"
                  >
                    <td className="py-4 font-semibold text-slate-900">
                      {location.name}
                    </td>

                    <td className="py-4 text-slate-600">
                      {location.city || "—"}
                    </td>

                    <td className="py-4 text-slate-600">
                      {location.state || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">
          Technicians
        </h2>

        {technicians.length === 0 ? (
          <p className="mt-4 text-slate-600">
            No technicians have been added.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500">
                  <th className="pb-3">Technician</th>
                  <th className="pb-3">Employee Number</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {technicians.map((technician) => (
                  <tr
                    key={technician.id}
                    className="border-b border-slate-100"
                  >
                    <td className="py-4 font-semibold text-slate-900">
                      {technician.first_name}{" "}
                      {technician.last_name}
                    </td>

                    <td className="py-4 text-slate-600">
                      {technician.employee_number || "—"}
                    </td>

                    <td className="py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          technician.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {technician.active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td className="py-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          toggleTechnician(technician)
                        }
                        className="font-semibold text-slate-600 hover:text-slate-900"
                      >
                        {technician.active
                          ? "Deactivate"
                          : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">
          Equipment and Vehicles
        </h2>

        {assets.length === 0 ? (
          <p className="mt-4 text-slate-600">
            No equipment or vehicles have been added.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500">
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Asset Number</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Warehouse</th>
                  <th className="pb-3">Technician</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-b border-slate-100"
                  >
                    <td className="py-4 font-semibold text-slate-900">
                      {asset.asset_type}
                    </td>

                    <td className="py-4 text-slate-700">
                      {asset.asset_number}
                    </td>

                    <td className="py-4 text-slate-600">
                      {asset.description || "—"}
                    </td>

                    <td className="py-4 text-slate-600">
                      {locationName(asset.location_id)}
                    </td>

                    <td className="py-4 text-slate-600">
                      {technicianName(
                        asset.assigned_technician_id
                      )}
                    </td>

                    <td className="py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          asset.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {asset.status === "active"
                          ? "Active"
                          : "Out of Service"}
                      </span>
                    </td>

                    <td className="py-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          toggleAsset(asset)
                        }
                        className="font-semibold text-slate-600 hover:text-slate-900"
                      >
                        {asset.status === "active"
                          ? "Take Out of Service"
                          : "Return to Service"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}