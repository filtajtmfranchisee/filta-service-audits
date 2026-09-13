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

    const formData = new FormData(event.currentTarget)

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
        <section className="overflow-hidden rounded-3xl bg-white shadow-xl">
          <div className="bg-[#11152f] px-8 py-8 text-white">
            <Image
              src="/filta-logo-clear.png"
              alt="Filta"
              width={190}
              height={80}
              className="h-auto max-h-20 w-auto object-contain"
              priority
            />

            <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-emerald-400">
              Dorado Environmental
            </p>

            <h1 className="mt-2 text-4xl font-semibold">
              Management Login
            </h1>

            <p className="mt-3 text-slate-300">
              Sign in to access audits, reports,
              corrective actions and management tools.
            </p>
          </div>

          <div className="p-8">
            {errorMessage && (
              <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleLogin}>
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
                ← Return to Main Access
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}