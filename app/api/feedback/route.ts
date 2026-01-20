import { getWelcomeEmailTemplate, getFeedbackReceivedEmailTemplate } from "@/lib/emails/templates"
import { sendEmail } from "@/lib/email"
import { adminDb } from "@/lib/firebase/admin"
import { getUserFromRequest } from "@/lib/auth-server"
import { Timestamp } from "firebase-admin/firestore"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
    try {
        const authed = await getUserFromRequest(req)
        if (!authed) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { uid, userDoc } = authed
        const { message } = await req.json()

        if (!message || typeof message !== "string" || message.trim().length === 0) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 })
        }

        const isFreeUser = userDoc.plan !== "creator"

        // Rate limit for free users: 10 per month
        if (isFreeUser) {
            const now = new Date()
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

            // OPTIMIZATION: Query by UID only to avoid Firestore Index requirement
            // We fetch all user feedback and filter in memory. Since the limit is 10/month, 
            // the total document size will likely be small enough for this to be efficient.
            const feedbacksSnapshot = await adminDb
                .collection("feedbacks")
                .where("uid", "==", uid)
                .get()

            const currentMonthFeedbacks = feedbacksSnapshot.docs.filter(doc => {
                const data = doc.data()
                // Check if createdAt exists and is after startOfMonth
                return data.createdAt && data.createdAt.toDate() >= startOfMonth
            })

            if (currentMonthFeedbacks.length >= 10) {
                return NextResponse.json(
                    { error: "Free plan limit reached. You can submit up to 10 feedbacks per month." },
                    { status: 429 }
                )
            }
        }

        // Save feedback
        await adminDb.collection("feedbacks").add({
            uid,
            userEmail: userDoc.email,
            message: message.trim(),
            createdAt: Timestamp.now(),
        })

        // Send confirmation email
        if (userDoc.email) {
            const emailHtml = getFeedbackReceivedEmailTemplate(userDoc.displayName || "Creator")
            await sendEmail({
                to: userDoc.email,
                subject: "We Received Your Feedback - Hookory",
                html: emailHtml
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("[Feedback API] Error:", error)
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
