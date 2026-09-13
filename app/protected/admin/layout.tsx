import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

type AdminLayoutProps = {
  children: React.ReactNode
}

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  if (user.is_anonymous) {
    redirect("/protected")
  }

  return <>{children}</>
}