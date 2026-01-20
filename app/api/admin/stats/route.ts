import { getAdminFromRequest, unauthorizedResponse } from "@/lib/admin"
import { adminDb } from "@/lib/firebase/admin"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Admin Stats API
 * 
 * Returns comprehensive dashboard statistics.
 * All data comes from existing Firebase collections - no client-side tracking.
 * STRICTLY ADMIN ONLY - verified via getAdminFromRequest
 */
export async function GET(req: NextRequest) {
    // SECURITY: Verify admin access
    const admin = await getAdminFromRequest(req)
    if (!admin) {
        return unauthorizedResponse()
    }

    try {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

        // Get all users
        const usersSnapshot = await adminDb.collection("users").get()
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

        // Calculate user stats
        const totalUsers = users.length
        const creatorUsers = users.filter((u: any) => u.plan === "creator").length
        const freeUsers = totalUsers - creatorUsers

        // Users created in last 7 days
        const newUsersLast7Days = users.filter((u: any) => {
            const createdAt = u.createdAt?.toDate?.() || new Date(0)
            return createdAt >= sevenDaysAgo
        }).length

        // Users created in last 30 days
        const newUsersLast30Days = users.filter((u: any) => {
            const createdAt = u.createdAt?.toDate?.() || new Date(0)
            return createdAt >= thirtyDaysAgo
        }).length

        // Active users (generated content in last 7 days)
        const activeUsersLast7Days = users.filter((u: any) => {
            const lastGenerate = u.lastGenerateAt?.toDate?.()
            return lastGenerate && lastGenerate >= sevenDaysAgo
        }).length

        // Total generations (sum of usageCount from all users)
        const totalGenerations = users.reduce((sum: number, u: any) => sum + (u.usageCount || 0), 0)

        // Get feedbacks count
        const feedbacksSnapshot = await adminDb.collection("feedbacks").count().get()
        const totalFeedbacks = feedbacksSnapshot.data().count

        // Get reviews count and average
        const reviewsSnapshot = await adminDb.collection("reviews").get()
        const reviews = reviewsSnapshot.docs.map(doc => doc.data())
        const totalReviews = reviews.length
        const averageRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + (r.stars || 0), 0) / reviews.length
            : 0

        // Get jobs count (saved generation history for Creator users)
        const jobsSnapshot = await adminDb.collection("jobs").count().get()
        const totalJobs = jobsSnapshot.data().count

        // Calculate conversion rate
        const conversionRate = totalUsers > 0 ? ((creatorUsers / totalUsers) * 100).toFixed(2) : "0"

        return NextResponse.json({
            overview: {
                totalUsers,
                creatorUsers,
                freeUsers,
                conversionRate: `${conversionRate}%`,
                totalGenerations,
                totalFeedbacks,
                totalReviews,
                averageRating: averageRating.toFixed(1),
                totalJobs
            },
            recentActivity: {
                newUsersLast7Days,
                newUsersLast30Days,
                activeUsersLast7Days,
            },
            timestamp: now.toISOString()
        })
    } catch (error: any) {
        console.error("[Admin Stats] Error:", error)
        return NextResponse.json(
            { error: "Failed to fetch stats" },
            { status: 500 }
        )
    }
}
