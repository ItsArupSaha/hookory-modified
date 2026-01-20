import { getUserFromRequest } from "@/lib/auth-server"
import { sendEmail } from "@/lib/email"
import { getWelcomeEmailTemplate } from "@/lib/emails/templates"
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

        console.log(`[WelcomeEmail] Checking welcome email status for user ${uid} (${email})`)

        // Check Firestore if welcome email was already sent
        const freshUserDoc = await userRef.get()
        const userData = freshUserDoc.data() as any

        if (userData?.welcomeEmailSent === true) {
            console.log(`[WelcomeEmail] Already sent - skipping`)
            return NextResponse.json({
                success: true,
                alreadySent: true,
                complete: true
            })
        }

        console.log(`[WelcomeEmail] Sending welcome email to ${email}...`)

        // Send welcome email via Resend
        const emailHtml = getWelcomeEmailTemplate(displayName)
        const emailResult = await sendEmail({
            to: email!,
            subject: "Welcome to Hookory! 🎉",
            html: emailHtml
        })

        if (!emailResult.success) {
            console.error(`[WelcomeEmail] Email send FAILED`)
            return NextResponse.json({
                success: false,
                complete: false,
                error: "Email send failed"
            })
        }

        console.log(`[WelcomeEmail] Email sent successfully! Updating Firestore...`)

        // Update Firestore with welcomeEmailSent flag
        await userRef.update({
            welcomeEmailSent: true,
            welcomeEmailSentAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        })

        console.log(`[WelcomeEmail] Firestore updated for user ${uid}`)

        return NextResponse.json({
            success: true,
            complete: true
        })

    } catch (error: any) {
        console.error("[WelcomeEmail] Error:", error)
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
