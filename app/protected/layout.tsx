import Link from "next/link"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import LogoutButton from "@/components/logout-button"

type ProtectedLayoutProps = {
  children: React.ReactNode
}

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <Link
            href="/protected"
            className="font-bold text-slate-900 no-underline"
          >
            Dorado Service Audits
          </Link>

          <div className="flex items-center gap-4">
            {user.email && (
              <span className="hidden text-sm text-slate-600 sm:inline">
                {user.email}
              </span>
            )}

            <LogoutButton />
          </div>
        </div>
      </header>

      {children}
    </>
  )
}