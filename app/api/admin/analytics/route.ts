import { getAdminFromRequest, unauthorizedResponse } from "@/lib/admin"
import { adminDb } from "@/lib/firebase/admin"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Admin Analytics API
 * 
 * Returns time-series analytics data for charts.
 * All data comes from existing Firebase collections (users, jobs).
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
        const period = parseInt(searchParams.get("period") || "7") // days

        // Validate period
        const validPeriods = [7, 15, 30, 60, 90]
        const actualPeriod = validPeriods.includes(period) ? period : 7

        const now = new Date()
        const startDate = new Date(now.getTime() - actualPeriod * 24 * 60 * 60 * 1000)
        const startDateStr = startDate.toISOString().split('T')[0]

        // Get users for signups and activity analysis
        const usersSnapshot = await adminDb.collection("users").get()
        const users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        // Get jobs for generation activity
        const jobsSnapshot = await adminDb.collection("jobs").get()
        const jobs = jobsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        // Generate date range
        const dateRange: string[] = []
        for (let i = actualPeriod - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
            dateRange.push(date.toISOString().split('T')[0])
        }

        // Aggregate data by date
        const dailyData = dateRange.map(date => {
            // New signups on this date
            const dayUsers = users.filter((u: any) => {
                const created = u.createdAt?.toDate?.()?.toISOString().split('T')[0]
                return created === date
            })

            // Jobs created on this date
            const dayJobs = jobs.filter((j: any) => {
                const created = j.createdAt?.toDate?.()?.toISOString().split('T')[0]
                return created === date
            })

            // Active users on this date (who generated content)
            const activeUsers = users.filter((u: any) => {
                const lastGen = u.lastGenerateAt?.toDate?.()?.toISOString().split('T')[0]
                return lastGen === date
            })

            // Upgrades on this date (users who became creator on this date)
            const upgrades = users.filter((u: any) => {
                const upgraded = u.planStartsAt?.toDate?.()?.toISOString().split('T')[0] ||
                    u.subscriptionPeriodStart?.toDate?.()?.toISOString().split('T')[0]
                return upgraded === date && u.plan === "creator"
            })

            return {
                date,
                signups: dayUsers.length,
                generations: dayJobs.length,
                activeUsers: activeUsers.length,
                upgrades: upgrades.length,
            }
        })

        // Calculate totals for the period
        const totals = {
            signups: dailyData.reduce((sum, d) => sum + d.signups, 0),
            generations: dailyData.reduce((sum, d) => sum + d.generations, 0),
            activeUsers: new Set(users.filter((u: any) => {
                const lastGen = u.lastGenerateAt?.toDate?.()
                return lastGen && lastGen >= startDate
            }).map((u: any) => u.id)).size,
            upgrades: dailyData.reduce((sum, d) => sum + d.upgrades, 0),
        }

        // User growth over time (cumulative)
        const userGrowth = dateRange.map(date => {
            const usersBeforeDate = users.filter((u: any) => {
                const created = u.createdAt?.toDate?.()?.toISOString().split('T')[0]
                return created && created <= date
            }).length
            return { date, totalUsers: usersBeforeDate }
        })

        // Conversion funnel
        const totalCreators = users.filter((u: any) => u.plan === 'creator').length

        return NextResponse.json({
            period: actualPeriod,
            startDate: startDateStr,
            endDate: now.toISOString().split('T')[0],
            dailyData,
            totals,
            userGrowth,
            funnel: {
                totalUsers: users.length,
                creators: totalCreators,
                conversionRate: users.length > 0 ? ((totalCreators / users.length) * 100).toFixed(1) : "0"
            }
        })
    } catch (error: any) {
        console.error("[Admin Analytics] Error:", error)
        return NextResponse.json(
            { error: "Failed to fetch analytics" },
            { status: 500 }
        )
    }
}
