"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  FormEvent,
  useState,
} from "react"

export default function ChangePasswordPage() {
  const router =
    useRouter()

  const [
    password,
    setPassword,
  ] =
    useState("")

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("")

  const [
    saving,
    setSaving,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState("")

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError("")

    if (
      password.length < 8
    ) {
      setError(
        "Password must be at least 8 characters."
      )
      return
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      )
      return
    }

    setSaving(true)

    try {
      const response =
        await fetch(
          "/api/change-password",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                password,
              }),
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to change password."
        )
      }

      router.push(
        "/protected"
      )

      router.refresh()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to change password."
      )

      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <Image
            src="/filta-logo-clear.png"
            alt="Filta"
            width={240}
            height={90}
            priority
            className="h-auto w-auto"
          />

          <p className="mt-7 text-sm font-bold uppercase tracking-widest text-emerald-700">
            Dorado Environmental
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Change Password
          </h1>

          <p className="mt-3 leading-6 text-slate-600">
            Before continuing to the Service Audit System, create a new password for your account.
          </p>

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-7 space-y-5"
          >
            <label className="block text-sm font-bold text-slate-700">
              New Password

              <input
                type="password"
                value={
                  password
                }
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block text-sm font-bold text-slate-700">
              Confirm New Password

              <input
                type="password"
                value={
                  confirmPassword
                }
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <p className="text-sm text-slate-500">
              Password must be at least 8 characters.
            </p>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                saving
              }
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Updating Password..."
                : "Change Password & Continue"}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}