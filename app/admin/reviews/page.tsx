"use client"

import { useEffect, useState, useCallback } from "react"
import { auth } from "@/lib/firebase/client"
import { DataTable } from "@/components/admin/data-table"
import { StatCard } from "@/components/admin/stat-card"
import { Button } from "@/components/ui/button"
import { Star, RefreshCw, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Review {
    id: string
    uid: string
    name: string
    profession: string | null
    stars: number
    review: string
    createdAt: string
}

interface ReviewsResponse {
    reviews: Review[]
    stats: {
        totalCount: number
        averageRating: string
        starDistribution: {
            5: number
            4: number
            3: number
            2: number
            1: number
        }
    }
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }
}

export default function ReviewsPage() {
    const [data, setData] = useState<ReviewsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState("")
    const [minStars, setMinStars] = useState(0)

    const fetchReviews = useCallback(async () => {
        try {
            setLoading(true)

            const token = await auth?.currentUser?.getIdToken()
            if (!token) return

            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                ...(search && { search }),
                ...(minStars > 0 && { minStars: minStars.toString() })
            })

            const response = await fetch(`/api/admin/reviews?${params}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (response.ok) {
                const result = await response.json()
                setData(result)
            }
        } catch (err) {
            console.error("Failed to fetch reviews:", err)
        } finally {
            setLoading(false)
        }
    }, [page, search, minStars])

    useEffect(() => {
        fetchReviews()
    }, [fetchReviews])

    const columns = [
        {
            key: "name",
            header: "Reviewer",
            render: (review: Review) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100">
                        <User className="h-4 w-4 text-stone-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-stone-700">{review.name}</p>
                        {review.profession && (
                            <p className="text-xs text-stone-400">{review.profession}</p>
                        )}
                    </div>
                </div>
            )
        },
        {
            key: "stars",
            header: "Rating",
            render: (review: Review) => (
                <div className="flex items-center gap-1">
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
                    <span className="ml-1 text-sm text-stone-600">{review.stars}</span>
                </div>
            ),
            className: "w-36"
        },
        {
            key: "review",
            header: "Review",
            render: (review: Review) => (
                <p className="text-sm text-stone-700 line-clamp-2 max-w-lg">{review.review}</p>
            )
        },
        {
            key: "createdAt",
            header: "Date",
            render: (review: Review) => (
                <span className="text-sm text-stone-500">
                    {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "N/A"}
                </span>
            ),
            className: "w-28"
        }
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Reviews</h1>
                    <p className="text-stone-500">
                        All user reviews and ratings
                    </p>
                </div>
                <Button onClick={fetchReviews} variant="outline" size="sm" disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            {data && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Reviews"
                        value={data.stats.totalCount}
                        icon={Star}
                    />
                    <StatCard
                        title="Average Rating"
                        value={`${data.stats.averageRating} ⭐`}
                    />
                    <StatCard
                        title="5-Star Reviews"
                        value={data.stats.starDistribution[5]}
                        description={`${Math.round((data.stats.starDistribution[5] / (data.stats.totalCount || 1)) * 100)}% of total`}
                    />
                    <StatCard
                        title="4+ Star Reviews"
                        value={data.stats.starDistribution[5] + data.stats.starDistribution[4]}
                        description={`${Math.round(((data.stats.starDistribution[5] + data.stats.starDistribution[4]) / (data.stats.totalCount || 1)) * 100)}% of total`}
                    />
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex-1 max-w-sm">
                    <input
                        type="text"
                        placeholder="Search reviews..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setPage(1)
                        }}
                        className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                </div>
                <div className="flex rounded-lg border border-stone-200 bg-white p-1">
                    {[0, 3, 4, 5].map((stars) => (
                        <button
                            key={stars}
                            onClick={() => {
                                setMinStars(stars)
                                setPage(1)
                            }}
                            className={cn(
                                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                minStars === stars
                                    ? "bg-emerald-600 text-white"
                                    : "text-stone-600 hover:bg-stone-100"
                            )}
                        >
                            {stars === 0 ? "All" : `${stars}+ ⭐`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Star Distribution */}
            {data && (
                <div className="rounded-xl border border-stone-200 bg-white p-4">
                    <h3 className="text-sm font-medium text-stone-700 mb-3">Rating Distribution</h3>
                    <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = data.stats.starDistribution[star as keyof typeof data.stats.starDistribution]
                            const percentage = data.stats.totalCount > 0
                                ? (count / data.stats.totalCount) * 100
                                : 0

                            return (
                                <div key={star} className="flex items-center gap-3">
                                    <span className="text-sm text-stone-600 w-12">{star} ⭐</span>
                                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-400 rounded-full transition-all"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-sm text-stone-500 w-16 text-right">
                                        {count} ({percentage.toFixed(0)}%)
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Data Table */}
            <DataTable
                data={data?.reviews || []}
                columns={columns}
                isLoading={loading}
                emptyMessage="No reviews yet"
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
