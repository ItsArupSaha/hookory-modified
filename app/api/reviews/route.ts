import { getReviewReceivedEmailTemplate } from "@/lib/emails/templates"
import { sendEmail } from "@/lib/email"
import { adminDb } from "@/lib/firebase/admin"
import { getUserFromRequest } from "@/lib/auth-server"
import { Timestamp } from "firebase-admin/firestore"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// GET endpoint to check if user has already reviewed
export async function GET(req: NextRequest) {
    try {
        const authed = await getUserFromRequest(req)
        if (!authed) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { uid } = authed

        const reviewsSnapshot = await adminDb
            .collection("reviews")
            .where("uid", "==", uid)
            .limit(1)
            .get()

        const hasReviewed = !reviewsSnapshot.empty

        return NextResponse.json({ hasReviewed })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const authed = await getUserFromRequest(req)
        if (!authed) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { uid, userDoc } = authed
        const { name, profession, stars, review } = await req.json()

        // Validation
        if (!name || typeof name !== "string") {
            return NextResponse.json({ error: "Name is required" }, { status: 400 })
        }
        if (typeof stars !== "number" || stars < 0.5 || stars > 5) {
            return NextResponse.json({ error: "Invalid rating" }, { status: 400 })
        }
        if (!review || typeof review !== "string" || review.trim().length === 0) {
            return NextResponse.json({ error: "Review is required" }, { status: 400 })
        }

        // Check for existing review
        const reviewsSnapshot = await adminDb
            .collection("reviews")
            .where("uid", "==", uid)
            .limit(1)
            .get()

        if (!reviewsSnapshot.empty) {
            return NextResponse.json(
                { error: "You have already submitted a review." },
                { status: 409 }
            )
        }

        // Save review
        await adminDb.collection("reviews").add({
            uid,
            name: name.trim(),
            profession: profession ? profession.trim() : null,
            stars,
            review: review.trim(),
            createdAt: Timestamp.now(),
        })

        // Send confirmation email
        if (userDoc.email) {
            const emailHtml = getReviewReceivedEmailTemplate(userDoc.displayName || name)
            await sendEmail({
                to: userDoc.email,
                subject: "Thank You for Your Review - Hookory",
                html: emailHtml
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("[Review API] Error:", error)
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
