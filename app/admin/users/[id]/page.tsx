"use client"

import { useEffect, useState, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    ArrowLeft,
    Crown,
    User,
    Mail,
    Calendar,
    Clock,
    BarChart3,
    MessageSquare,
    Star,
    FileText,
    RefreshCw,
    Activity
} from "lucide-react"

interface UserDetail {
    user: {
        id: string
        email: string
        displayName: string | null
        plan: "free" | "creator"
        emailVerified: boolean
        usageCount: number
        usageLimitMonthly: number
        createdAt: string
        updatedAt: string
        lastGenerateAt: string | null
        usageResetAt: string
        lemonSqueezyCustomerId?: string
        lemonSqueezySubscriptionId?: string
        lemonSqueezyStatus?: string
        subscriptionPeriodEnd?: string
        welcomeEmailSent?: boolean
    }
    jobs: Array<{
        id: string
        inputText: string
        formatsSelected: string[]
        createdAt: string
    }>
    feedbacks: Array<{
        id: string
        message: string
        createdAt: string
    }>
    review: {
        id: string
        name: string
        stars: number
        review: string
        createdAt: string
    } | null
    events: Array<{
        id: string
        type: string
        timestamp: string
        metadata: any
    }>
    stats: {
        totalJobs: number
        totalFeedbacks: number
        hasReview: boolean
    }
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData] = useState<UserDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<"overview" | "activity" | "jobs" | "feedbacks">("overview")

    const fetchUser = useCallback(async () => {
        try {
            setLoading(true)

            const token = await auth?.currentUser?.getIdToken()
            if (!token) return

            const response = await fetch(`/api/admin/users/${id}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (response.ok) {
                const result = await response.json()
                setData(result)
            }
        } catch (err) {
            console.error("Failed to fetch user:", err)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        fetchUser()
    }, [fetchUser])

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="text-center py-12">
                <p className="text-stone-500">User not found</p>
                <Button onClick={() => router.back()} className="mt-4">
                    Go Back
                </Button>
            </div>
        )
    }

    const { user, jobs, feedbacks, review, events, stats } = data

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>

            {/* User Profile Card */}
            <div className="rounded-xl border border-stone-200 bg-white p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
                            <User className="h-8 w-8 text-stone-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-stone-900">
                                {user.displayName || "No name"}
                            </h1>
                            <p className="flex items-center gap-2 text-stone-500">
                                <Mail className="h-4 w-4" />
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
                        user.plan === "creator"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-stone-100 text-stone-600"
                    )}>
                        {user.plan === "creator" && <Crown className="h-4 w-4" />}
                        {user.plan === "creator" ? "Creator Plan" : "Free Plan"}
                    </span>
                </div>

                {/* Quick Stats */}
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg bg-stone-50 p-4">
                        <p className="text-sm font-medium text-stone-500">Usage This Month</p>
                        <p className="text-xl font-bold text-stone-900">
                            {user.usageCount} / {user.usageLimitMonthly}
                        </p>
                    </div>
                    <div className="rounded-lg bg-stone-50 p-4">
                        <p className="text-sm font-medium text-stone-500">Total Jobs</p>
                        <p className="text-xl font-bold text-stone-900">{stats.totalJobs}</p>
                    </div>
                    <div className="rounded-lg bg-stone-50 p-4">
                        <p className="text-sm font-medium text-stone-500">Feedbacks</p>
                        <p className="text-xl font-bold text-stone-900">{stats.totalFeedbacks}</p>
                    </div>
                    <div className="rounded-lg bg-stone-50 p-4">
                        <p className="text-sm font-medium text-stone-500">Joined</p>
                        <p className="text-xl font-bold text-stone-900">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                        </p>
                    </div>
                </div>

                {/* Subscription Info */}
                {user.plan === "creator" && user.lemonSqueezyStatus && (
                    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm font-medium text-emerald-800">Subscription Details</p>
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-emerald-700">
                            <div>Status: <span className="font-medium">{user.lemonSqueezyStatus}</span></div>
                            <div>Ends: <span className="font-medium">
                                {user.subscriptionPeriodEnd
                                    ? new Date(user.subscriptionPeriodEnd).toLocaleDateString()
                                    : "N/A"}
                            </span></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-stone-200">
                {(["overview", "activity", "jobs", "feedbacks"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                            activeTab === tab
                                ? "border-emerald-600 text-emerald-600"
                                : "border-transparent text-stone-500 hover:text-stone-700"
                        )}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="rounded-xl border border-stone-200 bg-white p-6">
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-stone-900">Account Details</h3>
                        <dl className="grid grid-cols-2 gap-4">
                            <div>
                                <dt className="text-sm font-medium text-stone-500">User ID</dt>
                                <dd className="mt-1 text-sm text-stone-900 font-mono">{user.id}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-stone-500">Last Active</dt>
                                <dd className="mt-1 text-sm text-stone-900">
                                    {user.lastGenerateAt
                                        ? new Date(user.lastGenerateAt).toLocaleString()
                                        : "Never generated"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-stone-500">Usage Resets</dt>
                                <dd className="mt-1 text-sm text-stone-900">
                                    {user.usageResetAt ? new Date(user.usageResetAt).toLocaleDateString() : "N/A"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-stone-500">Welcome Email</dt>
                                <dd className="mt-1 text-sm text-stone-900">
                                    {user.welcomeEmailSent ? "Sent" : "Not sent"}
                                </dd>
                            </div>
                        </dl>

                        {/* Review */}
                        {review && (
                            <div className="mt-6">
                                <h4 className="text-lg font-semibold text-stone-900 mb-3">User Review</h4>
                                <div className="rounded-lg border border-stone-200 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star
                                                key={i}
                                                className={cn(
                                                    "h-4 w-4",
                                                    i < review.stars
                                                        ? "text-amber-400 fill-amber-400"
                                                        : "text-stone-200"
                                                )}
                                            />
                                        ))}
                                        <span className="text-sm font-medium text-stone-600">{review.stars}</span>
                                    </div>
                                    <p className="text-stone-700">{review.review}</p>
                                    <p className="mt-2 text-xs text-stone-400">
                                        {new Date(review.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "activity" && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-stone-900">Activity Timeline</h3>
                        {events.length === 0 ? (
                            <p className="text-stone-500">No activity recorded</p>
                        ) : (
                            <div className="space-y-3">
                                {events.map((event) => (
                                    <div key={event.id} className="flex items-start gap-3 rounded-lg border border-stone-100 p-3">
                                        <Activity className="h-5 w-5 text-stone-400 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-stone-700">
                                                {event.type.replace(/_/g, ' ').toUpperCase()}
                                            </p>
                                            <p className="text-xs text-stone-400">
                                                {event.timestamp ? new Date(event.timestamp).toLocaleString() : "N/A"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "jobs" && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-stone-900">Generation History</h3>
                        {jobs.length === 0 ? (
                            <p className="text-stone-500">No generations yet</p>
                        ) : (
                            <div className="space-y-3">
                                {jobs.map((job) => (
                                    <div key={job.id} className="rounded-lg border border-stone-100 p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm text-stone-700 line-clamp-2">
                                                    {job.inputText}
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {job.formatsSelected?.map((format) => (
                                                        <span
                                                            key={format}
                                                            className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded"
                                                        >
                                                            {format}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <span className="text-xs text-stone-400 ml-4">
                                                {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "feedbacks" && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-stone-900">Feedbacks</h3>
                        {feedbacks.length === 0 ? (
                            <p className="text-stone-500">No feedbacks submitted</p>
                        ) : (
                            <div className="space-y-3">
                                {feedbacks.map((feedback) => (
                                    <div key={feedback.id} className="rounded-lg border border-stone-100 p-4">
                                        <p className="text-sm text-stone-700">{feedback.message}</p>
                                        <p className="mt-2 text-xs text-stone-400">
                                            {feedback.createdAt ? new Date(feedback.createdAt).toLocaleString() : "N/A"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
