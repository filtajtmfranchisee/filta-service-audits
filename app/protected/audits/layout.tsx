import Link from "next/link"

import { createClient } from "@/lib/supabase/server"

type AuditLayoutProps = {
  children: React.ReactNode
}

export default async function AuditLayout({
  children,
}: AuditLayoutProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isManagementUser =
    Boolean(user) && !user?.is_anonymous

  return (
    <>
      <header className="auditNavigation">
        <div className="navigationContainer">
          <div className="navigationLinks">
            <Link href="/protected">
              Service Audit Home
            </Link>

            <Link
              className="primaryNavigation"
              href="/protected/audits/new"
            >
              Choose Another Audit
            </Link>

            {isManagementUser ? (
              <>
                <Link href="/protected/audits">
                  Management Reports
                </Link>

                <Link href="/protected/admin">
                  Administration
                </Link>
              </>
            ) : null}
          </div>

          <span className="saveReminder">
            Save your draft before leaving an unfinished audit.
          </span>
        </div>
      </header>

      {children}

      <style>{`
        .auditNavigation {
          position: sticky;
          top: 0;
          z-index: 100;
          border-bottom: 1px solid #dbe2ea;
          background: rgba(255, 255, 255, 0.97);
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(8px);
        }

        .navigationContainer {
          display: flex;
          width: min(1280px, 100%);
          min-height: 64px;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin: 0 auto;
          padding: 10px 20px;
        }

        .navigationLinks {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .navigationLinks a {
          display: inline-flex;
          min-height: 40px;
          align-items: center;
          justify-content: center;
          padding: 9px 13px;
          border-radius: 8px;
          color: #253453;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
        }

        .navigationLinks a:hover {
          background: #f1f5f9;
        }

        .navigationLinks .primaryNavigation {
          background: #57bb83;
          color: white;
        }

        .navigationLinks .primaryNavigation:hover {
          background: #46a972;
        }

        .saveReminder {
          color: #718096;
          font-size: 12px;
          text-align: right;
        }

        @media (max-width: 780px) {
          .auditNavigation {
            position: relative;
          }

          .navigationContainer {
            align-items: stretch;
            flex-direction: column;
            padding: 12px;
          }

          .navigationLinks {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
          }

          .navigationLinks a {
            border: 1px solid #dbe2ea;
            background: white;
            text-align: center;
          }

          .navigationLinks .primaryNavigation {
            border-color: #57bb83;
          }

          .saveReminder {
            text-align: center;
          }
        }

        @media print {
          .auditNavigation {
            display: none;
          }
        }
      `}</style>
    </>
  )
}