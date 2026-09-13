"use client"

import { FormEvent, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [errorMessage, setErrorMessage] = useState("")
  const [signingIn, setSigningIn] = useState(false)

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setSigningIn(true)
    setErrorMessage("")

    const form = event.currentTarget
    const formData = new FormData(form)

    const email = String(
      formData.get("email") || ""
    )
      .trim()
      .toLowerCase()

    const password = String(
      formData.get("password") || ""
    )

    try {
      if (!email || !password) {
        throw new Error(
          "Email and password are required."
        )
      }

      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        })

      if (error) {
        throw error
      }

      router.push("/protected")
      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in."
      )
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12">
      <div className="mx-auto max-w-lg">
        <section className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="flex justify-center">
            <Image
              src="/filta-logo-clear.png"
              alt="Filta"
              width={240}
              height={100}
              className="h-auto max-h-24 w-auto object-contain"
              priority
            />
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
              Dorado Environmental
            </p>

            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Management Login
            </h1>

            <p className="mt-3 text-slate-600">
              Sign in to access audits, reports, corrective actions
              and management tools.
            </p>
          </div>

          {errorMessage && (
            <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
              {errorMessage}
            </div>
          )}

          <form
            onSubmit={handleLogin}
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              />
            </label>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Password
              </span>

              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              />
            </label>

            <div className="mt-3 text-right">
              <Link
                href="/auth/forgot-password"
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-600"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={signingIn}
              className="mt-6 min-h-12 w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white hover:bg-emerald-400 disabled:opacity-50"
            >
              {signingIn
                ? "Signing In..."
                : "Sign In"}
            </button>
          </form>

          <div className="mt-7 border-t border-slate-200 pt-6 text-center">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Return to Service Audit Access
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}