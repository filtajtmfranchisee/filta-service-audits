"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"

import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const supabase = createClient()

  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [sending, setSending] = useState(false)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setSending(true)
    setMessage("")
    setErrorMessage("")

    const formData = new FormData(event.currentTarget)

    const email = String(
      formData.get("email") || ""
    )
      .trim()
      .toLowerCase()

    try {
      if (!email) {
        throw new Error(
          "Please enter your email address."
        )
      }

      const origin = window.location.origin

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              `${origin}/auth/callback?next=/auth/reset-password`,
          }
        )

      if (error) {
        throw error
      }

      setMessage(
        "If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder."
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to send the password reset email."
      )
    } finally {
      setSending(false)
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
            Forgot Password
          </h1>

          <p className="mt-3 text-slate-600">
            Enter the email address associated with your
            Service Audit account.
          </p>

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
              {errorMessage}
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              {message}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-7"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Email Address
              </span>

              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="name@gofilta.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <button
              type="submit"
              disabled={sending}
              className="mt-6 min-h-12 w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white hover:bg-emerald-400 disabled:opacity-50"
            >
              {sending
                ? "Sending..."
                : "Send Password Reset Link"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="text-sm font-bold text-emerald-700 hover:text-emerald-600"
            >
              ← Return to Login
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}