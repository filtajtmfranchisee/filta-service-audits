"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

export default function ResetPasswordPage() {
  const router = useRouter()

  const [errorMessage, setErrorMessage] =
    useState("")

  const [saving, setSaving] =
    useState(false)

  async function resetPassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setSaving(true)
    setErrorMessage("")

    const form = event.currentTarget
    const formData = new FormData(form)

    const password = String(
      formData.get("password") || ""
    )

    const confirmPassword = String(
      formData.get("confirm_password") || ""
    )

    try {
      const response = await fetch(
        "/api/auth/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            password,
            confirm_password:
              confirmPassword,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to reset password."
        )
      }

      router.push("/protected")
      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to reset password."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12">
      <div className="mx-auto max-w-lg">
        <section className="rounded-2xl bg-white p-8 shadow-lg">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
            Dorado Environmental
          </p>

          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            Reset Your Password
          </h1>

          <p className="mt-3 text-slate-600">
            Create a new password for your Service
            Audit account.
          </p>

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
              {errorMessage}
            </div>
          )}

          <form
            onSubmit={resetPassword}
            className="mt-7"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                New Password
              </span>

              <input
                type="password"
                name="password"
                minLength={8}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Confirm New Password
              </span>

              <input
                type="password"
                name="confirm_password"
                minLength={8}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="mt-7 min-h-12 w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Reset Password"}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}