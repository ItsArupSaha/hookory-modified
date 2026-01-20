import { getAdminFromRequest, unauthorizedResponse } from "@/lib/admin"
import { adminDb } from "@/lib/firebase/admin"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Admin Jobs API
 * 
 * Returns paginated list of all generation jobs.
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
        const userId = searchParams.get("userId")
        const format = searchParams.get("format")

        // Build query
        let query = adminDb.collection("jobs").orderBy("createdAt", "desc")

        if (userId) {
            query = adminDb.collection("jobs")
                .where("userId", "==", userId)
                .orderBy("createdAt", "desc")
        }

        const jobsSnapshot = await query.get()

        let jobs = jobsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
            // Truncate input/output for listing
            inputText: doc.data().inputText?.substring(0, 200) + (doc.data().inputText?.length > 200 ? '...' : ''),
        }))

        // Apply format filter
        if (format) {
            jobs = jobs.filter((j: any) =>
                j.formatsSelected?.includes(format)
            )
        }

        // Get unique formats for filter options
        const allFormats = new Set<string>()
        jobs.forEach((j: any) => {
            j.formatsSelected?.forEach((f: string) => allFormats.add(f))
        })

        // Paginate
        const total = jobs.length
        const totalPages = Math.ceil(total / limit)
        const offset = (page - 1) * limit
        const paginatedJobs = jobs.slice(offset, offset + limit)

        return NextResponse.json({
            jobs: paginatedJobs,
            filters: {
                availableFormats: Array.from(allFormats)
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
        console.error("[Admin Jobs] Error:", error)
        return NextResponse.json(
            { error: "Failed to fetch jobs" },
            { status: 500 }
        )
    }
}
