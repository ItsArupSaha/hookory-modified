"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase/client"
import { DataTable } from "@/components/admin/data-table"
import { Button } from "@/components/ui/button"
import { Crown, User, RefreshCw, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserData {
    id: string
    email: string
    displayName: string | null
    plan: "free" | "creator"
    usageCount: number
    usageLimitMonthly: number
    createdAt: string
    lastGenerateAt: string | null
    lemonSqueezyStatus?: string
}

interface UsersResponse {
    users: UserData[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }
}

export default function UsersPage() {
    const router = useRouter()
    const [data, setData] = useState<UsersResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState("")
    const [planFilter, setPlanFilter] = useState<"all" | "free" | "creator">("all")

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true)

            const token = await auth?.currentUser?.getIdToken()
            if (!token) return

            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                ...(search && { search }),
                ...(planFilter !== "all" && { plan: planFilter })
            })

            const response = await fetch(`/api/admin/users?${params}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (response.ok) {
                const result = await response.json()
                setData(result)
            }
        } catch (err) {
            console.error("Failed to fetch users:", err)
        } finally {
            setLoading(false)
        }
    }, [page, search, planFilter])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    // Debounced search
    useEffect(() => {
        const timeout = setTimeout(() => {
            setPage(1) // Reset to first page on search
        }, 300)
        return () => clearTimeout(timeout)
    }, [search])

    const columns = [
        {
            key: "email",
            header: "User",
            render: (user: UserData) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100">
                        <User className="h-4 w-4 text-stone-500" />
                    </div>
                    <div>
                        <p className="font-medium text-stone-900">{user.displayName || "No name"}</p>
                        <p className="text-xs text-stone-500">{user.email}</p>
                    </div>
                </div>
            )
        },
        {
            key: "plan",
            header: "Plan",
            render: (user: UserData) => (
                <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                    user.plan === "creator"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-stone-100 text-stone-600"
                )}>
                    {user.plan === "creator" && <Crown className="h-3 w-3" />}
                    {user.plan === "creator" ? "Creator" : "Free"}
                </span>
            )
        },
        {
            key: "usageCount",
            header: "Usage",
            render: (user: UserData) => (
                <span className="text-sm text-stone-600">
                    {user.usageCount} / {user.usageLimitMonthly}
                </span>
            )
        },
        {
            key: "createdAt",
            header: "Joined",
            render: (user: UserData) => (
                <span className="text-sm text-stone-500">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                </span>
            )
        },
        {
            key: "lastGenerateAt",
            header: "Last Active",
            render: (user: UserData) => (
                <span className="text-sm text-stone-500">
                    {user.lastGenerateAt ? new Date(user.lastGenerateAt).toLocaleDateString() : "Never"}
                </span>
            )
        },
        {
            key: "actions",
            header: "",
            render: (user: UserData) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/admin/users/${user.id}`)
                    }}
                >
                    <ExternalLink className="h-4 w-4" />
                </Button>
            ),
            className: "w-12"
        }
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Users</h1>
                    <p className="text-stone-500">
                        Manage and view all registered users
                    </p>
                </div>
                <Button onClick={fetchUsers} variant="outline" size="sm" disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex-1 max-w-sm">
                    <input
                        type="text"
                        placeholder="Search by email or name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                </div>
                <div className="flex rounded-lg border border-stone-200 bg-white p-1">
                    {(["all", "free", "creator"] as const).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => {
                                setPlanFilter(filter)
                                setPage(1)
                            }}
                            className={cn(
                                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                planFilter === filter
                                    ? "bg-emerald-600 text-white"
                                    : "text-stone-600 hover:bg-stone-100"
                            )}
                        >
                            {filter === "all" ? "All Plans" : filter === "creator" ? "Creator" : "Free"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Summary */}
            {data && (
                <div className="text-sm text-stone-500">
                    Showing {data.users.length} of {data.pagination.total} users
                </div>
            )}

            {/* Data Table */}
            <DataTable
                data={data?.users || []}
                columns={columns}
                isLoading={loading}
                emptyMessage="No users found"
                onRowClick={(user) => router.push(`/admin/users/${user.id}`)}
                pagination={data ? {
                    page: data.pagination.page,
                    totalPages: data.pagination.totalPages,
                    hasNext: data.pagination.hasNext,
                    hasPrev: data.pagination.hasPrev,
                    onPageChange: setPage
                } : undefined}
            />
        </div>
    )
}
