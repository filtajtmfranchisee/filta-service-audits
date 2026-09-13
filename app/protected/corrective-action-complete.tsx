"use client"

import {
  FormEvent,
  useState,
} from "react"

import { useRouter } from "next/navigation"

type Props = {
  actionId: string
}

export default function CorrectiveActionComplete({
  actionId,
}: Props) {
  const router = useRouter()

  const [errorMessage, setErrorMessage] =
    useState("")

  const [saving, setSaving] =
    useState(false)

  async function submitCompletion(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setSaving(true)
    setErrorMessage("")

    try {
      const form =
        event.currentTarget

      const formData =
        new FormData(form)

      const response =
        await fetch(
          `/api/corrective-actions/${actionId}/complete`,
          {
            method: "POST",
            body: formData,
          }
        )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to complete corrective action."
        )
      }

      form.reset()

      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to complete corrective action."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={submitCompletion}
      className="completionForm"
    >
      {errorMessage && (
        <div className="completionError">
          {errorMessage}
        </div>
      )}

      <div className="completionGrid">
        <label>
          <span>
            Completion Date
          </span>

          <input
            type="date"
            name="completion_date"
            required
          />
        </label>

        <label>
          <span>
            Completion Photo
          </span>

          <input
            type="file"
            name="photo"
            accept="image/*"
            required
          />
        </label>
      </div>

      <label className="completionNotes">
        <span>
          Completion Notes
        </span>

        <textarea
          name="completion_notes"
          rows={2}
          placeholder="Optional notes about what was corrected"
        />
      </label>

      <button
        type="submit"
        disabled={saving}
      >
        {saving
          ? "Saving..."
          : "Mark Corrective Action Complete"}
      </button>

      <style jsx>{`
        .completionForm {
          margin-top: 15px;
          padding: 16px;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          background: #f8fafc;
        }

        .completionGrid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        label span {
          display: block;
          margin-bottom: 6px;
          color: #334155;
          font-size: 12px;
          font-weight: 800;
        }

        input,
        textarea {
          width: 100%;
          padding: 10px 11px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          background: white;
          color: #0f172a;
        }

        .completionNotes {
          display: block;
          margin-top: 14px;
        }

        button {
          width: 100%;
          min-height: 44px;
          margin-top: 14px;
          border: 0;
          border-radius: 9px;
          background: #16a34a;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.55;
          cursor: default;
        }

        .completionError {
          margin-bottom: 12px;
          padding: 10px;
          border: 1px solid #fecaca;
          border-radius: 9px;
          background: #fef2f2;
          color: #991b1b;
          font-size: 13px;
          font-weight: 700;
        }

        @media (max-width: 650px) {
          .completionGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </form>
  )
}