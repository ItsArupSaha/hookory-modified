import { getAdminFromRequest, unauthorizedResponse } from "@/lib/admin"
import { adminDb } from "@/lib/firebase/admin"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Admin Feedbacks API
 * 
 * Returns paginated list of all feedbacks.
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

        // Get all feedbacks with ordering
        const feedbacksSnapshot = await adminDb
            .collection("feedbacks")
            .orderBy("createdAt", "desc")
            .get()

        let feedbacks = feedbacksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
        }))

        // Apply search filter
        if (search) {
            feedbacks = feedbacks.filter((f: any) =>
                f.userEmail?.toLowerCase().includes(search) ||
                f.message?.toLowerCase().includes(search)
            )
        }

        // Paginate
        const total = feedbacks.length
        const totalPages = Math.ceil(total / limit)
        const offset = (page - 1) * limit
        const paginatedFeedbacks = feedbacks.slice(offset, offset + limit)

        return NextResponse.json({
            feedbacks: paginatedFeedbacks,
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
        console.error("[Admin Feedbacks] Error:", error)
        return NextResponse.json(
            { error: "Failed to fetch feedbacks" },
            { status: 500 }
        )
    }
}
