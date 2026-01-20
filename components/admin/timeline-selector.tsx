"use client"

import { cn } from "@/lib/utils"

interface TimelineSelectorProps {
    periods: number[]
    selected: number
    onChange: (period: number) => void
    className?: string
}

export function TimelineSelector({ periods, selected, onChange, className }: TimelineSelectorProps) {
    return (
        <div className={cn("inline-flex rounded-lg border border-stone-200 bg-white p-1", className)}>
            {periods.map((period) => (
                <button
                    key={period}
                    onClick={() => onChange(period)}
                    className={cn(
                        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                        selected === period
                            ? "bg-emerald-600 text-white"
                            : "text-stone-600 hover:bg-stone-100"
                    )}
                >
                    {period}d
                </button>
            ))}
        </div>
    )
}
