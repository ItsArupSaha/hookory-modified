import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
    title: string
    value: string | number
    description?: string
    icon?: LucideIcon
    trend?: {
        value: number
        isPositive: boolean
    }
    className?: string
}

export function StatCard({
    title,
    value,
    description,
    icon: Icon,
    trend,
    className
}: StatCardProps) {
    return (
        <div className={cn(
            "rounded-xl border border-stone-200 bg-white p-6 shadow-sm",
            className
        )}>
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-stone-500">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-stone-900">{value}</p>
                        {trend && (
                            <span className={cn(
                                "text-sm font-medium",
                                trend.isPositive ? "text-emerald-600" : "text-red-600"
                            )}>
                                {trend.isPositive ? "+" : ""}{trend.value}%
                            </span>
                        )}
                    </div>
                    {description && (
                        <p className="text-xs text-stone-400">{description}</p>
                    )}
                </div>
                {Icon && (
                    <div className="rounded-lg bg-emerald-50 p-3">
                        <Icon className="h-5 w-5 text-emerald-600" />
                    </div>
                )}
            </div>
        </div>
    )
}
