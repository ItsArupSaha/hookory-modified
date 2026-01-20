"use client"

import { useEffect, useState, useCallback } from "react"
import { auth } from "@/lib/firebase/client"
import { StatCard } from "@/components/admin/stat-card"
import { TimelineSelector } from "@/components/admin/timeline-selector"
import {
    ChartContainer,
    AnalyticsLineChart,
    AnalyticsBarChart
} from "@/components/admin/analytics-chart"
import {
    Users,
    TrendingUp,
    BarChart3,
    RefreshCw,
    ArrowUpRight
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface AnalyticsData {
    period: number
    startDate: string
    endDate: string
    dailyData: {
        date: string
        signups: number
        generations: number
        activeUsers: number
        upgrades: number
    }[]
    totals: {
        signups: number
        generations: number
        activeUsers: number
        upgrades: number
    }
    userGrowth: {
        date: string
        totalUsers: number
    }[]
    funnel: {
        totalUsers: number
        creators: number
        conversionRate: string
    }
}

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState(7)

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true)

            const token = await auth?.currentUser?.getIdToken()
            if (!token) return

            const response = await fetch(`/api/admin/analytics?period=${period}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setAnalytics(data)
            }
        } catch (err) {
            console.error("Failed to fetch analytics:", err)
        } finally {
            setLoading(false)
        }
    }, [period])

    useEffect(() => {
        fetchAnalytics()
    }, [fetchAnalytics])

    // Format chart data
    const signupsData = analytics?.dailyData.map(d => ({
        name: d.date.slice(5), // MM-DD format
        signups: d.signups
    })) || []

    const generationsData = analytics?.dailyData.map(d => ({
        name: d.date.slice(5),
        generations: d.generations
    })) || []

    const userGrowthData = analytics?.userGrowth.map(d => ({
        name: d.date.slice(5),
        users: d.totalUsers
    })) || []

    const activeUsersData = analytics?.dailyData.map(d => ({
        name: d.date.slice(5),
        activeUsers: d.activeUsers
    })) || []

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Analytics</h1>
                    <p className="text-stone-500">
                        User activity and growth analytics from Firebase data
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <TimelineSelector
                        periods={[7, 15, 30, 60, 90]}
                        selected={period}
                        onChange={setPeriod}
                    />
                    <Button
                        onClick={fetchAnalytics}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Period Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="New Signups"
                    value={analytics?.totals.signups || 0}
                    description={`Last ${period} days`}
                    icon={Users}
                />
                <StatCard
                    title="Active Users"
                    value={analytics?.totals.activeUsers || 0}
                    description={`Last ${period} days`}
                    icon={TrendingUp}
                />
                <StatCard
                    title="Generations"
                    value={analytics?.totals.generations || 0}
                    description={`Jobs created in last ${period} days`}
                    icon={BarChart3}
                />
                <StatCard
                    title="Upgrades"
                    value={analytics?.totals.upgrades || 0}
                    description={`New creators in last ${period} days`}
                    icon={ArrowUpRight}
                />
            </div>

            {/* Conversion Funnel */}
            <ChartContainer
                title="Conversion Overview"
                description="Overall user to creator conversion"
            >
                <div className="flex items-center justify-around py-8">
                    <div className="text-center">
                        <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                            <Users className="h-10 w-10 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-stone-900">{analytics?.funnel.totalUsers || 0}</p>
                        <p className="text-sm text-stone-500">Total Users</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <ArrowUpRight className="h-8 w-8 text-stone-300 rotate-45" />
                        <span className="text-sm font-medium text-emerald-600">
                            {analytics?.funnel.conversionRate || 0}%
                        </span>
                    </div>
                    <div className="text-center">
                        <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                            <TrendingUp className="h-10 w-10 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-bold text-stone-900">{analytics?.funnel.creators || 0}</p>
                        <p className="text-sm text-stone-500">Creator Users</p>
                    </div>
                </div>
            </ChartContainer>

            {/* Charts Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* User Growth Chart */}
                <ChartContainer
                    title="User Growth"
                    description="Cumulative user count over time"
                >
                    {loading ? (
                        <div className="flex h-[300px] items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
                        </div>
                    ) : (
                        <AnalyticsLineChart
                            data={userGrowthData}
                            dataKey="users"
                            color="#8b5cf6"
                            height={300}
                        />
                    )}
                </ChartContainer>

                {/* Signups Chart */}
                <ChartContainer
                    title="Daily Signups"
                    description={`New user registrations over the last ${period} days`}
                >
                    {loading ? (
                        <div className="flex h-[300px] items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
                        </div>
                    ) : (
                        <AnalyticsBarChart
                            data={signupsData}
                            dataKey="signups"
                            color="#10b981"
                            height={300}
                        />
                    )}
                </ChartContainer>

                {/* Active Users Chart */}
                <ChartContainer
                    title="Daily Active Users"
                    description={`Users who generated content each day`}
                >
                    {loading ? (
                        <div className="flex h-[300px] items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
                        </div>
                    ) : (
                        <AnalyticsBarChart
                            data={activeUsersData}
                            dataKey="activeUsers"
                            color="#3b82f6"
                            height={300}
                        />
                    )}
                </ChartContainer>

                {/* Generations Chart */}
                <ChartContainer
                    title="Daily Generations"
                    description={`Saved generation jobs over the last ${period} days`}
                >
                    {loading ? (
                        <div className="flex h-[300px] items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
                        </div>
                    ) : (
                        <AnalyticsBarChart
                            data={generationsData}
                            dataKey="generations"
                            color="#f59e0b"
                            height={300}
                        />
                    )}
                </ChartContainer>
            </div>
        </div>
    )
}
