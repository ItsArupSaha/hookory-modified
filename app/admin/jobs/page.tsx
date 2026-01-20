"use client"

import { useEffect, useState, useCallback } from "react"
import { auth } from "@/lib/firebase/client"
import { DataTable } from "@/components/admin/data-table"
import { Button } from "@/components/ui/button"
import { FileText, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface Job {
    id: string
    userId: string
    inputText: string
    formatsSelected: string[]
    createdAt: string
}

interface JobsResponse {
    jobs: Job[]
    filters: {
        availableFormats: string[]
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

export default function JobsPage() {
    const [data, setData] = useState<JobsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
    const [expandedJob, setExpandedJob] = useState<string | null>(null)

    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true)

            const token = await auth?.currentUser?.getIdToken()
            if (!token) return

            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                ...(selectedFormat && { format: selectedFormat })
            })

            const response = await fetch(`/api/admin/jobs?${params}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (response.ok) {
                const result = await response.json()
                setData(result)
            }
        } catch (err) {
            console.error("Failed to fetch jobs:", err)
        } finally {
            setLoading(false)
        }
    }, [page, selectedFormat])

    useEffect(() => {
        fetchJobs()
    }, [fetchJobs])

    const columns = [
        {
            key: "inputText",
            header: "Input",
            render: (job: Job) => (
                <div className="max-w-md">
                    <p className="text-sm text-stone-700 line-clamp-2">{job.inputText}</p>
                    {job.inputText && job.inputText.length > 200 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setExpandedJob(expandedJob === job.id ? null : job.id)
                            }}
                            className="text-xs text-emerald-600 hover:text-emerald-700 mt-1"
                        >
                            {expandedJob === job.id ? "Show less" : "Show more"}
                        </button>
                    )}
                </div>
            )
        },
        {
            key: "formatsSelected",
            header: "Formats",
            render: (job: Job) => (
                <div className="flex flex-wrap gap-1">
                    {job.formatsSelected?.map((format) => (
                        <span
                            key={format}
                            className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded"
                        >
                            {format}
                        </span>
                    ))}
                </div>
            ),
            className: "w-48"
        },
        {
            key: "userId",
            header: "User ID",
            render: (job: Job) => (
                <span className="text-xs text-stone-500 font-mono">{job.userId?.slice(0, 12)}...</span>
            ),
            className: "w-32"
        },
        {
            key: "createdAt",
            header: "Date",
            render: (job: Job) => (
                <span className="text-sm text-stone-500">
                    {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "N/A"}
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
                    <h1 className="text-3xl font-bold text-stone-900">Generation History</h1>
                    <p className="text-stone-500">
                        All content generation jobs
                    </p>
                </div>
                <Button onClick={fetchJobs} variant="outline" size="sm" disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            {data && (
                <div className="flex items-center gap-2 text-sm text-stone-500">
                    <FileText className="h-4 w-4" />
                    Total jobs: {data.pagination.total}
                </div>
            )}

            {/* Format Filter */}
            {data && data.filters.availableFormats.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-stone-500">Filter by format:</span>
                    <button
                        onClick={() => {
                            setSelectedFormat(null)
                            setPage(1)
                        }}
                        className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                            selectedFormat === null
                                ? "bg-emerald-600 text-white"
                                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        )}
                    >
                        All
                    </button>
                    {data.filters.availableFormats.map((format) => (
                        <button
                            key={format}
                            onClick={() => {
                                setSelectedFormat(format)
                                setPage(1)
                            }}
                            className={cn(
                                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                                selectedFormat === format
                                    ? "bg-emerald-600 text-white"
                                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                            )}
                        >
                            {format}
                        </button>
                    ))}
                </div>
            )}

            {/* Data Table */}
            <DataTable
                data={data?.jobs || []}
                columns={columns}
                isLoading={loading}
                emptyMessage="No generation jobs yet"
                pagination={data ? {
                    page: data.pagination.page,
                    totalPages: data.pagination.totalPages,
                    hasNext: data.pagination.hasNext,
                    hasPrev: data.pagination.hasPrev,
                    onPageChange: setPage
                } : undefined}
            />

            {/* Expanded Job View */}
            {expandedJob && data?.jobs.find(j => j.id === expandedJob) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-w-2xl max-h-[80vh] overflow-auto bg-white rounded-xl p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-stone-900 mb-4">Full Input</h3>
                        <p className="text-sm text-stone-700 whitespace-pre-wrap">
                            {data.jobs.find(j => j.id === expandedJob)?.inputText}
                        </p>
                        <Button
                            onClick={() => setExpandedJob(null)}
                            className="mt-4"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
