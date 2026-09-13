"use client"

import { FormEvent, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ServiceAuditsAccessPage() {
  const router = useRouter()

  const [errorMessage, setErrorMessage] =
    useState("")

  const [signingIn, setSigningIn] =
    useState(false)

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setSigningIn(true)
    setErrorMessage("")

    const formData =
      new FormData(event.currentTarget)

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

      const response = await fetch(
        "/api/auth/service-audit-login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to sign in."
        )
      }

      router.push(
        result.redirect ||
          "/protected/audits/new"
      )

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
    <main className="page">
      <section className="accessCard">
        <Link
          className="backLink"
          href="/"
        >
          ← Return to Main Access
        </Link>

        <Image
          src="/filta-logo-clear.png"
          alt="Filta"
          width={300}
          height={110}
          className="logo"
          priority
        />

        <p className="eyebrow">
          DORADO ENVIRONMENTAL
        </p>

        <h1>
          Service Audit Login
        </h1>

        <p className="description">
          Sign in to begin an equipment,
          service-delivery, warehouse or
          vehicle audit.
        </p>

        {errorMessage && (
          <div
            className="errorMessage"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="field">
            <label htmlFor="email">
              Email Address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@gofilta.com"
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />

            <div className="forgotPassword">
              <Link href="/auth/forgot-password">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={signingIn}
          >
            {signingIn
              ? "Signing In..."
              : "Enter Service Audits"}
          </button>
        </form>

        <div className="managementAccess">
          <span>
            Management team?
          </span>

          <Link href="/auth/login">
            Management Login
          </Link>
        </div>

        <footer>
          Authorized Dorado Environmental
          personnel only
        </footer>
      </section>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background:
            radial-gradient(
              circle at top left,
              rgba(87, 187, 131, 0.16),
              transparent 36%
            ),
            #f1f5f9;
          color: #10152c;
          font-family: Arial, Helvetica, sans-serif;
        }

        .page {
          display: flex;
          min-height: 100vh;
          align-items: center;
          justify-content: center;
          padding: 30px 18px;
        }

        .accessCard {
          width: min(510px, 100%);
          padding: 34px;
          border: 1px solid #dbe2ea;
          border-radius: 22px;
          background: white;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.13);
        }

        .backLink {
          display: inline-block;
          margin-bottom: 28px;
          color: #253453;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
        }

        .logo {
          display: block;
          width: auto;
          max-width: 225px;
          height: auto;
          max-height: 90px;
          margin-bottom: 24px;
          object-fit: contain;
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #299665;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        h1 {
          margin: 0;
          font-size: 36px;
          line-height: 1.1;
        }

        .description {
          margin: 15px 0 27px;
          color: #526078;
          font-size: 16px;
          line-height: 1.55;
        }

        .errorMessage {
          margin-bottom: 20px;
          padding: 13px 15px;
          border: 1px solid #f2b8b5;
          border-radius: 10px;
          background: #fff1f0;
          color: #b42318;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.45;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .field {
          display: flex;
          flex-direction: column;
        }

        label {
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 800;
        }

        input {
          width: 100%;
          min-height: 54px;
          padding: 12px 16px;
          border: 1px solid #cbd5e1;
          border-radius: 11px;
          background: white;
          color: #10152c;
          font-size: 16px;
          outline: none;
        }

        input:focus {
          border-color: #299665;
          box-shadow:
            0 0 0 4px
            rgba(87, 187, 131, 0.18);
        }

        .forgotPassword {
          margin-top: 9px;
          text-align: right;
        }

        .forgotPassword a {
          color: #168554;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        button {
          width: 100%;
          min-height: 50px;
          padding: 12px 20px;
          border: 0;
          border-radius: 11px;
          background: #57bb83;
          color: white;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
        }

        button:hover {
          background: #46a972;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .managementAccess {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 25px;
          padding-top: 22px;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 14px;
        }

        .managementAccess a {
          color: #253453;
          font-weight: 800;
        }

        footer {
          margin-top: 24px;
          color: #8792a5;
          font-size: 12px;
          text-align: center;
        }

        @media (max-width: 540px) {
          .page {
            align-items: flex-start;
            padding: 14px;
          }

          .accessCard {
            padding: 26px 22px;
            border-radius: 17px;
          }

          .logo {
            max-width: 200px;
          }

          h1 {
            font-size: 31px;
          }
        }
      `}</style>
    </main>
  )
}