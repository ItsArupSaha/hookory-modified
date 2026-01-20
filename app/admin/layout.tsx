"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase/client"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Loader2, ShieldAlert } from "lucide-react"

/**
 * Admin Layout
 * 
 * STRICT SECURITY:
 * This layout verifies admin access on the client side.
 * Even if someone bypasses this, all API routes have server-side verification.
 * This is defense in depth.
 */
export default function AdminLayout({
    children
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const [authState, setAuthState] = useState<"loading" | "authorized" | "unauthorized">("loading")
    const [userEmail, setUserEmail] = useState<string | null>(null)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth!, async (user) => {
            if (!user) {
                // Not logged in
                setAuthState("unauthorized")
                return
            }

            setUserEmail(user.email)

            // Verify admin access by calling an admin endpoint
            try {
                const token = await user.getIdToken()
                const response = await fetch("/api/admin/stats", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                })

                if (response.status === 403) {
                    // Not an admin
                    console.warn("[Admin] Access denied for:", user.email)
                    setAuthState("unauthorized")
                } else if (response.ok) {
                    // Admin verified
                    setAuthState("authorized")
                } else {
                    // Other error
                    setAuthState("unauthorized")
                }
            } catch (error) {
                console.error("[Admin] Auth check failed:", error)
                setAuthState("unauthorized")
            }
        })

        return () => unsubscribe()
    }, [])

    // Loading state
    if (authState === "loading") {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-stone-50">
                <div className="text-center">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-600" />
                    <p className="mt-4 text-stone-600">Verifying admin access...</p>
                </div>
            </div>
        )
    }

    // Unauthorized state
    if (authState === "unauthorized") {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-stone-50">
                <div className="max-w-md text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <ShieldAlert className="h-8 w-8 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-stone-900">Access Denied</h1>
                    <p className="mt-2 text-stone-600">
                        You do not have permission to access the admin panel.
                        {userEmail && (
                            <span className="block mt-1 text-sm text-stone-500">
                                Logged in as: {userEmail}
                            </span>
                        )}
                    </p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="mt-6 inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    // Authorized - render admin dashboard
    return (
        <div className="min-h-screen bg-stone-50">
            <AdminSidebar />
            <main className="ml-64 min-h-screen">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
