"use client"

import { useEffect, useState, useCallback } from "react"
import { auth } from "@/lib/firebase/client"
import { DataTable } from "@/components/admin/data-table"
import { Button } from "@/components/ui/button"
import { MessageSquare, RefreshCw, User } from "lucide-react"

interface Feedback {
    id: string
    uid: string
    userEmail: string
    message: string
    createdAt: string
}

interface FeedbacksResponse {
    feedbacks: Feedback[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }
}

export default function FeedbacksPage() {
    const [data, setData] = useState<FeedbacksResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState("")

    const fetchFeedbacks = useCallback(async () => {
        try {
            setLoading(true)

            const token = await auth?.currentUser?.getIdToken()
            if (!token) return

            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                ...(search && { search })
            })

            const response = await fetch(`/api/admin/feedbacks?${params}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (response.ok) {
                const result = await response.json()
                setData(result)
            }
        } catch (err) {
            console.error("Failed to fetch feedbacks:", err)
        } finally {
            setLoading(false)
        }
    }, [page, search])

    useEffect(() => {
        fetchFeedbacks()
    }, [fetchFeedbacks])

    const columns = [
        {
            key: "userEmail",
            header: "User",
            render: (feedback: Feedback) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100">
                        <User className="h-4 w-4 text-stone-500" />
                    </div>
                    <span className="text-sm text-stone-700">{feedback.userEmail}</span>
                </div>
            )
        },
        {
            key: "message",
            header: "Feedback",
            render: (feedback: Feedback) => (
                <div className="max-w-xl">
                    <p className="text-sm text-stone-700 line-clamp-3">{feedback.message}</p>
                </div>
            )
        },
        {
            key: "createdAt",
            header: "Date",
            render: (feedback: Feedback) => (
                <span className="text-sm text-stone-500">
                    {feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString() : "N/A"}
                </span>
            ),
            className: "w-32"
        }
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Feedbacks</h1>
                    <p className="text-stone-500">
                        All user feedback submissions
                    </p>
                </div>
                <Button onClick={fetchFeedbacks} variant="outline" size="sm" disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Search */}
            <div className="max-w-sm">
                <input
                    type="text"
                    placeholder="Search feedbacks..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                    }}
                    className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
            </div>

            {/* Stats */}
            {data && (
                <div className="flex items-center gap-2 text-sm text-stone-500">
                    <MessageSquare className="h-4 w-4" />
                    Total feedbacks: {data.pagination.total}
                </div>
            )}

            {/* Data Table */}
            <DataTable
                data={data?.feedbacks || []}
                columns={columns}
                isLoading={loading}
                emptyMessage="No feedbacks yet"
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
