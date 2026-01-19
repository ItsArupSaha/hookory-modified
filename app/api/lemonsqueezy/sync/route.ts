import { getUserFromRequest } from "@/lib/auth-server"
import { checkLemonSqueezySubscriptionStatus } from "@/lib/lemonsqueezy"
import { sendEmail } from "@/lib/email"
import { getPaymentSuccessEmailTemplate } from "@/lib/email-templates"
import { adminDb } from "@/lib/firebase/admin"
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
        const email = userDoc.email
        const displayName = userDoc.displayName || "Creator"
        const userRef = adminDb.collection("users").doc(uid)

        console.log(`[Sync] Starting sync for user ${uid} (${email})`)

        // STEP 1: Fetch subscription status from Lemon Squeezy API
        const subscriptionStatus = await checkLemonSqueezySubscriptionStatus(email ?? undefined)

        if (!subscriptionStatus.hasCreatorAccess) {
            console.log(`[Sync] No active subscription found for ${email}`)
            return NextResponse.json({
                success: true,
                status: subscriptionStatus.status,
                plan: "free",
                complete: false
            })
        }

        console.log(`[Sync] Active subscription found: ${subscriptionStatus.subscriptionId}`)

        // STEP 2: Send email via Resend - wait for its response (source of truth)
        console.log(`[Sync] Sending payment success email to ${email}...`)
        const emailHtml = getPaymentSuccessEmailTemplate(displayName, "Creator")
        const emailResult = await sendEmail({
            to: email!,
            subject: "Payment Successful - Hookory",
            html: emailHtml
        })

        if (!emailResult.success) {
            console.error(`[Sync] Email send FAILED. Will retry on next poll.`)
            return NextResponse.json({
                success: false,
                status: subscriptionStatus.status,
                plan: "creator",
                complete: false,
                error: "Email send failed"
            })
        }

        console.log(`[Sync] Email sent successfully! Updating Firestore...`)

        // STEP 3: Email success confirmed - Update Firestore with subscription data
        const updateData: any = {
            plan: "creator",
            usageLimitMonthly: 100,
            lemonSqueezyStatus: subscriptionStatus.status,
            updatedAt: Timestamp.now(),
        }

        if (subscriptionStatus.subscriptionId) {
            updateData.lemonSqueezySubscriptionId = subscriptionStatus.subscriptionId
        }

        if (subscriptionStatus.customerId) {
            updateData.lemonSqueezyCustomerId = subscriptionStatus.customerId
        }

        if (subscriptionStatus.periodEnd) {
            updateData.subscriptionPeriodEnd = Timestamp.fromDate(subscriptionStatus.periodEnd)
        }

        await userRef.update(updateData)

        console.log(`[Sync] Firestore updated successfully for user ${uid}`)

        // Return complete: true to signal client to stop polling
        return NextResponse.json({
            success: true,
            status: subscriptionStatus.status,
            plan: "creator",
            complete: true
        })

    } catch (error: any) {
        console.error("[Sync] Error:", error)
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
