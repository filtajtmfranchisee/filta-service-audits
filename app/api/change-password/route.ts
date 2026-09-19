import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

type ChangePasswordBody = {
  password?: string
}

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient()

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          error:
            "You must be signed in.",
        },
        {
          status: 401,
        }
      )
    }

    const body =
      (await request.json()) as ChangePasswordBody

    const password =
      body.password?.trim()

    if (
      !password ||
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters.",
        },
        {
          status: 400,
        }
      )
    }

    const {
      error:
        passwordError,
    } =
      await supabase.auth.updateUser({
        password,
      })

    if (
      passwordError
    ) {
      return NextResponse.json(
        {
          error:
            passwordError.message,
        },
        {
          status: 400,
        }
      )
    }

    const {
      error:
        managementUserError,
    } =
      await supabaseAdmin
        .from("management_users")
        .update({
          must_change_password:
            false,
        })
        .eq(
          "auth_user_id",
          user.id
        )

    if (
      managementUserError
    ) {
      return NextResponse.json(
        {
          error:
            "Password was updated, but your account setup could not be completed.",
          details:
            managementUserError.message,
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(
      "Change password error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Unable to change password.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    )
  }
}