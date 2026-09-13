import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(request: Request) {
  try {
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

    const {
      data: currentManagementUser,
      error: currentUserError,
    } = await supabaseAdmin
      .from("management_users")
      .select("role, is_active")
      .eq("auth_user_id", user.id)
      .single()

    if (
      currentUserError ||
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

    const fullName = String(body.full_name || "").trim()

    const email = String(body.email || "")
      .trim()
      .toLowerCase()

    const role = String(body.role || "").trim()

    if (!fullName || !email || !role) {
      return NextResponse.json(
        { error: "Name, email and role are required." },
        { status: 400 }
      )
    }

    if (
      !["administrator", "manager", "auditor", "read_only"].includes(
        role
      )
    ) {
      return NextResponse.json(
        { error: "Invalid role." },
        { status: 400 }
      )
    }

    const {
      data: existingManagementUser,
    } = await supabaseAdmin
      .from("management_users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existingManagementUser) {
      return NextResponse.json(
        {
          error:
            "A management user with this email already exists.",
        },
        { status: 400 }
      )
    }

    const {
      data: createdUser,
      error: createError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    })

    if (createError || !createdUser.user) {
      return NextResponse.json(
        {
          error:
            createError?.message ||
            "The login account could not be created.",
        },
        { status: 400 }
      )
    }

    const authUserId = createdUser.user.id

    const { error: managementError } =
      await supabaseAdmin
        .from("management_users")
        .insert({
          auth_user_id: authUserId,
          email,
          full_name: fullName,
          role,
          is_active: true,
        })

    if (managementError) {
      await supabaseAdmin.auth.admin.deleteUser(
        authUserId
      )

      return NextResponse.json(
        { error: managementError.message },
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
            : "Unable to create user.",
      },
      { status: 500 }
    )
  }
}