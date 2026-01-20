"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Users,
    BarChart3,
    MessageSquare,
    Star,
    FileText,
    Settings,
    LogOut,
    Shield
} from "lucide-react"

const navItems = [
    {
        title: "Overview",
        href: "/admin",
        icon: LayoutDashboard
    },
    {
        title: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3
    },
    {
        title: "Users",
        href: "/admin/users",
        icon: Users
    },
    {
        title: "Feedbacks",
        href: "/admin/feedbacks",
        icon: MessageSquare
    },
    {
        title: "Reviews",
        href: "/admin/reviews",
        icon: Star
    },
    {
        title: "Jobs",
        href: "/admin/jobs",
        icon: FileText
    }
]

export function AdminSidebar() {
    const pathname = usePathname()

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-stone-200 bg-white">
            <div className="flex h-full flex-col">
                {/* Logo/Header */}
                <div className="flex h-16 items-center gap-2 border-b border-stone-200 px-6">
                    <Shield className="h-6 w-6 text-emerald-600" />
                    <span className="text-lg font-bold text-stone-900">Admin Panel</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4">
                    <ul className="space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== "/admin" && pathname.startsWith(item.href))

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "h-5 w-5",
                                            isActive ? "text-emerald-600" : "text-stone-400"
                                        )} />
                                        {item.title}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                {/* Footer */}
                <div className="border-t border-stone-200 p-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                    >
                        <LogOut className="h-5 w-5 text-stone-400" />
                        Back to App
                    </Link>
                </div>
            </div>
        </aside>
    )
}
