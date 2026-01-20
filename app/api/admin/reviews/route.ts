import { getAdminFromRequest, unauthorizedResponse } from "@/lib/admin"
import { adminDb } from "@/lib/firebase/admin"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Admin Reviews API
 * 
 * Returns paginated list of all reviews.
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
        const minStars = parseFloat(searchParams.get("minStars") || "0")

        // Get all reviews with ordering
        const reviewsSnapshot = await adminDb
            .collection("reviews")
            .orderBy("createdAt", "desc")
            .get()

        let reviews = reviewsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
        }))

        // Apply search filter
        if (search) {
            reviews = reviews.filter((r: any) =>
                r.name?.toLowerCase().includes(search) ||
                r.profession?.toLowerCase().includes(search) ||
                r.review?.toLowerCase().includes(search)
            )
        }

        // Apply star filter
        if (minStars > 0) {
            reviews = reviews.filter((r: any) => (r.stars || 0) >= minStars)
        }

        // Calculate stats
        const totalCount = reviews.length
        const averageRating = totalCount > 0
            ? reviews.reduce((sum: number, r: any) => sum + (r.stars || 0), 0) / totalCount
            : 0

        // Star distribution
        const starDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        reviews.forEach((r: any) => {
            const star = Math.floor(r.stars || 0)
            if (star >= 1 && star <= 5) {
                starDistribution[star as keyof typeof starDistribution]++
            }
        })

        // Paginate
        const total = reviews.length
        const totalPages = Math.ceil(total / limit)
        const offset = (page - 1) * limit
        const paginatedReviews = reviews.slice(offset, offset + limit)

        return NextResponse.json({
            reviews: paginatedReviews,
            stats: {
                totalCount,
                averageRating: averageRating.toFixed(1),
                starDistribution
            },
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
        console.error("[Admin Reviews] Error:", error)
        return NextResponse.json(
            { error: "Failed to fetch reviews" },
            { status: 500 }
        )
    }
}
