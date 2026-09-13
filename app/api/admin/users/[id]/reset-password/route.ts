import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const TEMPORARY_PASSWORD = "Filta!1234"

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const { id } = await context.params

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.is_anonymous) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { data: currentUser } = await supabaseAdmin
      .from("management_users")
      .select("role, is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle()

    if (
      !currentUser ||
      !currentUser.is_active ||
      currentUser.role !== "administrator"
    ) {
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 }
      )
    }

    const {
      data: targetUser,
      error: targetError,
    } = await supabaseAdmin
      .from("management_users")
      .select(`
        id,
        auth_user_id,
        email,
        full_name
      `)
      .eq("id", id)
      .maybeSingle()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      )
    }

    if (!targetUser.auth_user_id) {
      return NextResponse.json(
        { error: "This user does not have a login account." },
        { status: 400 }
      )
    }

    if (
      targetUser.email.toLowerCase() ===
      "john.michals@gofilta.com"
    ) {
      return NextResponse.json(
        {
          error:
            "The primary administrator password cannot be reset to the temporary password here.",
        },
        { status: 400 }
      )
    }

    const { error: passwordError } =
      await supabaseAdmin.auth.admin.updateUserById(
        targetUser.auth_user_id,
        {
          password: TEMPORARY_PASSWORD,
        }
      )

    if (passwordError) {
      return NextResponse.json(
        { error: passwordError.message },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from("management_users")
      .update({
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      temporary_password: TEMPORARY_PASSWORD,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to reset password.",
      },
      { status: 500 }
    )
  }
}