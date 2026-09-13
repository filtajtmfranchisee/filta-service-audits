"use client"

import Link from "next/link"

type Props = {
  auditId: string
  status: string
  openHref: string
  canManageRecords: boolean
  reopenAction: (formData: FormData) => void | Promise<void>
  deleteAction: (formData: FormData) => void | Promise<void>
}

export default function AuditRecordActions({
  auditId,
  status,
  openHref,
  canManageRecords,
  reopenAction,
  deleteAction,
}: Props) {
  return (
    <div className="recordActions">
      <Link className="openLink" href={openHref}>
        {status === "submitted"
          ? "View Report"
          : canManageRecords
            ? "Continue"
            : "View"}
      </Link>

      {canManageRecords && status === "submitted" && (
        <form
          action={reopenAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                "Reopen this submitted audit for editing? Its final score will be cleared until it is submitted again."
              )
            ) {
              event.preventDefault()
            }
          }}
        >
          <input
            type="hidden"
            name="audit_id"
            value={auditId}
          />

          <button
            type="submit"
            className="reopenButton"
          >
            Reopen
          </button>
        </form>
      )}

      {canManageRecords && status !== "submitted" && (
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                "Permanently delete this draft audit? This cannot be undone."
              )
            ) {
              event.preventDefault()
            }
          }}
        >
          <input
            type="hidden"
            name="audit_id"
            value={auditId}
          />

          <button
            type="submit"
            className="deleteButton"
          >
            Delete Draft
          </button>
        </form>
      )}
    </div>
  )
}