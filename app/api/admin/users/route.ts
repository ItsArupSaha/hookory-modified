import { getAdminFromRequest, unauthorizedResponse } from "@/lib/admin"
import { adminDb } from "@/lib/firebase/admin"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Admin Users API
 * 
 * Returns paginated list of all users with filters.
 * STRICTLY ADMIN ONLY
 */
export async function GET(req: NextRequest) {
    // SECURITY: Verify admin access
    const admin = await getAdminFromRequest(req)
    if (!admin) {
        return unauthorizedResponse()
    }

    try {
        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get("page") || "1")
        const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
        const search = searchParams.get("search")?.toLowerCase()
        const planFilter = searchParams.get("plan") // "free" | "creator" | "all"
        const sortBy = searchParams.get("sortBy") || "createdAt"
        const sortOrder = searchParams.get("sortOrder") || "desc"

        // Get all users (we'll filter/paginate in memory for flexibility)
        // In production with many users, you'd want to use Firestore queries
        const usersSnapshot = await adminDb.collection("users").get()
        let users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
            updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
            lastGenerateAt: doc.data().lastGenerateAt?.toDate?.()?.toISOString() || null,
            usageResetAt: doc.data().usageResetAt?.toDate?.()?.toISOString() || null,
            subscriptionPeriodEnd: doc.data().subscriptionPeriodEnd?.toDate?.()?.toISOString() || null,
        }))

        // Apply search filter
        if (search) {
            users = users.filter((u: any) =>
                u.email?.toLowerCase().includes(search) ||
                u.displayName?.toLowerCase().includes(search)
            )
        }

        // Apply plan filter
        if (planFilter && planFilter !== "all") {
            users = users.filter((u: any) => u.plan === planFilter)
        }

        // Sort
        users.sort((a: any, b: any) => {
            const aVal = a[sortBy] || ""
            const bVal = b[sortBy] || ""
            if (sortOrder === "asc") {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
            }
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
        })

        // Paginate
        const total = users.length
        const totalPages = Math.ceil(total / limit)
        const offset = (page - 1) * limit
        const paginatedUsers = users.slice(offset, offset + limit)

        return NextResponse.json({
            users: paginatedUsers,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        })
    } catch (error: any) {
        console.error("[Admin Users] Error:", error)
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        )
    }
}
