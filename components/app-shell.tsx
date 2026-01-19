"use client"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { FeedbackDialog } from "@/components/feedback-dialog"
import { ReviewDialog } from "@/components/review-dialog"
import { auth, db } from "@/lib/firebase/client"
import { clearLocalStoragePaymentStatus, cn, getLocalStoragePaymentStatus, setLocalStoragePaymentStatus } from "@/lib/utils"
import { onAuthStateChanged, signOut, User } from "firebase/auth"
import { doc, onSnapshot } from "firebase/firestore"
import { Loader2, MessageSquare, Star } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import { createContext, useContext } from "react"

interface MeResponse {
    plan: "free" | "creator"
    emailVerified: boolean
    usageCount: number
    usageLimitMonthly: number
    usageResetAt: string
    lemonSqueezyStatus: string | null
}

interface AppShellContextType {
    refreshUserData: () => Promise<void>
    me: MeResponse | null
    loading: boolean
}

const AppShellContext = createContext<AppShellContextType | undefined>(undefined)

export function useAppShell() {
    const context = useContext(AppShellContext)
    if (!context) {
        throw new Error("useAppShell must be used within an AppShell")
    }
    return context
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
                const publicRoutes = ["/login", "/signup", "/terms", "/privacy", "/refund", "/"]
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

    // State for payment processing spinner
    const [isProcessingPayment, setIsProcessingPayment] = useState(false)
    const syncCalledRef = useRef(false) // Ensure only ONE sync call ever

    // STEP 1: Detect payment success on mount - immediately start spinner
    useEffect(() => {
        if (typeof window === "undefined") return

        const urlParams = new URLSearchParams(window.location.search)
        const sessionId = urlParams.get("session_id")

        if (sessionId) {
            console.log("[AppShell] Payment successful! session_id detected in URL")

            // Store payment status in localStorage (2 minute window)
            setLocalStoragePaymentStatus("creator")

            // Show spinner immediately
            setIsProcessingPayment(true)

            // Clean URL
            const url = new URL(window.location.href)
            url.searchParams.delete("session_id")
            window.history.replaceState({}, "", url.toString())

            console.log("[AppShell] Spinner activated. Will make ONE sync call when auth is ready.")
        } else {
            // Check if paymentStatus exists in localStorage (handles page refresh)
            const storedPlan = getLocalStoragePaymentStatus()
            if (storedPlan === "creator") {
                console.log("[AppShell] Found paymentStatus in localStorage - resuming spinner")
                setIsProcessingPayment(true)
            }
        }
    }, []) // Runs once on mount

    // STEP 2: Make ONE sync call when auth is ready
    useEffect(() => {
        // Only run when in processing mode AND auth is ready
        if (!isProcessingPayment || !firebaseUser || !db) return

        // CRITICAL: Ensure only ONE sync call ever happens
        if (syncCalledRef.current) {
            console.log("[AppShell] Sync already called, skipping")
            return
        }
        syncCalledRef.current = true

        // Verify paymentStatus is still valid
        const storedPlan = getLocalStoragePaymentStatus()
        if (storedPlan !== "creator") {
            console.log("[AppShell] paymentStatus expired, stopping")
            setIsProcessingPayment(false)
            syncCalledRef.current = false
            return
        }

        // Update me state for immediate UI feedback
        if (me && me.plan !== "creator") {
            setMe({ ...me, plan: "creator", usageLimitMonthly: 100 })
        }

        console.log("[AppShell] Auth ready. Making ONE sync call...")

        const doSync = async () => {
            try {
                const token = await firebaseUser.getIdToken()
                console.log("[AppShell] Calling sync endpoint (ONE time only)...")

                const syncRes = await fetch("/api/lemonsqueezy/sync", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` }
                })

                if (syncRes.ok) {
                    const syncData = await syncRes.json()
                    console.log("[AppShell] Sync response:", syncData)

                    if (syncData.complete === true) {
                        console.log("[AppShell] SUCCESS! Email sent and Firestore updated.")
                    } else {
                        console.log("[AppShell] Sync returned but not complete:", syncData)
                    }
                } else {
                    console.error("[AppShell] Sync request failed:", syncRes.status)
                }
            } catch (e) {
                console.error("[AppShell] Sync call failed:", e)
            } finally {
                // Always stop spinner and clean up after the ONE call
                setIsProcessingPayment(false)
                clearLocalStoragePaymentStatus()
                refreshUserData()
                console.log("[AppShell] Spinner stopped.")
            }
        }

        doSync()
    }, [isProcessingPayment, firebaseUser, db, me, refreshUserData])

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
            const res = await fetch("/api/lemonsqueezy/checkout", {
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
            const res = await fetch("/api/lemonsqueezy/portal", {
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
        <AppShellContext.Provider value={{ refreshUserData, me, loading }}>
            <div
                className={`flex min-h-screen bg-stone-50 text-stone-900 transition-all duration-300 ease-out ${loggingOut ? "opacity-50 scale-[0.99]" : "opacity-100 scale-100"
                    }`}
            >
                <div className="fixed inset-0 bg-[url('/nature.jpeg')] bg-cover bg-center opacity-5 pointer-events-none z-0" />

                {/* Sidebar */}
                <aside className="hidden w-64 border-r border-stone-200 bg-white/80 backdrop-blur-xl px-4 py-6 shadow-sm sm:flex sm:flex-col relative z-10 transition-all duration-300">
                    <div className="mb-8 px-2">
                        <Link href="/dashboard" className="flex items-center group">
                            <Image
                                src="/hookory_Logo_light_nobg.png"
                                alt="Hookory"
                                width={160}
                                height={160}
                                className="h-40 w-40 -my-16 -ml-10 object-contain relative z-10"
                            />
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

                        <div className="mt-1 pt-1 border-t border-stone-100 flex flex-col gap-1.5">
                            <FeedbackDialog>
                                <button className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-stone-600 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 text-left">
                                    <MessageSquare className="h-4 w-4" />
                                    Feedback
                                </button>
                            </FeedbackDialog>

                            <ReviewDialog>
                                <button className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-stone-600 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 text-left">
                                    <Star className="h-4 w-4" />
                                    Review
                                </button>
                            </ReviewDialog>
                        </div>
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
                            {/* Payment Processing Spinner */}
                            {isProcessingPayment && (
                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm animate-pulse">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Setting up your creator plan...
                                </span>
                            )}
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


                    <main className="flex-1 px-4 py-8 sm:px-8">
                        <div className="mx-auto max-w-6xl">{children}</div>
                    </main>
                </div>
            </div >
        </AppShellContext.Provider >
    )
}

