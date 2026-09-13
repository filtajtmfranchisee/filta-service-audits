import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
  return (
    <main className="page">
      <section className="accessCard">
        <div className="brand">
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
            Welcome to Dorado&apos;s Audit Site
          </h1>

          <p className="description">
            Please login for access.
          </p>
        </div>

        <div className="accessOptions">
          <article className="option serviceOption">
            <div className="icon">
              ✓
            </div>

            <div className="optionContent">
              <h2>
                Service Audit Login
              </h2>

              <p>
                For authorized personnel completing equipment,
                service-delivery, warehouse and vehicle audits.
                Enter the audit-team passcode to begin.
              </p>

              <Link
                className="primaryButton"
                href="/service-audits"
              >
                Service Audit Login
              </Link>
            </div>
          </article>

          <article className="option managementOption">
            <div className="icon">
              ▦
            </div>

            <div className="optionContent">
              <h2>
                Management Login
              </h2>

              <p>
                For authorized management users accessing audit
                results, reports, trends, corrective actions and
                administrative tools based on their assigned role.
              </p>

              <Link
                className="secondaryButton"
                href="/auth/login"
              >
                Management Login
              </Link>
            </div>
          </article>
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
          padding: 32px 20px;
        }

        .accessCard {
          width: min(920px, 100%);
          overflow: hidden;
          border: 1px solid #dbe2ea;
          border-radius: 24px;
          background: white;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
        }

        .brand {
          padding: 38px 42px 42px;
          background: #10152c;
          color: white;
        }

        .logo {
          display: block;
          width: auto;
          max-width: 260px;
          height: auto;
          max-height: 100px;
          margin-bottom: 25px;
          object-fit: contain;
        }

        .eyebrow {
          margin: 0 0 12px;
          color: #58d49a;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 1.6px;
        }

        h1 {
          max-width: 760px;
          margin: 0;
          font-size: clamp(34px, 6vw, 52px);
          line-height: 1.08;
        }

        .description {
          margin: 18px 0 0;
          color: #dbe4ff;
          font-size: 20px;
          line-height: 1.5;
        }

        .accessOptions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          padding: 30px;
          background: #f8fafc;
        }

        .option {
          display: flex;
          flex-direction: column;
          min-height: 330px;
          padding: 28px;
          border: 1px solid #dbe2ea;
          border-radius: 18px;
          background: white;
        }

        .serviceOption {
          border-top: 5px solid #57bb83;
        }

        .managementOption {
          border-top: 5px solid #253453;
        }

        .icon {
          display: flex;
          width: 48px;
          height: 48px;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          border-radius: 14px;
          background: #e7f8ef;
          color: #168554;
          font-size: 24px;
          font-weight: 900;
        }

        .managementOption .icon {
          background: #e8ebf2;
          color: #253453;
        }

        .optionContent {
          display: flex;
          flex: 1;
          flex-direction: column;
        }

        h2 {
          margin: 0;
          font-size: 24px;
        }

        .option p {
          flex: 1;
          margin: 14px 0 24px;
          color: #526078;
          font-size: 16px;
          line-height: 1.55;
        }

        .primaryButton,
        .secondaryButton {
          display: flex;
          min-height: 50px;
          align-items: center;
          justify-content: center;
          padding: 12px 20px;
          border-radius: 11px;
          font-size: 16px;
          font-weight: 800;
          text-align: center;
          text-decoration: none;
          transition:
            transform 120ms ease,
            background 120ms ease,
            color 120ms ease;
        }

        .primaryButton {
          background: #57bb83;
          color: white;
        }

        .primaryButton:hover {
          background: #46a972;
          transform: translateY(-1px);
        }

        .secondaryButton {
          border: 1px solid #253453;
          background: white;
          color: #253453;
        }

        .secondaryButton:hover {
          background: #253453;
          color: white;
          transform: translateY(-1px);
        }

        footer {
          padding: 18px 30px;
          border-top: 1px solid #e2e8f0;
          background: white;
          color: #718096;
          font-size: 13px;
          text-align: center;
        }

        @media (max-width: 720px) {
          .page {
            align-items: flex-start;
            padding: 16px 12px;
          }

          .accessCard {
            border-radius: 18px;
          }

          .brand {
            padding: 28px 24px 32px;
          }

          .logo {
            max-width: 220px;
            max-height: 85px;
          }

          .accessOptions {
            grid-template-columns: 1fr;
            padding: 20px;
          }

          .option {
            min-height: 290px;
            padding: 24px;
          }
        }
      `}</style>
    </main>
  )
}