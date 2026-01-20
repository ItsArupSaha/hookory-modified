import { getAdminFromRequest, unauthorizedResponse } from "@/lib/admin"
import { adminDb } from "@/lib/firebase/admin"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Admin User Detail API
 * 
 * Returns detailed information about a specific user.
 * STRICTLY ADMIN ONLY
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // SECURITY: Verify admin access
    const admin = await getAdminFromRequest(req)
    if (!admin) {
        return unauthorizedResponse()
    }

    try {
        const { id } = await params

        // Get user document
        const userDoc = await adminDb.collection("users").doc(id).get()

        if (!userDoc.exists) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        const userData = userDoc.data()!

        // Format timestamps
        const user = {
            id: userDoc.id,
            ...userData,
            createdAt: userData.createdAt?.toDate?.()?.toISOString() || null,
            updatedAt: userData.updatedAt?.toDate?.()?.toISOString() || null,
            lastGenerateAt: userData.lastGenerateAt?.toDate?.()?.toISOString() || null,
            usageResetAt: userData.usageResetAt?.toDate?.()?.toISOString() || null,
            subscriptionPeriodStart: userData.subscriptionPeriodStart?.toDate?.()?.toISOString() || null,
            subscriptionPeriodEnd: userData.subscriptionPeriodEnd?.toDate?.()?.toISOString() || null,
            planStartsAt: userData.planStartsAt?.toDate?.()?.toISOString() || null,
            planExpiresAt: userData.planExpiresAt?.toDate?.()?.toISOString() || null,
            welcomeEmailSentAt: userData.welcomeEmailSentAt?.toDate?.()?.toISOString() || null,
        }

        // Get user's jobs (generation history)
        const jobsSnapshot = await adminDb
            .collection("jobs")
            .where("userId", "==", id)
            .orderBy("createdAt", "desc")
            .limit(20)
            .get()

        const jobs = jobsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
        }))

        // Get user's feedbacks
        const feedbacksSnapshot = await adminDb
            .collection("feedbacks")
            .where("uid", "==", id)
            .orderBy("createdAt", "desc")
            .limit(10)
            .get()

        const feedbacks = feedbacksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
        }))

        // Get user's review (if any)
        const reviewsSnapshot = await adminDb
            .collection("reviews")
            .where("uid", "==", id)
            .limit(1)
            .get()

        const review = reviewsSnapshot.empty ? null : {
            id: reviewsSnapshot.docs[0].id,
            ...reviewsSnapshot.docs[0].data(),
            createdAt: reviewsSnapshot.docs[0].data().createdAt?.toDate?.()?.toISOString() || null
        }

        // Get user's events (activity timeline)
        const eventsSnapshot = await adminDb
            .collection("events")
            .where("userId", "==", id)
            .orderBy("timestamp", "desc")
            .limit(50)
            .get()

        const events = eventsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null
        }))

        return NextResponse.json({
            user,
            jobs,
            feedbacks,
            review,
            events,
            stats: {
                totalJobs: jobs.length,
                totalFeedbacks: feedbacks.length,
                hasReview: !!review
            }
        })
    } catch (error: any) {
        console.error("[Admin User Detail] Error:", error)
        return NextResponse.json(
            { error: "Failed to fetch user details" },
            { status: 500 }
        )
    }
}
