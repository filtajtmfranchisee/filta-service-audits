import Link from "next/link"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

const auditTypes = [
  {
    type: "equipment",
    title: "MFU/MBU Equipment",
    description:
      "Inspect equipment function, condition, cleanliness, maintenance and safety.",
    items: [
      "MFU",
      "MBU",
      "Vacuum",
      "Other service equipment",
    ],
  },
  {
    type: "service_delivery",
    title: "Technician Service Delivery",
    description:
      "Observe the technician’s arrival, customer interaction, service execution and departure.",
    items: [
      "Customer arrival",
      "Service execution",
      "Safety procedures",
      "Customer departure",
    ],
  },
  {
    type: "warehouse",
    title: "Warehouse and 6K",
    description:
      "Inspect warehouse cleanliness, operating responsibilities, safety and applicable 6K systems.",
    items: [
      "Ocean Roller Road",
      "Roselle Park",
      "Roselle Park 6K",
      "PA Warehouse",
    ],
  },
  {
    type: "vehicle",
    title: "Van and Service Vehicle",
    description:
      "Inspect vehicle function, condition, cleanliness, organization and professional presentation.",
    items: [
      "Vehicle condition",
      "Interior cleanliness",
      "Service organization",
      "Safety and route readiness",
    ],
  },
]

export default async function NewAuditPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/protected"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
            Dorado Environmental
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Start a New Audit
          </h1>

          <p className="mt-3 text-slate-600">
            Select what you are auditing. The applicable inspection form will
            open next.
          </p>
        </div>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          {auditTypes.map((audit) => (
            <Link
              key={audit.type}
              href={`/protected/audits/new/details?type=${audit.type}`}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {audit.title}
                  </h2>

                  <p className="mt-2 leading-6 text-slate-600">
                    {audit.description}
                  </p>
                </div>

                <span className="text-2xl text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600">
                  →
                </span>
              </div>

              <ul className="mt-5 space-y-2 border-t border-slate-100 pt-5">
                {audit.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
