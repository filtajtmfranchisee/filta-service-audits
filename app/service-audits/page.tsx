import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

type PageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

async function enterServiceAudits(formData: FormData) {
  "use server"

  const submittedPasscode = String(
    formData.get("passcode") ?? ""
  ).trim()

  const correctPasscode =
    process.env.AUDIT_ENTRY_PASSCODE ?? "0414"

  if (submittedPasscode !== correctPasscode) {
    redirect(
      "/service-audits?error=The passcode entered was incorrect."
    )
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInAnonymously()

  if (error) {
    console.error("Anonymous audit access error:", error)

    redirect(
      `/service-audits?error=${encodeURIComponent(
        "Service Audit access could not be started. Please contact a manager."
      )}`
    )
  }

  redirect("/protected/audits/new")
}

export default async function ServiceAuditsAccessPage({
  searchParams,
}: PageProps) {
  const params = await searchParams
  const errorMessage = params.error
    ? decodeURIComponent(params.error)
    : ""

  return (
    <main className="page">
      <section className="accessCard">
        <Link className="backLink" href="/">
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

        <p className="eyebrow">DORADO ENVIRONMENTAL</p>
        <h1>Service Audits</h1>

        <p className="description">
          Enter the audit-team passcode to begin an equipment,
          service-delivery, warehouse or vehicle inspection.
        </p>

        {errorMessage ? (
          <div className="errorMessage" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <form action={enterServiceAudits}>
          <div className="field">
            <label htmlFor="passcode">Audit Passcode</label>

            <input
              id="passcode"
              name="passcode"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4}"
              minLength={4}
              maxLength={4}
              autoComplete="off"
              placeholder="Enter four-digit passcode"
              aria-describedby="passcodeHelp"
              required
              autoFocus
            />

            <p id="passcodeHelp" className="fieldHelp">
              Enter the four-digit Dorado audit-team passcode.
            </p>
          </div>

          <button type="submit">
            Enter Service Audits
          </button>
        </form>

        <div className="managementAccess">
          <span>Management team?</span>

          <Link href="/auth/login">
            Management Login
          </Link>
        </div>

        <footer>
          Authorized Dorado Environmental personnel only
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
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
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
          gap: 22px;
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
          min-height: 58px;
          padding: 12px 16px;
          border: 2px solid #1f2937;
          border-radius: 11px;
          background: white;
          color: #10152c;
          font-size: 21px;
          font-weight: 700;
          letter-spacing: 7px;
          text-align: center;
          outline: none;
        }

        input:focus {
          border-color: #299665;
          box-shadow: 0 0 0 4px rgba(87, 187, 131, 0.18);
        }

        input::placeholder {
          color: #9aa4b5;
          font-size: 15px;
          font-weight: 400;
          letter-spacing: 1px;
        }

        .fieldHelp {
          margin: 8px 0 0;
          color: #718096;
          font-size: 12px;
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