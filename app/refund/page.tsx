import SiteFooter from "@/components/layout/site-footer"
import Link from "next/link"

export default function RefundPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-5 text-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          ← Back to Hookory
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hookory Refund Policy
        </h1>
        <p className="text-slate-500 text-xs">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <p className="text-slate-700">
          Hookory processes refunds only within the rules below.
        </p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">
            Refund Eligibility and Window
          </h2>
          <p className="text-slate-700">
            Refund requests must be made within 3 days of purchase. A refund is
            approved only if you have generated less than 6 posts. Once you
            reach this free quota (5 per month) using our AI, the service is
            considered &quot;consumed&quot; and is non-refundable. If there is
            a valid service-related issue that prevents use, refunds may still
            be approved.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">
            How to Request a Refund
          </h2>
          <p className="text-slate-700">
            Please contact Hookory support through the app with the account
            email and payment details so the request can be reviewed.
          </p>
        </section>
        <SiteFooter />
      </div>
    </main>
  )
}
