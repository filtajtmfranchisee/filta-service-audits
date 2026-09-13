"use client"

import { useCallback, useEffect, useState } from "react"
import type { ChangeEvent } from "react"

import { createClient } from "@/lib/supabase/client"

type Photo = {
  id: string
  storage_path: string
  caption: string | null
  created_at: string
  signedUrl: string
}

export default function AuditPhotos({ auditId }: { auditId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [caption, setCaption] = useState("")
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const loadPhotos = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("audit_photos")
      .select("id, storage_path, caption, created_at")
      .eq("audit_id", auditId)
      .order("created_at", { ascending: true })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    const photosWithUrls = await Promise.all(
      (data ?? []).map(async (photo) => {
        const { data: signedData } = await supabase.storage
          .from("audit-photos")
          .createSignedUrl(photo.storage_path, 3600)

        return {
          ...photo,
          signedUrl: signedData?.signedUrl || "",
        }
      })
    )

    setPhotos(photosWithUrls)
    setLoading(false)
  }, [auditId])

  useEffect(() => {
    void loadPhotos()
  }, [loadPhotos])

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""

    if (files.length === 0) return

    const invalidFile = files.find(
      (file) => !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024
    )

    if (invalidFile) {
      setErrorMessage("Each photo must be an image no larger than 10 MB.")
      return
    }

    setUploading(true)
    setMessage("")
    setErrorMessage("")

    try {
      const supabase = createClient()

      for (const file of files) {
        const safeName = file.name
          .toLowerCase()
          .replace(/[^a-z0-9.]+/g, "-")
          .replace(/^-+|-+$/g, "")
        const storagePath = `${auditId}/${crypto.randomUUID()}-${safeName}`

        const { error: uploadError } = await supabase.storage
          .from("audit-photos")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) throw uploadError

        const { error: recordError } = await supabase
          .from("audit_photos")
          .insert({
            audit_id: auditId,
            storage_path: storagePath,
            caption: caption.trim() || null,
          })

        if (recordError) {
          await supabase.storage.from("audit-photos").remove([storagePath])
          throw recordError
        }
      }

      setCaption("")
      setMessage(`${files.length} photo${files.length === 1 ? "" : "s"} added.`)
      await loadPhotos()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The photo could not be uploaded."
      )
    } finally {
      setUploading(false)
    }
  }

  async function updateCaption(photoId: string, value: string) {
    setPhotos((current) =>
      current.map((photo) =>
        photo.id === photoId ? { ...photo, caption: value } : photo
      )
    )
  }

  async function saveCaption(photo: Photo) {
    const supabase = createClient()
    const { error } = await supabase
      .from("audit_photos")
      .update({ caption: photo.caption?.trim() || null })
      .eq("id", photo.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setErrorMessage("")
    setMessage("Photo caption saved.")
  }

  async function deletePhoto(photo: Photo) {
    if (!window.confirm("Remove this photo from the audit?")) return

    setMessage("")
    setErrorMessage("")
    const supabase = createClient()

    const { error: storageError } = await supabase.storage
      .from("audit-photos")
      .remove([photo.storage_path])

    if (storageError) {
      setErrorMessage(storageError.message)
      return
    }

    const { error: recordError } = await supabase
      .from("audit_photos")
      .delete()
      .eq("id", photo.id)

    if (recordError) {
      setErrorMessage(recordError.message)
      return
    }

    setPhotos((current) => current.filter((item) => item.id !== photo.id))
    setMessage("Photo removed.")
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Audit Photos</h2>
          <p className="mt-2 text-sm text-slate-600">
            Optional. Add photos from the camera or photo library when they help document a finding.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {photos.length} photo{photos.length === 1 ? "" : "s"}
        </span>
      </div>

      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-semibold text-slate-800">
          Caption for New Photo(s) <span className="font-normal text-slate-500">Optional</span>
        </span>
        <input
          type="text"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Example: Damaged hose connection"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
        />
      </label>

      <label className={`mt-4 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl px-6 py-3 font-semibold text-white ${uploading ? "bg-slate-400" : "bg-emerald-500 hover:bg-emerald-400"}`}>
        {uploading ? "Uploading..." : "Add Optional Photos"}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={uploadPhotos}
          className="sr-only"
        />
      </label>

      {message && (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">
          {errorMessage}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading photos...</p>
      ) : photos.length > 0 ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <article key={photo.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {photo.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.signedUrl}
                  alt={photo.caption || "Audit photo"}
                  className="h-52 w-full object-cover"
                />
              ) : (
                <div className="flex h-52 items-center justify-center text-sm text-slate-500">
                  Preview unavailable
                </div>
              )}

              <div className="space-y-3 p-4">
                <input
                  type="text"
                  value={photo.caption || ""}
                  onChange={(event) => updateCaption(photo.id, event.target.value)}
                  placeholder="Add a caption"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveCaption(photo)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Save Caption
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePhoto(photo)}
                    className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
          No photos have been added. Photos are not required to complete this audit.
        </p>
      )}
    </section>
  )
}
