"use client"

import { useState } from "react"

import { createClient } from "@/lib/supabase/client"

type AuditType =
  | "equipment"
  | "service_delivery"
  | "warehouse"
  | "vehicle"

type Technician = {
  id: string
  first_name: string
  last_name: string
}

type Asset = {
  id: string
  asset_type: string
  asset_number: string
  description: string | null
}

type Location = {
  id: string
  name: string
  state: string | null
}

type Props = {
  auditType: AuditType
  initialTechnicians: Technician[]
  initialAssets: Asset[]
  locations: Location[]
}

function assetTypesForAudit(auditType: AuditType) {
  if (auditType === "equipment") {
    return ["MFU", "MBU", "VAC", "OTHER"]
  }

  if (auditType === "vehicle") {
    return ["VAN", "TRUCK"]
  }

  return []
}

function assetLabel(auditType: AuditType) {
  if (auditType === "equipment") return "Equipment"
  if (auditType === "vehicle") return "Vehicle"

  return "Asset"
}

function storageOptionsForWarehouse(
  locationName: string
) {
  const normalizedName = locationName.toLowerCase()

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

export default function QuickEntryFields({
  auditType,
  initialTechnicians,
  initialAssets,
  locations,
}: Props) {
  const supabase = createClient()

  const allowedAssetTypes =
    assetTypesForAudit(auditType)

  const [technicians, setTechnicians] =
    useState(initialTechnicians)

  const [assets, setAssets] =
    useState(initialAssets)

  const [selectedTechnician, setSelectedTechnician] =
    useState("")

  const [selectedAsset, setSelectedAsset] =
    useState("")

  const [selectedLocation, setSelectedLocation] =
    useState("")

  const [selectedStorageSystem, setSelectedStorageSystem] =
    useState("")

  const [storageOptions, setStorageOptions] = useState<
    string[]
  >([])

  const [showTechnicianEntry, setShowTechnicianEntry] =
    useState(false)

  const [showAssetEntry, setShowAssetEntry] =
    useState(false)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")

  const [employeeNumber, setEmployeeNumber] =
    useState("")

  const [newAssetType, setNewAssetType] = useState(
    allowedAssetTypes[0] || ""
  )

  const [newAssetNumber, setNewAssetNumber] =
    useState("")

  const [newAssetDescription, setNewAssetDescription] =
    useState("")

  const [assetLocation, setAssetLocation] =
    useState("")

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const showAssetSelection =
    auditType === "equipment" ||
    auditType === "vehicle"

  function handleWarehouseChange(locationId: string) {
    setSelectedLocation(locationId)

    const location = locations.find(
      (item) => item.id === locationId
    )

    const availableSystems =
      storageOptionsForWarehouse(location?.name || "")

    setStorageOptions(availableSystems)

    if (availableSystems.length === 1) {
      setSelectedStorageSystem(availableSystems[0])
    } else {
      setSelectedStorageSystem("")
    }
  }

  async function addTechnician() {
    setMessage("")
    setErrorMessage("")

    const cleanFirstName = firstName.trim()
    const cleanLastName = lastName.trim()

    if (!cleanFirstName || !cleanLastName) {
      setErrorMessage(
        "The technician’s first and last name are required."
      )
      return
    }

    setSaving(true)

    const { data, error } = await supabase
      .from("technicians")
      .insert({
        operating_unit_id: null,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        employee_number: employeeNumber.trim() || null,
        active: true,
      })
      .select("id, first_name, last_name")
      .single()

    setSaving(false)

    if (error || !data) {
      setErrorMessage(
        error?.message ||
          "The technician could not be added."
      )
      return
    }

    setTechnicians((current) =>
      [...current, data].sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(
          `${b.last_name} ${b.first_name}`
        )
      )
    )

    setSelectedTechnician(data.id)
    setFirstName("")
    setLastName("")
    setEmployeeNumber("")
    setShowTechnicianEntry(false)

    setMessage(
      `${data.first_name} ${data.last_name} was added and selected.`
    )
  }

  async function addAsset() {
    setMessage("")
    setErrorMessage("")

    const cleanAssetNumber =
      newAssetNumber.trim()

    if (!newAssetType || !cleanAssetNumber) {
      setErrorMessage(
        "Asset type and asset number are required."
      )
      return
    }

    setSaving(true)

    const { data, error } = await supabase
      .from("assets")
      .insert({
        operating_unit_id: null,
        location_id: assetLocation || null,
        assigned_technician_id: null,
        asset_type: newAssetType,
        asset_number: cleanAssetNumber,
        description:
          newAssetDescription.trim() || null,
        status: "active",
      })
      .select(
        "id, asset_type, asset_number, description"
      )
      .single()

    setSaving(false)

    if (error || !data) {
      setErrorMessage(
        error?.message ||
          "The asset could not be added."
      )
      return
    }

    setAssets((current) =>
      [...current, data].sort((a, b) =>
        `${a.asset_type} ${a.asset_number}`.localeCompare(
          `${b.asset_type} ${b.asset_number}`
        )
      )
    )

    setSelectedAsset(data.id)
    setNewAssetNumber("")
    setNewAssetDescription("")
    setAssetLocation("")
    setShowAssetEntry(false)

    setMessage(
      `${data.asset_type} ${data.asset_number} was added and selected.`
    )
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800">
          {errorMessage}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {message}
        </div>
      )}

      {auditType === "service_delivery" && (
        <section>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">
              Technician Being Observed
            </span>

            <select
              name="technician_id"
              value={selectedTechnician}
              onChange={(event) =>
                setSelectedTechnician(event.target.value)
              }
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
            >
              <option value="">
                {technicians.length === 0
                  ? "No technicians added yet"
                  : "Select technician"}
              </option>

              {technicians.map((technician) => (
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

          <button
            type="button"
            onClick={() =>
              setShowTechnicianEntry(
                (current) => !current
              )
            }
            className="mt-2 text-sm font-semibold text-emerald-700"
          >
            {showTechnicianEntry
              ? "Cancel New Technician"
              : "+ Add New Technician"}
          </button>

          {showTechnicianEntry && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(event.target.value)
                  }
                  placeholder="First name"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-3"
                />

                <input
                  type="text"
                  value={lastName}
                  onChange={(event) =>
                    setLastName(event.target.value)
                  }
                  placeholder="Last name"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-3"
                />
              </div>

              <input
                type="text"
                value={employeeNumber}
                onChange={(event) =>
                  setEmployeeNumber(event.target.value)
                }
                placeholder="Employee number — optional"
                className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
              />

              <button
                type="button"
                disabled={saving}
                onClick={addTechnician}
                className="mt-3 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                Add and Select Technician
              </button>
            </div>
          )}
        </section>
      )}

      {auditType === "warehouse" && (
        <>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">
              Warehouse
            </span>

            <select
              name="location_id"
              value={selectedLocation}
              onChange={(event) =>
                handleWarehouseChange(event.target.value)
              }
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
            >
              <option value="">Select warehouse</option>

              {locations.map((location) => (
                <option
                  key={location.id}
                  value={location.id}
                >
                  {location.name}
                  {location.state
                    ? ` — ${location.state}`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          {selectedLocation && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Oil Storage System
              </span>

              <select
                name="oil_storage_system"
                value={selectedStorageSystem}
                onChange={(event) =>
                  setSelectedStorageSystem(
                    event.target.value
                  )
                }
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
              >
                <option value="">
                  Select oil storage system
                </option>

                {storageOptions.map((system) => (
                  <option
                    key={system}
                    value={system}
                  >
                    {system} Oil Storage System
                  </option>
                ))}
              </select>

              {storageOptions.length === 1 && (
                <span className="mt-2 block text-sm text-slate-500">
                  This system was selected automatically for
                  the chosen warehouse.
                </span>
              )}
            </label>
          )}
        </>
      )}

      {showAssetSelection && (
        <section>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">
              {assetLabel(auditType)}
            </span>

            <select
              name="asset_id"
              value={selectedAsset}
              onChange={(event) =>
                setSelectedAsset(event.target.value)
              }
              required={assets.length > 0}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
            >
              <option value="">
                {assets.length === 0
                  ? "No applicable assets added yet"
                  : `Select ${assetLabel(
                      auditType
                    ).toLowerCase()}`}
              </option>

              {assets.map((asset) => (
                <option
                  key={asset.id}
                  value={asset.id}
                >
                  {asset.asset_type}{" "}
                  {asset.asset_number}
                  {asset.description
                    ? ` — ${asset.description}`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() =>
              setShowAssetEntry(
                (current) => !current
              )
            }
            className="mt-2 text-sm font-semibold text-emerald-700"
          >
            {showAssetEntry
              ? "Cancel New Asset"
              : `+ Add New ${assetLabel(auditType)}`}
          </button>

          {showAssetEntry && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={newAssetType}
                  onChange={(event) =>
                    setNewAssetType(event.target.value)
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-3"
                >
                  {allowedAssetTypes.map((type) => (
                    <option key={type} value={type}>
                      {type === "VAC"
                        ? "Vacuum"
                        : type}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={newAssetNumber}
                  onChange={(event) =>
                    setNewAssetNumber(
                      event.target.value
                    )
                  }
                  placeholder="Asset number"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-3"
                />
              </div>

              <input
                type="text"
                value={newAssetDescription}
                onChange={(event) =>
                  setNewAssetDescription(
                    event.target.value
                  )
                }
                placeholder="Description — optional"
                className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
              />

              <label className="mt-3 block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Warehouse assignment — optional
                </span>

                <select
                  value={assetLocation}
                  onChange={(event) =>
                    setAssetLocation(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
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

              <button
                type="button"
                disabled={saving}
                onClick={addAsset}
                className="mt-3 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                Add and Select {assetLabel(auditType)}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}