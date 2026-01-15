"use client"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { auth, db } from "@/lib/firebase/client"
import { clearLocalStoragePaymentStatus, cn, getLocalStoragePaymentStatus, setLocalStoragePaymentStatus } from "@/lib/utils"
import { onAuthStateChanged, signOut, User } from "firebase/auth"
import { doc, onSnapshot } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

interface MeResponse {
    plan: "free" | "creator"
    emailVerified: boolean
    usageCount: number
    usageLimitMonthly: number
    usageResetAt: string
    stripeStatus: string | null
}

export function AppShell({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
    const [me, setMe] = useState<MeResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [upgrading, setUpgrading] = useState(false)
    const [portalLoading, setPortalLoading] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)
    const realtimeListenerRef = useRef<(() => void) | null>(null)
    const localStorageTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const refreshUserData = useCallback(async () => {
        if (!auth || !firebaseUser) return
        try {
            // Check localStorage first for immediate payment status (within 1 minute)
            const localStoragePlan = getLocalStoragePaymentStatus()

            const token = await firebaseUser.getIdToken()
            const res = await fetch("/api/me", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            if (!res.ok) {
                throw new Error("Failed to load account data")
            }
            const data = (await res.json()) as MeResponse

            // If localStorage has creator status and it's within 1 minute, override the plan
            if (localStoragePlan === "creator") {
                data.plan = "creator"
                data.usageLimitMonthly = 100
                console.log("[AppShell] Using localStorage payment status (within 1 minute window)")
            }

            console.log("[AppShell] Loaded plan data:", data.plan, "usageLimit:", data.usageLimitMonthly)
            setMe(data)
        } catch (err: any) {
            console.error("[AppShell] Failed to load user data:", err)
            // Don't show toast for non-critical errors - just log
        }
    }, [firebaseUser])

    useEffect(() => {
        if (!auth) return

        let isInitialCheck = true

        // Listen for auth state changes
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // On initial load, give Firebase a moment to restore session from localStorage
                if (isInitialCheck) {
                    isInitialCheck = false
                    await new Promise((resolve) => setTimeout(resolve, 200))

                    // Check again after the delay - Firebase might have restored the session
                    if (!auth) return
                    const currentUser = auth.currentUser
                    if (currentUser) {
                        setFirebaseUser(currentUser)
                        setLoading(false)
                        // Load user data
                        try {
                            // Check localStorage first for immediate payment status
                            const localStoragePlan = getLocalStoragePaymentStatus()

                            const token = await currentUser.getIdToken()
                            const res = await fetch("/api/me", {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            })
                            if (!res.ok) {
                                throw new Error("Failed to load account data")
                            }
                            const data = (await res.json()) as MeResponse

                            // If localStorage has creator status and it's within 1 minute, override the plan
                            if (localStoragePlan === "creator") {
                                data.plan = "creator"
                                data.usageLimitMonthly = 100
                            }

                            setMe(data)
                        } catch (err: any) {
                            console.error(err)
                        }
                        return
                    }
                }

                // No user found - redirect to public landing page
                setFirebaseUser(null)
                setMe(null)
                setLoading(false)
                // Only redirect if we're not already on a public page
                const publicRoutes = ["/login", "/signup", "/terms", "/privacy", "/"]
                if (!publicRoutes.some(route => pathname === route || pathname?.startsWith(route + "/"))) {
                    router.push("/")
                }
                return
            }

            isInitialCheck = false
            setFirebaseUser(user)
            setLoading(false)
            await refreshUserData()
        })

        return () => unsub()
    }, [router, pathname, refreshUserData])

    // Handle successful payment: store in localStorage and set up real-time listener
    useEffect(() => {
        if (typeof window === "undefined" || !firebaseUser || !db) return

        const urlParams = new URLSearchParams(window.location.search)
        const sessionId = urlParams.get("session_id")

        if (sessionId) {
            console.log("[AppShell] Payment successful detected, storing in localStorage")

            // Immediately store payment status in localStorage
            setLocalStoragePaymentStatus("creator")

            // Update UI immediately
            if (me) {
                setMe({
                    ...me,
                    plan: "creator",
                    usageLimitMonthly: 100,
                })
            }

            // Remove session_id from URL
            const url = new URL(window.location.href)
            url.searchParams.delete("session_id")
            window.history.replaceState({}, "", url.toString())

            // Set up Firebase real-time listener after 1 minute
            localStorageTimeoutRef.current = setTimeout(() => {
                console.log("[AppShell] 1 minute passed, setting up Firebase real-time listener")
                clearLocalStoragePaymentStatus()

                // Set up real-time listener for user document
                if (db) {
                    const userDocRef = doc(db, "users", firebaseUser.uid)
                    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
                        if (docSnapshot.exists()) {
                            const userData = docSnapshot.data()
                            const planFromFirebase = userData.plan as "free" | "creator" | undefined
                            const planExpiresAt = userData.planExpiresAt?.toDate?.() || userData.subscriptionPeriodEnd?.toDate?.() || null

                            // Check if plan has expired
                            const now = new Date()
                            const isExpired = planExpiresAt ? planExpiresAt <= now : false
                            const effectivePlan = planFromFirebase === "creator" && !isExpired ? "creator" : "free"

                            // Refresh user data to get latest from API
                            refreshUserData()
                        }
                    }, (error) => {
                        console.error("[AppShell] Firebase real-time listener error:", error)
                    })

                    realtimeListenerRef.current = unsubscribe
                }
            }, 60000) // 1 minute
        }

        return () => {
            if (localStorageTimeoutRef.current) {
                clearTimeout(localStorageTimeoutRef.current)
            }
        }
    }, [pathname, firebaseUser, me, refreshUserData])

    // Clean up real-time listener on unmount
    useEffect(() => {
        return () => {
            if (realtimeListenerRef.current) {
                realtimeListenerRef.current()
                realtimeListenerRef.current = null
            }
        }
    }, [])

    // Load user data once when firebaseUser is available (no unnecessary refreshes)
    useEffect(() => {
        if (firebaseUser && !me) {
            // Only load if we don't have data yet - load once and keep the state
            refreshUserData()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firebaseUser]) // Only depend on firebaseUser - don't re-run when me or refreshUserData changes

    const isActive = (href: string) => pathname?.startsWith(href)

    const usagePercent = me
        ? Math.min(100, (me.usageCount / Math.max(1, me.usageLimitMonthly)) * 100)
        : 0

    async function handleUpgrade() {
        if (!firebaseUser || upgrading) return
        setUpgrading(true)
        try {
            const token = await firebaseUser.getIdToken()
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || "Failed to start checkout")
            }
            if (data.url) {
                // Small delay for smooth transition before redirect
                await new Promise((resolve) => setTimeout(resolve, 300))
                window.location.href = data.url
            }
        } catch (err: any) {
            setUpgrading(false)
            toast({
                title: "Upgrade failed",
                description: err?.message || "Please try again later.",
                variant: "destructive",
            })
        }
    }

    async function handleBillingPortal() {
        if (!firebaseUser || portalLoading) return
        setPortalLoading(true)
        try {
            const token = await firebaseUser.getIdToken()
            const res = await fetch("/api/stripe/portal", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || "Failed to open billing portal")
            }
            if (data.url) {
                // Small delay for smooth transition before redirect
                await new Promise((resolve) => setTimeout(resolve, 300))
                window.location.href = data.url
            }
        } catch (err: any) {
            setPortalLoading(false)
            toast({
                title: "Billing portal error",
                description: err?.message || "Please try again later.",
                variant: "destructive",
            })
        }
    }

    async function handleLogout() {
        if (!auth || loggingOut) return
        setLoggingOut(true)
        // Slightly longer fade-out before redirecting to landing for smoother feel
        await new Promise((resolve) => setTimeout(resolve, 400))
        await signOut(auth)
        // Redirect is handled by the auth state listener, which now sends users to "/"
    }

    const initials =
        (firebaseUser?.email && firebaseUser.email[0]?.toUpperCase()) || "U"
    const [profileOpen, setProfileOpen] = useState(false)

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
                <p className="text-sm text-slate-500">Loading your workspace…</p>
            </div>
        )
    }

    if (!firebaseUser) {
        return null
    }

    return (
        <div
            className={`flex min-h-screen bg-stone-50 text-stone-900 transition-all duration-300 ease-out ${loggingOut ? "opacity-50 scale-[0.99]" : "opacity-100 scale-100"
                }`}
        >
            <div className="fixed inset-0 bg-[url('/nature.jpeg')] bg-cover bg-center opacity-5 pointer-events-none z-0" />

            {/* Sidebar */}
            <aside className="hidden w-64 border-r border-stone-200 bg-white/80 backdrop-blur-xl px-4 py-6 shadow-sm sm:flex sm:flex-col relative z-10 transition-all duration-300">
                <div className="mb-8 px-2">
                    <Link href="/dashboard" className="flex items-center gap-3 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                            <Image
                                src="/hookoryLogo.png"
                                alt="Hookory"
                                width={32}
                                height={32}
                                className="h-8 w-8 object-contain relative z-10"
                            />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-stone-800 group-hover:text-emerald-700 transition-colors">
                            Hookory
                        </span>
                    </Link>
                </div>
                <nav className="flex flex-1 flex-col gap-1.5 text-sm">
                    <Link
                        href="/dashboard"
                        className={cn(
                            "rounded-xl px-3 py-2.5 text-stone-600 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2",
                            isActive("/dashboard") && "bg-emerald-50 text-emerald-700 font-semibold shadow-sm ring-1 ring-emerald-100"
                        )}
                    >
                        New Repurpose
                    </Link>
                    <Link
                        href="/history"
                        className={cn(
                            "rounded-xl px-3 py-2.5 text-stone-600 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2",
                            isActive("/history") && "bg-emerald-50 text-emerald-700 font-semibold shadow-sm ring-1 ring-emerald-100"
                        )}
                    >
                        History
                        {(!me || me.plan === "free") && (
                            <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                Pro
                            </span>
                        )}
                    </Link>
                    <Link
                        href="/usage"
                        className={cn(
                            "rounded-xl px-3 py-2.5 text-stone-600 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2",
                            isActive("/usage") && "bg-emerald-50 text-emerald-700 font-semibold shadow-sm ring-1 ring-emerald-100"
                        )}
                    >
                        Usage
                    </Link>
                    <Link
                        href="/settings"
                        className={cn(
                            "rounded-xl px-3 py-2.5 text-stone-600 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2",
                            isActive("/settings") && "bg-emerald-50 text-emerald-700 font-semibold shadow-sm ring-1 ring-emerald-100"
                        )}
                    >
                        Settings
                    </Link>
                </nav>
                {me && (
                    <div className="mt-auto px-2 pb-2">
                        <div className="rounded-2xl border border-stone-100 bg-white/50 p-4 shadow-sm backdrop-blur-sm">
                            <div className="flex items-center justify-between text-xs font-medium text-stone-600 mb-2">
                                <span>Monthly Usage</span>
                                <span className={usagePercent > 90 ? "text-red-500" : "text-emerald-600"}>
                                    {me.usageCount}/{me.usageLimitMonthly}
                                </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        usagePercent > 90 ? "bg-red-500" : "bg-emerald-500"
                                    )}
                                    style={{ width: `${usagePercent}%` }}
                                />
                            </div>
                            {me.plan === "free" && (
                                <Button
                                    size="sm"
                                    className="mt-3 w-full rounded-full bg-stone-900 text-xs text-white hover:bg-stone-800 h-8"
                                    onClick={handleUpgrade}
                                >
                                    Upgrade Plan
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </aside>

            {/* Main */}
            <div className="flex min-h-screen flex-1 flex-col relative z-10">
                <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white/80 px-6 py-4 backdrop-blur-xl transition-all">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/50 px-3 py-1 text-xs font-medium text-stone-600 shadow-sm">
                            Current Plan:
                            <span className={cn(
                                "rounded-full px-2 py-0.5 text-white",
                                me?.plan === "creator" ? "bg-emerald-500" : "bg-stone-500"
                            )}>
                                {me ? (me.plan === "creator" ? "Creator" : "Free") : "..."}
                            </span>
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        {!me ? (
                            // Show nothing while loading to avoid flickering
                            <div className="min-w-[100px] h-8" />
                        ) : me.plan === "creator" ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="min-w-[120px] rounded-full border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all"
                                onClick={handleBillingPortal}
                                disabled={portalLoading}
                            >
                                {portalLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Opening...</span>
                                    </span>
                                ) : (
                                    "Manage billing"
                                )}
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                className="min-w-[100px] rounded-full bg-emerald-600 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 hover:scale-105 active:scale-95"
                                onClick={handleUpgrade}
                                disabled={upgrading}
                            >
                                {upgrading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Redirecting...</span>
                                    </span>
                                ) : (
                                    "Upgrade"
                                )}
                            </Button>
                        )}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setProfileOpen((open) => !open)}
                                className="flex items-center justify-center rounded-full border border-stone-200 bg-white p-1 hover:bg-stone-50 hover:shadow-md transition-all"
                            >
                                <span className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-inner",
                                    me?.plan === "creator" ? "bg-emerald-600" : "bg-stone-600"
                                )}>
                                    {initials}
                                </span>
                            </button>
                            {profileOpen && (
                                <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-stone-100 bg-white p-2 shadow-xl ring-1 ring-stone-900/5 backdrop-blur-xl">
                                    <div className="px-3 pb-2 pt-2 text-xs">
                                        <p className="font-semibold text-stone-900">
                                            Account
                                        </p>
                                        <p className="truncate text-stone-500 mt-0.5">
                                            {firebaseUser.email ?? "Unknown email"}
                                        </p>
                                    </div>
                                    <div className="my-1 h-px bg-stone-100" />
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="flex w-full items-center rounded-xl px-3 py-2 text-left text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                                    >
                                        <span>Log out</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Email verification banner */}
                {me && !me.emailVerified && (
                    <div className="border-b border-amber-200 bg-amber-50/80 px-6 py-2.5 text-xs font-medium text-amber-800 backdrop-blur-sm">
                        <div className="mx-auto max-w-5xl flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <p>
                                Verify your email to generate content. Check your inbox for a
                                verification link.
                            </p>
                        </div>
                    </div>
                )}

                <main className="flex-1 px-4 py-8 sm:px-8">
                    <div className="mx-auto max-w-6xl">{children}</div>
                </main>
            </div>
        </div>
    )
}

