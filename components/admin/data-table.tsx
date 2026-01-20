"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Column<T> {
    key: string
    header: string
    render?: (item: T) => React.ReactNode
    className?: string
}

interface DataTableProps<T> {
    data: T[]
    columns: Column<T>[]
    searchable?: boolean
    searchPlaceholder?: string
    onSearch?: (query: string) => void
    pagination?: {
        page: number
        totalPages: number
        onPageChange: (page: number) => void
        hasNext: boolean
        hasPrev: boolean
    }
    onRowClick?: (item: T) => void
    isLoading?: boolean
    emptyMessage?: string
    className?: string
}

export function DataTable<T extends { id: string }>({
    data,
    columns,
    searchable = false,
    searchPlaceholder = "Search...",
    onSearch,
    pagination,
    onRowClick,
    isLoading = false,
    emptyMessage = "No data found",
    className
}: DataTableProps<T>) {
    const [searchQuery, setSearchQuery] = useState("")

    const handleSearch = (value: string) => {
        setSearchQuery(value)
        onSearch?.(value)
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Search */}
            {searchable && (
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
            )}

            {/* Table */}
            <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-stone-200 bg-stone-50">
                                {columns.map((column) => (
                                    <th
                                        key={column.key}
                                        className={cn(
                                            "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500",
                                            column.className
                                        )}
                                    >
                                        {column.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-12 text-center">
                                        <div className="flex justify-center">
                                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
                                        </div>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-12 text-center text-stone-500">
                                        {emptyMessage}
                                    </td>
                                </tr>
                            ) : (
                                data.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => onRowClick?.(item)}
                                        className={cn(
                                            "transition-colors",
                                            onRowClick && "cursor-pointer hover:bg-stone-50"
                                        )}
                                    >
                                        {columns.map((column) => (
                                            <td
                                                key={column.key}
                                                className={cn(
                                                    "px-4 py-3 text-sm text-stone-700",
                                                    column.className
                                                )}
                                            >
                                                {column.render
                                                    ? column.render(item)
                                                    : (item as any)[column.key]}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {pagination && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-stone-500">
                        Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => pagination.onPageChange(pagination.page - 1)}
                            disabled={!pagination.hasPrev}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => pagination.onPageChange(pagination.page + 1)}
                            disabled={!pagination.hasNext}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
