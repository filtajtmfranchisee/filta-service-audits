import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const email = String(body.email || "")
      .trim()
      .toLowerCase()

    const password = String(body.password || "")

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Email and password are required.",
        },
        {
          status: 400,
        }
      )
    }

    const supabase = await createClient()

    const {
      data,
      error: signInError,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !data.user) {
      return NextResponse.json(
        {
          error:
            signInError?.message ||
            "Unable to sign in.",
        },
        {
          status: 401,
        }
      )
    }

    const {
      data: managementUser,
      error: managementError,
    } = await supabaseAdmin
      .from("management_users")
      .select(`
        role,
        is_active,
        must_change_password
      `)
      .eq("auth_user_id", data.user.id)
      .maybeSingle()

    if (
      managementError ||
      !managementUser
    ) {
      await supabase.auth.signOut()

      return NextResponse.json(
        {
          error:
            "Your Service Audit access could not be verified.",
        },
        {
          status: 403,
        }
      )
    }

    if (!managementUser.is_active) {
      await supabase.auth.signOut()

      return NextResponse.json(
        {
          error: "Your account is inactive.",
        },
        {
          status: 403,
        }
      )
    }

    const allowedRoles = [
      "administrator",
      "manager",
      "auditor",
    ]

    if (
      !allowedRoles.includes(
        managementUser.role
      )
    ) {
      await supabase.auth.signOut()

      return NextResponse.json(
        {
          error:
            "Your account does not have Service Audit access.",
        },
        {
          status: 403,
        }
      )
    }

    if (
      managementUser.must_change_password
    ) {
      return NextResponse.json({
        success: true,
        redirect:
          "/protected/change-password",
      })
    }

    return NextResponse.json({
      success: true,
      redirect:
        "/protected/audits/new",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to sign in.",
      },
      {
        status: 500,
      }
    )
  }
}