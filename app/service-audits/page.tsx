"use client"

import { FormEvent, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ServiceAuditsAccessPage() {
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

      const response = await fetch(
        "/api/auth/service-audit-login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to sign in."
        )
      }

      router.push(
        result.redirect || "/protected/audits/new"
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
        <div className="header">
          <Image
            src="/filta-logo-clear.png"
            alt="Filta"
            width={220}
            height={85}
            className="logo"
            priority
          />

          <p className="eyebrow">
            DORADO ENVIRONMENTAL
          </p>

          <h1>Service Audit Login</h1>

          <p className="description">
            Sign in to begin an equipment,
            service-delivery, warehouse or vehicle audit.
          </p>
        </div>

        <div className="formArea">
          {errorMessage && (
            <div className="errorMessage">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <label>
              <span>Email Address</span>

              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="name@gofilta.com"
              />
            </label>

            <label>
              <span>Password</span>

              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
              />
            </label>

            <div className="forgotPassword">
              <Link href="/auth/forgot-password">
                Forgot password?
              </Link>
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

          <div className="divider" />

          <div className="bottomLinks">
            <Link href="/">
              ← Return to Main Access
            </Link>

            <p>
              Management team?{" "}
              <Link href="/auth/login">
                Management Login
              </Link>
            </p>
          </div>
        </div>
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
              rgba(87, 187, 131, 0.14),
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
          padding: 28px 18px;
        }

        .accessCard {
          width: min(515px, 100%);
          overflow: hidden;
          border: 1px solid #dbe2ea;
          border-radius: 24px;
          background: white;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.14);
        }

        .header {
          padding: 38px 34px 34px;
          background: #10152c;
          color: white;
        }

        .logo {
          display: block;
          width: auto;
          max-width: 185px;
          height: auto;
          max-height: 75px;
          margin-bottom: 26px;
          object-fit: contain;
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #58d49a;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 1.6px;
        }

        h1 {
          margin: 0;
          font-size: 37px;
          line-height: 1.1;
        }

        .description {
          margin: 13px 0 0;
          color: #dbe4ff;
          font-size: 16px;
          line-height: 1.5;
        }

        .formArea {
          padding: 34px;
        }

        .errorMessage {
          margin-bottom: 22px;
          padding: 14px 16px;
          border: 1px solid #f2b8b5;
          border-radius: 10px;
          background: #fff1f0;
          color: #b42318;
          font-size: 14px;
          font-weight: 700;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 21px;
        }

        label span {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 800;
        }

        input {
          width: 100%;
          min-height: 52px;
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
          box-shadow: 0 0 0 4px rgba(87, 187, 131, 0.18);
        }

        .forgotPassword {
          margin-top: -10px;
          text-align: right;
        }

        .forgotPassword a {
          color: #168554;
          font-size: 14px;
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
          opacity: 0.6;
          cursor: not-allowed;
        }

        .divider {
          height: 1px;
          margin: 28px 0 22px;
          background: #e2e8f0;
        }

        .bottomLinks {
          text-align: center;
        }

        .bottomLinks > a {
          color: #253453;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
        }

        .bottomLinks p {
          margin: 22px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .bottomLinks p a {
          color: #253453;
          font-weight: 800;
        }

        @media (max-width: 540px) {
          .page {
            align-items: flex-start;
            padding: 14px;
          }

          .accessCard {
            border-radius: 18px;
          }

          .header,
          .formArea {
            padding: 26px 22px;
          }

          h1 {
            font-size: 31px;
          }
        }
      `}</style>
    </main>
  )
}