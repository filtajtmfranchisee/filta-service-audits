import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

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

    const {
      data: managementUser,
      error: managementUserError,
    } = await supabaseAdmin
      .from("management_users")
      .select(`
        id,
        auth_user_id,
        full_name,
        role,
        is_active
      `)
      .eq("auth_user_id", user.id)
      .maybeSingle()

    if (
      managementUserError ||
      !managementUser ||
      !managementUser.is_active
    ) {
      return NextResponse.json(
        { error: "Management user not found." },
        { status: 403 }
      )
    }

    const {
      data: correctiveAction,
      error: correctiveActionError,
    } = await supabaseAdmin
      .from("corrective_actions")
      .select(`
        id,
        owner_name,
        status
      `)
      .eq("id", id)
      .maybeSingle()

    if (
      correctiveActionError ||
      !correctiveAction
    ) {
      return NextResponse.json(
        { error: "Corrective action not found." },
        { status: 404 }
      )
    }

    const isAdministrator =
      managementUser.role === "administrator"

    const isManager =
      managementUser.role === "manager"

    const assignedToCurrentUser =
      correctiveAction.owner_name
        ?.trim()
        .toLowerCase() ===
      managementUser.full_name
        ?.trim()
        .toLowerCase()

    if (
      !isAdministrator &&
      !isManager &&
      !assignedToCurrentUser
    ) {
      return NextResponse.json(
        {
          error:
            "You can only complete corrective actions assigned to you.",
        },
        { status: 403 }
      )
    }

    if (correctiveAction.status === "completed") {
      return NextResponse.json(
        {
          error:
            "This corrective action is already completed.",
        },
        { status: 400 }
      )
    }

    const formData = await request.formData()

    const completionDate = String(
      formData.get("completion_date") || ""
    ).trim()

    const completionNotes = String(
      formData.get("completion_notes") || ""
    ).trim()

    const photo = formData.get("photo")

    if (!completionDate) {
      return NextResponse.json(
        {
          error:
            "Completion date is required.",
        },
        { status: 400 }
      )
    }

    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json(
        {
          error:
            "A completion photo is required.",
        },
        { status: 400 }
      )
    }

    if (!photo.type.startsWith("image/")) {
      return NextResponse.json(
        {
          error:
            "Completion evidence must be an image.",
        },
        { status: 400 }
      )
    }

    const extension =
      photo.name.split(".").pop()?.toLowerCase() ||
      "jpg"

    const safeExtension =
      extension.replace(/[^a-z0-9]/g, "") ||
      "jpg"

    const photoPath =
      `${id}/${Date.now()}-completion.${safeExtension}`

    const photoBuffer =
      Buffer.from(await photo.arrayBuffer())

    const {
      error: uploadError,
    } = await supabaseAdmin.storage
      .from("corrective-action-photos")
      .upload(photoPath, photoBuffer, {
        contentType: photo.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        {
          error: uploadError.message,
        },
        { status: 400 }
      )
    }

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("corrective_actions")
      .update({
        status: "completed",
        completion_date: completionDate,
        completion_notes:
          completionNotes || null,
        completion_photo_path: photoPath,
        completed_by_user_id: user.id,
        completed_by_name:
          managementUser.full_name ||
          user.email ||
          null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      await supabaseAdmin.storage
        .from("corrective-action-photos")
        .remove([photoPath])

      return NextResponse.json(
        {
          error: updateError.message,
        },
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
            : "Unable to complete corrective action.",
      },
      { status: 500 }
    )
  }
}