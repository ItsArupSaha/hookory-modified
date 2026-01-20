import { adminDb } from "@/lib/firebase/admin"
import { Timestamp } from "firebase-admin/firestore"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { sendEmail } from "@/lib/email"
import { getPaymentSuccessEmailTemplate, getPaymentDeclinedEmailTemplate, getSubscriptionEndedEmailTemplate } from "@/lib/emails/templates"

export const runtime = "nodejs"

// Helper to update user in Firestore
async function updateUserSubscriptionInFirestore(
    userId: string,
    subscriptionData: any,
    customerId: string,
    customerEmail: string
) {
    const status = subscriptionData.attributes.status
    const endsAt = subscriptionData.attributes.ends_at
        ? new Date(subscriptionData.attributes.ends_at)
        : null
    const renewsAt = subscriptionData.attributes.renews_at
        ? new Date(subscriptionData.attributes.renews_at)
        : null

    // Logic for access:
    // Active, on_trial, past_due = Access
    // Cancelled = Access ONLY IF endsAt is in future
    // Expired, Unpaid = No Access

    const now = new Date()
    let hasAccess = false

    if (["active", "on_trial", "past_due"].includes(status)) {
        hasAccess = true
    } else if (status === "cancelled" && endsAt && endsAt > now) {
        hasAccess = true
    }

    const userRef = adminDb.collection("users").doc(userId)

    await userRef.update({
        lemonSqueezyCustomerId: customerId,
        lemonSqueezySubscriptionId: subscriptionData.id,
        lemonSqueezyStatus: status,

        plan: hasAccess ? "creator" : "free",
        usageLimitMonthly: hasAccess ? 100 : 5,
        subscriptionPeriodEnd: endsAt ? Timestamp.fromDate(endsAt) : (renewsAt ? Timestamp.fromDate(renewsAt) : null), // Use ends_at or renews_at as period end
        updatedAt: Timestamp.now(),
        // Store email reference just in case
        lemonSqueezyCustomerEmail: customerEmail,
    })

    console.log(`[Webhook] Updated user ${userId}: plan=${hasAccess ? "creator" : "free"}, status=${status}`)
}

export async function POST(req: NextRequest) {
    try {
        const text = await req.text()
        const hmac = crypto.createHmac(
            "sha256",
            process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ""
        )
        const digest = Buffer.from(hmac.update(text).digest("hex"), "utf8")
        const signature = Buffer.from(
            req.headers.get("x-signature") || "",
            "utf8"
        )

        if (!crypto.timingSafeEqual(digest, signature)) {
            console.error("[Webhook] Invalid signature")
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
        }

        const payload = JSON.parse(text)
        const eventName = payload.meta.event_name
        const data = payload.data
        const attributes = data.attributes
        const customData = payload.meta.custom_data || {}

        console.log(`[Webhook] Received event: ${eventName}`)

        // We care about subscription events primarily
        // order_created is also useful for initial setup if needed, but subscription_created usually follows.
        // However, for Lemon Squeezy, 'subscription_created' contains the subscription object we need.

        if (
            eventName === "subscription_created" ||
            eventName === "subscription_updated" ||
            eventName === "subscription_cancelled" ||
            eventName === "subscription_expired" ||
            eventName === "subscription_resumed" ||
            eventName === "subscription_unpaused"
        ) {

            const customerId = attributes.customer_id.toString()
            const userEmail = attributes.user_email
            let firebaseUid = customData.user_id // We should pass user_id in checkout custom data

            // If we don't have firebaseUid from custom_data, try to find by email
            if (!firebaseUid) {
                console.warn(`[Webhook] No user_id in custom_data for event ${eventName}. Trying email lookup: ${userEmail}`)
                const usersSnap = await adminDb.collection("users").where("email", "==", userEmail).limit(1).get()
                if (!usersSnap.empty) {
                    firebaseUid = usersSnap.docs[0].id
                    console.log(`[Webhook] Found user by email: ${firebaseUid}`)
                } else {
                    console.error(`[Webhook] User not found for email: ${userEmail}`)
                    return NextResponse.json({ received: true }, { status: 200 }) // Return 200 to acknowledge receipt even if we can't process
                }
            }

            if (firebaseUid) {
                // SECURITY: Verify the variant ID matches our Creator plan
                // This prevents users from buying a cheap $1 product to unlock the full plan
                const variantId = attributes.variant_id.toString()
                const expectedVariantId = process.env.LEMONSQUEEZY_VARIANT_ID

                if (variantId !== expectedVariantId) {
                    console.warn(`[Webhook] Security Alert: Received webhook for unknown variant ID: ${variantId}. Expected: ${expectedVariantId}. Ignoring.`)
                    // We simply ignore this event. The user's plan remains unchanged (likely "free").
                    return NextResponse.json({ received: true, ignored: "wrong_variant" })
                }

                await updateUserSubscriptionInFirestore(firebaseUid, data, customerId, userEmail)
            }
        } else if (eventName === 'subscription_payment_success') {
            // Send Payment Success Email (with idempotency check)
            const userEmail = attributes.user_email
            const userName = attributes.user_name || "Creator"
            const invoiceId = data.id // Unique invoice/payment ID from Lemon Squeezy

            if (userEmail && invoiceId) {
                // Find user by email to check if email was already sent for this invoice
                const usersSnap = await adminDb.collection("users").where("email", "==", userEmail).limit(1).get()

                if (!usersSnap.empty) {
                    const userDoc = usersSnap.docs[0]
                    const userData = userDoc.data()

                    // IDEMPOTENCY CHECK: Skip if email was already sent for this invoice
                    if (userData.lastPaymentEmailSentForInvoice === invoiceId) {
                        console.log(`[Webhook] Skipping duplicate payment success email for invoice ${invoiceId}`)
                    } else {
                        // Send email and mark as sent ONLY if successful
                        const emailHtml = getPaymentSuccessEmailTemplate(userName, "Creator")
                        const emailResult = await sendEmail({
                            to: userEmail,
                            subject: "Payment Successful - Hookory",
                            html: emailHtml
                        })

                        // Only update the flag if email was successfully sent
                        if (emailResult.success) {
                            await userDoc.ref.update({
                                lastPaymentEmailSentForInvoice: invoiceId
                            })
                            console.log(`[Webhook] Payment success email sent for invoice ${invoiceId}`)
                        } else {
                            console.error(`[Webhook] Failed to send payment success email for invoice ${invoiceId}`)
                        }
                    }
                } else {
                    // User not found, still send email (edge case)
                    const emailHtml = getPaymentSuccessEmailTemplate(userName, "Creator")
                    await sendEmail({
                        to: userEmail,
                        subject: "Payment Successful - Hookory",
                        html: emailHtml
                    })
                    console.log(`[Webhook] Payment success email sent (user not in DB)`)
                }
            }
        } else if (eventName === 'subscription_payment_failed') {
            // Send Payment Declined Email
            const userEmail = attributes.user_email
            const userName = attributes.user_name || "Creator"
            if (userEmail) {
                const emailHtml = getPaymentDeclinedEmailTemplate(userName)
                await sendEmail({
                    to: userEmail,
                    subject: "Payment Failed - Hookory",
                    html: emailHtml
                })
            }
        } else if (eventName === 'subscription_expired' || eventName === 'subscription_cancelled') {
            // Verify if it's really ended (updateUser logic handles db, but we need email)
            // For cancelled, it might be "cancelled but active until period end".
            // We only send "Ended" email if it's actually expired or immediate cancellation.

            // Simpler approach: If event is expired, send email. 
            // If cancelled, check if ends_at is now/past.

            if (eventName === 'subscription_expired') {
                const userEmail = attributes.user_email
                const userName = attributes.user_name || "Creator"
                if (userEmail) {
                    const emailHtml = getSubscriptionEndedEmailTemplate(userName)
                    await sendEmail({
                        to: userEmail,
                        subject: "Subscription Ended - Hookory",
                        html: emailHtml
                    })
                }
            }
        } else if (eventName === 'order_created') {
            // Only useful if it's a one-time payment, but here we are doing subscriptions.
            // Usually subscription_created triggers right after.
            // We can ignore or log.
            console.log("[Webhook] Order created event received. Waiting for subscription events.")
        }

        return NextResponse.json({ received: true })
    } catch (err: any) {
        console.error("[Webhook] Error processing webhook:", err)
        return NextResponse.json(
            { error: `Webhook Error: ${err.message}` },
            { status: 500 }
        )
    }
}
