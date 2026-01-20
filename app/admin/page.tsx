"use client"

import { useEffect, useState, useCallback } from "react"
import { auth } from "@/lib/firebase/client"
import { StatCard } from "@/components/admin/stat-card"
import { ChartContainer, AnalyticsPieChart } from "@/components/admin/analytics-chart"
import {
    Users,
    Crown,
    BarChart3,
    MessageSquare,
    Star,
    FileText,
    TrendingUp,
    RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface DashboardStats {
    overview: {
        totalUsers: number
        creatorUsers: number
        freeUsers: number
        conversionRate: string
        totalGenerations: number
        totalFeedbacks: number
        totalReviews: number
        averageRating: string
        totalJobs: number
    }
    recentActivity: {
        newUsersLast7Days: number
        newUsersLast30Days: number
        activeUsersLast7Days: number
    }
    timestamp: string
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const token = await auth?.currentUser?.getIdToken()
            if (!token) {
                setError("Not authenticated")
                return
            }

            const response = await fetch("/api/admin/stats", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!response.ok) {
                throw new Error("Failed to fetch stats")
            }

            const data = await response.json()
            setStats(data)
            setLastRefresh(new Date())
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    if (loading && !stats) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            </div>
        )
    }

    if (error && !stats) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600">{error}</p>
                    <Button onClick={fetchStats} className="mt-4">
                        Retry
                    </Button>
                </div>
            </div>
        )
    }

    const planDistribution = [
        { name: "Free", value: stats?.overview.freeUsers || 0, color: "#94a3b8" },
        { name: "Creator", value: stats?.overview.creatorUsers || 0, color: "#10b981" }
    ]

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Dashboard Overview</h1>
                    <p className="text-stone-500">
                        Welcome to the admin panel. Here's what's happening with Hookory.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {lastRefresh && (
                        <span className="text-sm text-stone-400">
                            Last updated: {lastRefresh.toLocaleTimeString()}
                        </span>
                    )}
                    <Button
                        onClick={fetchStats}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Users"
                    value={stats?.overview.totalUsers || 0}
                    description={`+${stats?.recentActivity.newUsersLast7Days || 0} in last 7 days`}
                    icon={Users}
                />
                <StatCard
                    title="Creator Users"
                    value={stats?.overview.creatorUsers || 0}
                    description={`${stats?.overview.conversionRate} conversion rate`}
                    icon={Crown}
                />
                <StatCard
                    title="Total Generations"
                    value={stats?.overview.totalGenerations || 0}
                    description="All-time usage count"
                    icon={BarChart3}
                />
                <StatCard
                    title="Active Users (7d)"
                    value={stats?.recentActivity.activeUsersLast7Days || 0}
                    description="Users who generated content"
                    icon={TrendingUp}
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="New Users (30d)"
                    value={stats?.recentActivity.newUsersLast30Days || 0}
                    description="Signups in last 30 days"
                    icon={Users}
                />
                <StatCard
                    title="Feedbacks"
                    value={stats?.overview.totalFeedbacks || 0}
                    description="User feedback received"
                    icon={MessageSquare}
                />
                <StatCard
                    title="Reviews"
                    value={stats?.overview.totalReviews || 0}
                    description={`${stats?.overview.averageRating || 0} avg rating`}
                    icon={Star}
                />
                <StatCard
                    title="Saved Jobs"
                    value={stats?.overview.totalJobs || 0}
                    description="Generation history entries"
                    icon={FileText}
                />
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Plan Distribution */}
                <ChartContainer
                    title="User Plan Distribution"
                    description="Breakdown of free vs creator users"
                >
                    <AnalyticsPieChart data={planDistribution} height={280} />
                </ChartContainer>

                {/* Quick Stats */}
                <ChartContainer
                    title="Quick Stats"
                    description="Key metrics at a glance"
                >
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="rounded-lg bg-emerald-50 p-4">
                            <p className="text-sm font-medium text-emerald-700">Conversion Rate</p>
                            <p className="text-2xl font-bold text-emerald-900">
                                {stats?.overview.conversionRate || "0%"}
                            </p>
                        </div>
                        <div className="rounded-lg bg-blue-50 p-4">
                            <p className="text-sm font-medium text-blue-700">Avg Rating</p>
                            <p className="text-2xl font-bold text-blue-900">
                                {stats?.overview.averageRating || "0"} ⭐
                            </p>
                        </div>
                        <div className="rounded-lg bg-purple-50 p-4">
                            <p className="text-sm font-medium text-purple-700">New Users (30d)</p>
                            <p className="text-2xl font-bold text-purple-900">
                                {stats?.recentActivity.newUsersLast30Days || 0}
                            </p>
                        </div>
                        <div className="rounded-lg bg-orange-50 p-4">
                            <p className="text-sm font-medium text-orange-700">Free Users</p>
                            <p className="text-2xl font-bold text-orange-900">
                                {stats?.overview.freeUsers || 0}
                            </p>
                        </div>
                    </div>
                </ChartContainer>
            </div>

            {/* Timestamp */}
            <p className="text-center text-xs text-stone-400">
                Data as of {stats?.timestamp ? new Date(stats.timestamp).toLocaleString() : "N/A"}
            </p>
        </div>
    )
}
