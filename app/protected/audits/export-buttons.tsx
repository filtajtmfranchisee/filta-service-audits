"use client"

function cleanCell(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function csvCell(value: string) {
  return `"${cleanCell(value).replace(/"/g, '""')}"`
}

function buildFileName(extension: string) {
  const today = new Date().toISOString().slice(0, 10)

  return `dorado-service-audits-${today}.${extension}`
}

export default function ExportButtons() {
  function exportSpreadsheet() {
    const table = document.querySelector<HTMLTableElement>(
      "[data-audit-results-table]"
    )

    if (!table) {
      window.alert("The audit results table could not be found.")
      return
    }

    const rows = Array.from(table.querySelectorAll("tr"))

    const csvRows = rows
      .map((row) => {
        const cells = Array.from(
          row.querySelectorAll<HTMLTableCellElement>("th, td")
        )

        // Exclude the final Actions column.
        const exportCells = cells.slice(0, -1)

        return exportCells
          .map((cell) => csvCell(cell.innerText))
          .join(",")
      })
      .filter(Boolean)

    if (csvRows.length <= 1) {
      window.alert("There are no audit results to export.")
      return
    }

    // The BOM helps Excel display the file correctly.
    const csvContent = `\uFEFF${csvRows.join("\r\n")}`
    const file = new Blob([csvContent], {
      type: "text/csv;charset=utf-8",
    })

    const downloadUrl = URL.createObjectURL(file)
    const link = document.createElement("a")

    link.href = downloadUrl
    link.download = buildFileName("csv")

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(downloadUrl)
  }

  function exportPdf() {
    window.print()
  }

  return (
    <div className="exportButtons">
      <button
        type="button"
        className="exportButton exportSpreadsheet"
        onClick={exportSpreadsheet}
      >
        Export to Excel / Google Sheets
      </button>

      <button
        type="button"
        className="exportButton exportPdf"
        onClick={exportPdf}
      >
        Print / Save as PDF
      </button>

      <style jsx>{`
        .exportButtons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 22px;
        }

        .exportButton {
          min-height: 44px;
          padding: 11px 18px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .exportSpreadsheet {
          border-color: #57bb83;
          background: #57bb83;
          color: white;
        }

        .exportSpreadsheet:hover {
          background: #46a972;
        }

        .exportPdf {
          background: white;
          color: #17213c;
        }

        .exportPdf:hover {
          background: #f1f5f9;
        }

        @media print {
          .exportButtons {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}