import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function PATCH(
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

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { data: currentManagementUser } =
      await supabaseAdmin
        .from("management_users")
        .select("role, is_active")
        .eq("auth_user_id", user.id)
        .single()

    if (
      !currentManagementUser ||
      !currentManagementUser.is_active ||
      currentManagementUser.role !== "administrator"
    ) {
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 }
      )
    }

    const body = await request.json()

    const {
      data: managementUser,
      error: lookupError,
    } = await supabaseAdmin
      .from("management_users")
      .select("id, auth_user_id, is_active")
      .eq("id", id)
      .single()

    if (lookupError || !managementUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      )
    }

    const newStatus =
      typeof body.is_active === "boolean"
        ? body.is_active
        : managementUser.is_active

    const { error: updateError } =
      await supabaseAdmin
        .from("management_users")
        .update({
          is_active: newStatus,
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
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update user.",
      },
      { status: 500 }
    )
  }
}