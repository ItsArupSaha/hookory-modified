import Link from "next/link"

export default function SiteFooter() {
  return (
    <footer
      className="border-t border-stone-200 px-4 pt-8 text-xs text-stone-500 md:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700">Contact</p>
            <div className="space-y-1">
              <p className="text-stone-700">Hookory</p>
              <p>Mohini-160</p>
              <p>Shibganj, Sylhet, Bangladesh</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:growwitharup@gmail.com"
                  className="text-emerald-700 hover:text-emerald-800"
                >
                  growwitharup@gmail.com
                </a>
              </p>
            </div>
          </div>

          <div className="space-y-2 md:justify-self-center">
            <p className="text-sm font-medium text-stone-700">Legal</p>
            <div className="flex flex-col gap-2">
              <Link href="/terms" className="hover:text-stone-700">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-stone-700">
                Privacy
              </Link>
              <Link href="/refund" className="hover:text-stone-700">
                Refund
              </Link>
            </div>
          </div>

          <div className="space-y-2 md:justify-self-end">
            <p className="text-sm font-medium text-stone-700">Hookory</p>
            <p>© {new Date().getFullYear()} Hookory. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
