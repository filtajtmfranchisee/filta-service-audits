"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import AuditPhotos from "./audit-photos"
import {
  vehicleQuestions,
  warehouseQuestions,
} from "./additional-audit-questions"

import { createClient } from "@/lib/supabase/client"

type Rating =
  | "pass"
  | "needs_attention"
  | "fail"
  | "not_applicable"

type Question = {
  key: string
  section: string
  text: string
  critical?: boolean
  weight: number
}

type SavedResponse = {
  question_key: string | null
  response_value: string | null
  auditor_comment: string | null
}

type SavedCorrectiveAction = {
  question_key: string | null
  action_text: string | null
  owner_name: string | null
  due_date: string | null
  priority: string | null
  status: string | null
}

type Props = {
  auditId: string
  auditType: string
  oilStorageSystem: string | null
  isManagementUser: boolean
  initialStatus: string
  initialGeneralNotes: string
  initialResponses: SavedResponse[]
  initialCorrectiveActions?: SavedCorrectiveAction[]
}

type ResponseState = Record<
  string,
  {
    rating: Rating | ""
    comment: string
  }
>

type CorrectiveActionState = Record<
  string,
  {
    actionText: string
    ownerName: string
    dueDate: string
    priority: string
    status: string
  }
>

const ratingOptions: {
  value: Rating
  label: string
  score: number | null
  selectedClass: string
}[] = [
  {
    value: "pass",
    label: "Pass",
    score: 100,
    selectedClass:
      "border-emerald-600 bg-emerald-600 text-white",
  },
  {
    value: "needs_attention",
    label: "Needs Attention",
    score: 70,
    selectedClass:
      "border-amber-500 bg-amber-500 text-white",
  },
  {
    value: "fail",
    label: "Fail",
    score: 0,
    selectedClass:
      "border-red-600 bg-red-600 text-white",
  },
  {
    value: "not_applicable",
    label: "N/A",
    score: null,
    selectedClass:
      "border-slate-600 bg-slate-600 text-white",
  },
]

const equipmentQuestions: Question[] = [
  {
    key: "equipment_exterior_body",
    section: "Exterior Condition and Presentation",
    text: "Is the exterior body clean, presentable and free from significant damage or corrosion?",
    weight: 2,
  },
  {
    key: "equipment_wheels_brakes",
    section: "Exterior Condition and Presentation",
    text: "Are the wheels, brakes, handles and movement components in good condition and functioning properly?",
    weight: 2,
  },
  {
    key: "equipment_filtration_pots",
    section: "Exterior Condition and Presentation",
    text: "Are the filtration pots (pre-filter and filter) in good condition?",
    weight: 2,
  },
  {
    key: "equipment_lids_hardware",
    section: "Exterior Condition and Presentation",
    text: "Are the filter-pot lids, knobs, studs, bolts and locking plates present, secure and functioning properly?",
    weight: 2,
  },
  {
    key: "equipment_hoses",
    section: "Exterior Condition and Presentation",
    text: "Are the red and blue hoses, elbows, swivels and connections clean, secure and in good condition?",
    critical: true,
    weight: 3,
  },
  {
    key: "equipment_power_cord",
    section: "Exterior Condition and Presentation",
    text: "Is the power cord and plug clean, undamaged and safe to use?",
    critical: true,
    weight: 3,
  },
  {
    key: "equipment_motor_compartment",
    section: "Interior Condition and Cleanliness",
    text: "Is the motor compartment clean, dry and free from excessive grease, oil and debris?",
    weight: 2,
  },
  {
    key: "equipment_interior_tank",
    section: "Interior Condition and Cleanliness",
    text: "Is the interior tank clean, undamaged and in good operating condition?",
    weight: 2,
  },
  {
    key: "equipment_electrical_panel",
    section: "Interior Condition and Cleanliness",
    text: "Is the lower electrical panel clean, secure and free from exposed or damaged wiring?",
    critical: true,
    weight: 3,
  },
  {
    key: "equipment_prefilter_components",
    section: "Interior Condition and Cleanliness",
    text: "Are the pre-filter pot and pre-filter basket clean, undamaged and properly fitted?",
    weight: 2,
  },
  {
    key: "equipment_filter_pot_interior",
    section: "Interior Condition and Cleanliness",
    text: "Is the inside of the filter pot clean and free from excessive buildup or damage?",
    weight: 2,
  },
  {
    key: "equipment_overall_cleanliness",
    section: "Interior Condition and Cleanliness",
    text: "Is the entire unit free from excessive grease, grime, residue and unpleasant odors?",
    weight: 2,
  },
  {
    key: "equipment_startup",
    section: "Function and Operation",
    text: "Does the unit power on and start correctly?",
    critical: true,
    weight: 3,
  },
  {
    key: "equipment_pump",
    section: "Function and Operation",
    text: "Does the pump operate with consistent flow and adequate pressure?",
    critical: true,
    weight: 3,
  },
  {
    key: "equipment_heater",
    section: "Function and Operation",
    text: "Does the heater operate properly and reach the required operating condition?",
    critical: true,
    weight: 3,
  },
  {
    key: "equipment_indicator_lights",
    section: "Function and Operation",
    text: "Are the power, start and heater indicator lights functioning properly?",
    weight: 1,
  },
  {
    key: "equipment_emergency_stop",
    section: "Function and Operation",
    text: "Does the emergency-stop control function properly?",
    critical: true,
    weight: 3,
  },
  {
    key: "equipment_proximity_sensor",
    section: "Function and Operation",
    text: "Does the proximity sensor function properly?",
    critical: true,
    weight: 2,
  },
  {
    key: "equipment_overflow_sensor",
    section: "Function and Operation",
    text: "Does the overflow sensor function properly?",
    critical: true,
    weight: 3,
  },
  {
    key: "equipment_discharge_override",
    section: "Function and Operation",
    text: "Does the discharge override function properly?",
    critical: true,
    weight: 2,
  },
  {
    key: "equipment_leaks",
    section: "Function and Operation",
    text: "Is the unit free from active oil leaks at the pots, hoses, fittings, pump and tank?",
    critical: true,
    weight: 3,
  },
  {
    key: "equipment_normal_operation",
    section: "Function and Operation",
    text: "Does the unit operate without unusual noise, vibration, odor, overheating or interruption?",
    weight: 2,
  },
  {
    key: "equipment_maintenance",
    section: "Maintenance and Service Readiness",
    text: "Does the equipment show evidence of regular cleaning and preventive maintenance?",
    weight: 2,
  },
  {
    key: "equipment_repairs",
    section: "Maintenance and Service Readiness",
    text: "Have known defects, worn components and required repairs been properly addressed?",
    weight: 2,
  },
  {
    key: "equipment_tools_keys",
    section: "Maintenance and Service Readiness",
    text: "Are both MFU keys and the required operating tools and attachments present?",
    weight: 1,
  },
  {
    key: "equipment_service_ready",
    section: "Maintenance and Service Readiness",
    text: "Is the unit safe, clean, fully functional and ready for continued customer service?",
    critical: true,
    weight: 3,
  },
]

const serviceDeliveryQuestions: Question[] = [
  {
    key: "service_arrived_on_time",
    section: "Arrival and Professional Presentation",
    text: "Did the technician arrive within the expected service window?",
    weight: 2,
  },
  {
    key: "service_uniform_appearance",
    section: "Arrival and Professional Presentation",
    text: "Was the technician in the proper uniform and professionally presented?",
    weight: 2,
  },
  {
    key: "service_vehicle_parking",
    section: "Arrival and Professional Presentation",
    text: "Was the service vehicle parked safely without obstructing customer operations?",
    critical: true,
    weight: 3,
  },
  {
    key: "service_customer_checkin",
    section: "Arrival and Professional Presentation",
    text: "Did the technician properly check in and confirm the service with the customer?",
    weight: 2,
  },
  {
    key: "service_equipment_entry",
    section: "Arrival and Professional Presentation",
    text: "Were equipment, hoses and tools brought into the location safely and professionally?",
    critical: true,
    weight: 2,
  },
  {
    key: "service_ppe",
    section: "Service Setup and Safety",
    text: "Did the technician use the required PPE throughout the service?",
    critical: true,
    weight: 3,
  },
  {
    key: "service_work_area_secured",
    section: "Service Setup and Safety",
    text: "Was the work area controlled and protected from customer and employee traffic?",
    critical: true,
    weight: 3,
  },
  {
    key: "service_hose_placement",
    section: "Service Setup and Safety",
    text: "Were hoses and cords positioned to prevent trip, burn and obstruction hazards?",
    critical: true,
    weight: 3,
  },
  {
    key: "service_equipment_setup",
    section: "Service Setup and Safety",
    text: "Was the MFU/MBU positioned securely and set up correctly?",
    critical: true,
    weight: 3,
  },
  {
    key: "service_spill_prevention",
    section: "Service Setup and Safety",
    text: "Were appropriate steps taken to prevent and contain oil, grease and water spills?",
    critical: true,
    weight: 3,
  },
  {
    key: "service_fryer_inspection",
    section: "Service Execution",
    text: "Did the technician inspect the fryer, oil condition and surrounding work area before beginning?",
    weight: 2,
  },
  {
    key: "service_oil_handling",
    section: "Service Execution",
    text: "Was hot oil handled safely and transferred without unnecessary spills or exposure?",
    critical: true,
    weight: 3,
  },
  {
    key: "service_filtration_process",
    section: "Service Execution",
    text: "Was the oil filtered according to the required Filta service procedure?",
    critical: true,
    weight: 3,
  },
  {
    key: "service_fryer_cleaning",
    section: "Service Execution",
    text: "Was the fryer cleaned thoroughly within the defined service scope?",
    weight: 3,
  },
  {
    key: "service_debris_removed",
    section: "Service Execution",
    text: "Were crumbs, carbon buildup and cooking debris properly removed?",
    weight: 2,
  },
  {
    key: "service_oil_returned",
    section: "Service Execution",
    text: "Was the filtered oil returned safely and at the appropriate level?",
    critical: true,
    weight: 3,
  },
  {
    key: "service_fryer_reassembled",
    section: "Service Execution",
    text: "Was the fryer properly reassembled and returned to operating condition?",
    critical: true,
    weight: 3,
  },
  {
    key: "service_efficient_organized",
    section: "Service Execution",
    text: "Did the technician work efficiently, remain organized and minimize disruption to the customer?",
    weight: 2,
  },
  {
    key: "service_issues_identified",
    section: "Service Execution",
    text: "Did the technician identify and appropriately communicate fryer, oil or equipment concerns?",
    weight: 2,
  },
  {
    key: "service_fryer_left_clean",
    section: "Cleanup and Departure",
    text: "Was the fryer left clean, properly assembled and ready for customer use?",
    weight: 3,
  },
  {
    key: "service_area_left_clean",
    section: "Cleanup and Departure",
    text: "Was the surrounding service area left clean and free from oil, grease, water and debris?",
    critical: true,
    weight: 3,
  },
  {
    key: "service_floor_checked",
    section: "Cleanup and Departure",
    text: "Was the floor checked and left dry and free from slip hazards?",
    critical: true,
    weight: 3,
  },
  {
    key: "service_tools_accounted",
    section: "Cleanup and Departure",
    text: "Were all tools, hoses and service equipment accounted for and removed safely?",
    weight: 2,
  },
  {
    key: "service_documentation",
    section: "Cleanup and Departure",
    text: "Was the required service documentation completed accurately?",
    weight: 2,
  },
  {
    key: "service_customer_review",
    section: "Cleanup and Departure",
    text: "Did the technician review the completed service and any findings with the customer?",
    weight: 2,
  },
  {
    key: "service_customer_checkout",
    section: "Cleanup and Departure",
    text: "Did the technician properly check out with the customer before leaving?",
    weight: 2,
  },
  {
    key: "service_courtesy",
    section: "Overall Customer Experience",
    text: "Was the technician courteous and professional with customer employees?",
    weight: 2,
  },
  {
    key: "service_communication",
    section: "Overall Customer Experience",
    text: "Did the technician communicate clearly and demonstrate appropriate service knowledge?",
    weight: 2,
  },
  {
    key: "service_brand_standard",
    section: "Overall Customer Experience",
    text: "Did the technician represent Dorado Environmental and the Filta brand appropriately?",
    weight: 2,
  },
  {
    key: "service_overall_standard",
    section: "Overall Customer Experience",
    text: "Did the complete customer visit meet Dorado’s service-delivery standard?",
    critical: true,
    weight: 3,
  },
]

function getQuestions(
  auditType: string,
  oilStorageSystem: string | null
): Question[] {
  if (auditType === "equipment") {
    return equipmentQuestions
  }

  if (auditType === "service_delivery") {
    return serviceDeliveryQuestions
  }

  if (auditType === "warehouse") {
    const systemLabel = oilStorageSystem
      ? `${oilStorageSystem} Oil Storage System`
      : "Oil Storage System"

    return warehouseQuestions.map((question) => ({
      ...question,
      section:
        question.section === "Oil Storage System"
          ? systemLabel
          : question.section,
    }))
  }

  if (auditType === "vehicle") {
    return vehicleQuestions
  }

  return []
}

function getGrade(score: number) {
  if (score >= 95) return "A"
  if (score >= 90) return "A-"
  if (score >= 87) return "B+"
  if (score >= 83) return "B"
  if (score >= 80) return "B-"
  if (score >= 75) return "C"
  if (score >= 70) return "D"

  return "F"
}

function getClassification(
  score: number,
  criticalFailure: boolean
) {
  if (criticalFailure) {
    return "Critical Action Required"
  }

  if (score >= 95) return "Excellent"
  if (score >= 83) return "Meets Standard"
  if (score >= 75) return "Needs Improvement"

  return "Unsatisfactory"
}

export default function AuditForm({
  auditId,
  auditType,
  oilStorageSystem,
  isManagementUser,
  initialStatus,
  initialGeneralNotes,
  initialResponses,
  initialCorrectiveActions = [],
}: Props) {
  const supabase = createClient()
  const questions = getQuestions(
    auditType,
    oilStorageSystem
  )

  const savedResponseState: ResponseState = {}
  const savedCorrectiveActionState: CorrectiveActionState = {}

  for (const savedResponse of initialResponses) {
    if (!savedResponse.question_key) continue

    savedResponseState[savedResponse.question_key] = {
      rating:
        (savedResponse.response_value as Rating | null) || "",
      comment: savedResponse.auditor_comment || "",
    }
  }

  for (const action of initialCorrectiveActions) {
    if (!action.question_key) continue

    savedCorrectiveActionState[action.question_key] = {
      actionText: action.action_text || "",
      ownerName: action.owner_name || "",
      dueDate: action.due_date || "",
      priority: action.priority || "medium",
      status: action.status || "open",
    }
  }

  const [responses, setResponses] =
    useState<ResponseState>(savedResponseState)

  const [correctiveActions, setCorrectiveActions] =
    useState<CorrectiveActionState>(
      savedCorrectiveActionState
    )

  const [generalNotes, setGeneralNotes] =
    useState(initialGeneralNotes)

  const [positiveObservations, setPositiveObservations] =
    useState("")

  const [improvementAreas, setImprovementAreas] =
    useState("")

  const [immediateConcerns, setImmediateConcerns] =
    useState("")

  const [recommendedActions, setRecommendedActions] =
    useState("")

  const [followUpRequired, setFollowUpRequired] =
    useState(false)

  const [followUpDate, setFollowUpDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [submitted, setSubmitted] = useState(
    initialStatus === "submitted"
  )

  const result = useMemo(() => {
    let earnedPoints = 0
    let possiblePoints = 0
    let answered = 0
    let needsAttention = 0
    let failures = 0
    let criticalFailure = false

    for (const question of questions) {
      const response = responses[question.key]
      const rating = response?.rating

      if (!rating) continue

      answered += 1

      if (rating === "not_applicable") continue

      if (rating === "needs_attention") {
        needsAttention += 1
      }

      if (rating === "fail") {
        failures += 1

        if (question.critical) {
          criticalFailure = true
        }
      }

      const option = ratingOptions.find(
        (item) => item.value === rating
      )

      if (!option || option.score === null) continue

      earnedPoints += option.score * question.weight
      possiblePoints += 100 * question.weight
    }

    const score =
      possiblePoints > 0
        ? Math.round(
            (earnedPoints / possiblePoints) * 1000
          ) / 10
        : null

    return {
      answered,
      needsAttention,
      failures,
      criticalFailure,
      score,
      grade: score === null ? "—" : getGrade(score),
      classification:
        score === null
          ? "Not Yet Scored"
          : getClassification(score, criticalFailure),
    }
  }, [questions, responses])

  function setRating(
    questionKey: string,
    rating: Rating
  ) {
    setResponses((current) => ({
      ...current,
      [questionKey]: {
        rating,
        comment: current[questionKey]?.comment || "",
      },
    }))
  }

  function setComment(
    questionKey: string,
    comment: string
  ) {
    setResponses((current) => ({
      ...current,
      [questionKey]: {
        rating: current[questionKey]?.rating || "",
        comment,
      },
    }))
  }

  function setCorrectiveActionField(
    questionKey: string,
    field: "actionText" | "ownerName" | "dueDate" | "priority",
    value: string
  ) {
    setCorrectiveActions((current) => ({
      ...current,
      [questionKey]: {
        actionText: current[questionKey]?.actionText || "",
        ownerName: current[questionKey]?.ownerName || "",
        dueDate: current[questionKey]?.dueDate || "",
        priority: current[questionKey]?.priority || "medium",
        status: current[questionKey]?.status || "open",
        [field]: value,
      },
    }))
  }

  async function saveAudit(submitAudit: boolean) {
    setSaving(true)
    setSuccessMessage("")
    setErrorMessage("")

    try {
      if (questions.length === 0) {
        throw new Error(
          "The questions for this audit type have not been configured."
        )
      }

      if (submitAudit) {
        const unansweredQuestions = questions.filter(
          (question) => !responses[question.key]?.rating
        )

        if (unansweredQuestions.length > 0) {
          throw new Error(
            `Please answer all questions. ${unansweredQuestions.length} remain unanswered.`
          )
        }

        const incompleteActions = questions.filter(
          (question) => {
            const response = responses[question.key]
            const action = correctiveActions[question.key]
            const issueSelected =
              response?.rating === "needs_attention" ||
              response?.rating === "fail"

            return (
              issueSelected &&
              (!action?.actionText.trim() ||
                !action?.ownerName.trim() ||
                !action?.dueDate)
            )
          }
        )

        if (incompleteActions.length > 0) {
          throw new Error(
            "Action Required, Corrective Action Owner and Due Date are required for every Needs Attention or Fail response."
          )
        }

        if (result.score === null) {
          throw new Error(
            "At least one applicable question is required to calculate a grade."
          )
        }

        if (followUpRequired && !followUpDate) {
          throw new Error(
            "Select a follow-up date when follow-up is required."
          )
        }
      }

      const responseRows = questions
        .filter(
          (question) => responses[question.key]?.rating
        )
        .map((question) => {
          const response = responses[question.key]

          const option = ratingOptions.find(
            (item) => item.value === response.rating
          )

          const applicable =
            response.rating !== "not_applicable"

          return {
            audit_id: auditId,
            question_id: null,
            question_key: question.key,
            section_name: question.section,
            question_text: question.text,
            response_value: response.rating,
            earned_score:
              applicable && option?.score !== null
                ? ((option?.score || 0) *
                    question.weight) /
                  100
                : null,
            possible_score: applicable
              ? question.weight
              : null,
            auditor_comment:
              response.comment.trim() || null,
            issue_found:
              response.rating === "needs_attention" ||
              response.rating === "fail",
            critical_failure:
              Boolean(question.critical) &&
              response.rating === "fail",
          }
        })

      if (responseRows.length > 0) {
        const { error: responseError } = await supabase
          .from("audit_responses")
          .upsert(responseRows, {
            onConflict: "audit_id,question_key",
          })

        if (responseError) {
          throw responseError
        }
      }

      const notes = {
        general_notes: generalNotes.trim() || null,
        positive_observations:
          positiveObservations.trim() || null,
        improvement_areas:
          improvementAreas.trim() || null,
        immediate_concerns:
          immediateConcerns.trim() || null,
        recommended_actions:
          recommendedActions.trim() || null,
        follow_up_required: followUpRequired,
        recommended_follow_up_date:
          followUpRequired && followUpDate
            ? followUpDate
            : null,
      }

      const updateValues = submitAudit
        ? {
            ...notes,
            overall_score: result.score,
            letter_grade: result.grade,
            result_classification:
              result.classification,
            critical_failure: result.criticalFailure,
            status: "submitted",
            submitted_at: new Date().toISOString(),
          }
        : notes

      const correctiveActionRows = questions
        .filter((question) => {
          const rating = responses[question.key]?.rating
          return rating === "needs_attention" || rating === "fail"
        })
        .map((question) => {
          const action = correctiveActions[question.key]

          return {
            audit_id: auditId,
            question_key: question.key,
            action_text: action?.actionText.trim() || null,
            description: action?.actionText.trim() || "Corrective action required",
            owner_name: action?.ownerName.trim() || null,
            due_date: action?.dueDate || null,
            priority: action?.priority || "medium",
            status: action?.status || "open",
            updated_at: new Date().toISOString(),
          }
        })

      const { error: deleteActionError } = await supabase
        .from("corrective_actions")
        .delete()
        .eq("audit_id", auditId)

      if (deleteActionError) {
        throw deleteActionError
      }

      if (correctiveActionRows.length > 0) {
        const { error: actionError } = await supabase
          .from("corrective_actions")
          .insert(correctiveActionRows)

        if (actionError) {
          throw actionError
        }
      }

      const { error: auditError } = await supabase
        .from("audits")
        .update(updateValues)
        .eq("id", auditId)

      if (auditError) {
        throw auditError
      }

      setSuccessMessage(
        submitAudit
          ? `Audit submitted successfully. Final score: ${result.score}% — Grade ${result.grade}.`
          : "Draft saved successfully."
      )

      if (submitAudit) {
        setSubmitted(true)
      }
    } catch (error) {
      const detailedMessage =
        error &&
        typeof error === "object" &&
        "message" in error
          ? String(error.message)
          : null

      setErrorMessage(
        detailedMessage || "The audit could not be saved."
      )
    } finally {
      setSaving(false)
    }
  }

  if (questions.length === 0) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-xl font-bold text-amber-950">
          Audit Questions Not Yet Available
        </h2>

        <p className="mt-2 text-amber-800">
          The questions for this audit type will be added next.
        </p>
      </section>
    )
  }

  const sections = Array.from(
    new Set(
      questions.map((question) => question.section)
    )
  )

  return (
    <div className="space-y-8">
      <section className="sticky top-4 z-10 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg backdrop-blur">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <ScoreItem
            label="Answered"
            value={`${result.answered}/${questions.length}`}
          />

          <ScoreItem
            label="Score"
            value={
              result.score === null
                ? "—"
                : `${result.score}%`
            }
          />

          <ScoreItem
            label="Grade"
            value={result.grade}
          />

          <ScoreItem
            label="Needs Attention"
            value={String(result.needsAttention)}
            warning={result.needsAttention > 0}
          />

          <ScoreItem
            label="Failed"
            value={String(result.failures)}
            warning={result.failures > 0}
          />

          <ScoreItem
            label="Result"
            value={result.classification}
            warning={result.criticalFailure}
          />
        </div>
      </section>

      {sections.map((section) => (
        <section
          key={section}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900">
            {section}
          </h2>

          <div className="mt-6 space-y-6">
            {questions
              .filter(
                (question) =>
                  question.section === section
              )
              .map((question, index) => {
                const response =
                  responses[question.key]

                const issueSelected =
                  response?.rating ===
                    "needs_attention" ||
                  response?.rating === "fail"

                const correctiveAction =
                  correctiveActions[question.key]

                return (
                  <article
                    key={question.key}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex gap-3">
                      <span className="font-bold text-slate-400">
                        {index + 1}.
                      </span>

                      <div>
                        <p className="font-semibold leading-6 text-slate-900">
                          {question.text}
                        </p>

                        {question.critical && (
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-red-600">
                            Critical standard
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-4">
                      {ratingOptions.map((option) => {
                        const selected =
                          response?.rating ===
                          option.value

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setRating(
                                question.key,
                                option.value
                              )
                            }
                            className={`rounded-lg border px-3 py-3 text-sm font-semibold transition ${
                              selected
                                ? option.selectedClass
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>

                    <textarea
                      rows={2}
                      value={response?.comment || ""}
                      onChange={(event) =>
                        setComment(
                          question.key,
                          event.target.value
                        )
                      }
                      placeholder="Optional additional auditor comment"
                      className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
                    />

                    {issueSelected && (
                      <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
                        <h3 className="font-bold text-amber-950">
                          Corrective Action
                        </h3>

                        <p className="mt-1 text-sm text-amber-800">
                          Assign the action, owner, due date and priority.
                        </p>

                        <label className="mt-4 block">
                          <span className="mb-2 block text-sm font-semibold text-slate-800">
                            Action Required
                          </span>

                          <textarea
                            rows={2}
                            value={correctiveAction?.actionText || ""}
                            onChange={(event) =>
                              setCorrectiveActionField(
                                question.key,
                                "actionText",
                                event.target.value
                              )
                            }
                            placeholder="Describe what must be corrected"
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
                          />
                        </label>

                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-800">
                              Corrective Action Owner
                            </span>

                            <input
                              type="text"
                              value={correctiveAction?.ownerName || ""}
                              onChange={(event) =>
                                setCorrectiveActionField(
                                  question.key,
                                  "ownerName",
                                  event.target.value
                                )
                              }
                              placeholder="First and last name"
                              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-800">
                              Due Date
                            </span>

                            <input
                              type="date"
                              value={correctiveAction?.dueDate || ""}
                              onChange={(event) =>
                                setCorrectiveActionField(
                                  question.key,
                                  "dueDate",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-800">
                              Priority
                            </span>

                            <select
                              value={correctiveAction?.priority || "medium"}
                              onChange={(event) =>
                                setCorrectiveActionField(
                                  question.key,
                                  "priority",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
          </div>
        </section>
      ))}

      <AuditPhotos auditId={auditId} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">
          Auditor’s Notes
        </h2>

        <div className="mt-6 space-y-5">
          <NotesField
            label="General Auditor’s Notes"
            value={generalNotes}
            onChange={setGeneralNotes}
          />

          <NotesField
            label="Positive Observations"
            value={positiveObservations}
            onChange={setPositiveObservations}
          />

          <NotesField
            label="Areas Requiring Improvement"
            value={improvementAreas}
            onChange={setImprovementAreas}
          />

          <NotesField
            label="Immediate Safety or Operational Concerns"
            value={immediateConcerns}
            onChange={setImmediateConcerns}
          />

          <NotesField
            label="Recommended Corrective Actions"
            value={recommendedActions}
            onChange={setRecommendedActions}
          />

          <div className="rounded-xl border border-slate-200 p-5">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={followUpRequired}
                onChange={(event) =>
                  setFollowUpRequired(
                    event.target.checked
                  )
                }
                className="h-5 w-5 rounded border-slate-300"
              />

              <span className="font-semibold text-slate-900">
                Follow-up inspection required
              </span>
            </label>

            {followUpRequired && (
              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">
                  Recommended Follow-Up Date
                </span>

                <input
                  type="date"
                  value={followUpDate}
                  onChange={(event) =>
                    setFollowUpDate(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 sm:max-w-xs"
                />
              </label>
            )}
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 font-medium text-red-800">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-medium text-emerald-800">
          {successMessage}
        </div>
      )}

      {submitted ? (
        <section className="grid gap-3 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          {isManagementUser && (
            <Link
              href={`/protected/audits/${auditId}/report`}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-400"
            >
              View Completed Report
            </Link>
          )}

          <Link
            href="/protected/audits/new"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-emerald-500 px-6 py-3 font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Start Another Audit
          </Link>

          {isManagementUser && (
            <Link
              href="/protected/audits"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Management Reports
            </Link>
          )}

          <Link
            href="/protected"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Dashboard
          </Link>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row">
          <button
            type="button"
            disabled={saving}
            onClick={() => saveAudit(false)}
            className="min-h-12 flex-1 rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => saveAudit(true)}
            className="min-h-12 flex-1 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Submit and Grade Audit"}
          </button>

          <Link
            href="/protected"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Dashboard
          </Link>
        </section>
      )}
    </div>
  )
}

function ScoreItem({
  label,
  value,
  warning = false,
}: {
  label: string
  value: string
  warning?: boolean
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-bold ${
          warning ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function NotesField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
      </span>

      <textarea
        rows={3}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
      />
    </label>
  )
}
