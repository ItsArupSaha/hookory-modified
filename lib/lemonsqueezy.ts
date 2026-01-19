import {
    lemonSqueezySetup,
    listSubscriptions,
    ListSubscriptionsParams,
} from "@lemonsqueezy/lemonsqueezy.js"
import { adminDb } from "@/lib/firebase/admin"
import { Timestamp } from "firebase-admin/firestore"

// Initialize Lemon Squeezy with API key from environment variables
if (!process.env.LEMONSQUEEZY_API_KEY) {
    console.warn(
        "LEMONSQUEEZY_API_KEY is not set; Lemon Squeezy features will not work."
    )
}

export function configureLemonSqueezy() {
    lemonSqueezySetup({
        apiKey: process.env.LEMONSQUEEZY_API_KEY || "",
        onError: (error) => console.error("Lemon Squeezy API Error:", error),
    })
}

// Initialize on load
configureLemonSqueezy()

export interface SubscriptionStatus {
    hasCreatorAccess: boolean
    status: string | null
    periodEnd: Date | null
    subscriptionId: string | null
    customerId: string | null
}

/**
 * Check Lemon Squeezy directly to determine if user has active Creator subscription
 * This is the source of truth - always query Lemon Squeezy, not Firestore, when validity is critical
 */
export async function checkLemonSqueezySubscriptionStatus(
    email: string | undefined
): Promise<SubscriptionStatus> {
    // Default: no access
    const defaultStatus: SubscriptionStatus = {
        hasCreatorAccess: false,
        status: null,
        periodEnd: null,
        subscriptionId: null,
        customerId: null,
    }

    if (!email || !process.env.LEMONSQUEEZY_API_KEY) {
        return defaultStatus
    }

    try {
        // Filter subscriptions by user email
        const filter: ListSubscriptionsParams["filter"] = {
            userEmail: email,
            storeId: process.env.LEMONSQUEEZY_STORE_ID,
        }

        const { data: subscriptions, error } = await listSubscriptions({ filter })

        if (error) {
            console.error("Lemon Squeezy List Subscriptions Error:", error)
            return defaultStatus
        }

        // console.log(
        //   `[Lemon Squeezy Check] Email ${email}: Found ${
        //     subscriptions?.data?.length || 0
        //   } subscription(s)`
        // )

        if (!subscriptions?.data || subscriptions.data.length === 0) {
            return defaultStatus
        }

        // Find the most recent valid subscription
        // Only one active subscription per product/variant is usually expected, but we handle multiple just in case
        const validSubscription = subscriptions.data.find((sub) => {
            const attributes = sub.attributes
            const status = attributes.status
            const endsAt = attributes.ends_at ? new Date(attributes.ends_at) : null
            const now = new Date()

            // Valid statuses: active, on_trial, past_due (grace period?)
            // We essentially want to know if they should have access.
            // active, on_trial: Yes
            // past_due: Yes (usually given a grace period)
            // cancelled: Yes, if ends_at is in the future
            // expired: No
            // unpaid: No (or maybe limited access)

            if (
                status === "active" ||
                status === "on_trial" ||
                status === "past_due"
            ) {
                return true
            }

            if (status === "cancelled" && endsAt && endsAt > now) {
                return true
            }

            return false
        })

        if (validSubscription) {
            const attributes = validSubscription.attributes
            const periodEnd = attributes.renews_at
                ? new Date(attributes.renews_at)
                : attributes.ends_at
                    ? new Date(attributes.ends_at)
                    : null

            return {
                hasCreatorAccess: true,
                status: attributes.status,
                periodEnd,
                subscriptionId: validSubscription.id,
                customerId: attributes.customer_id.toString(),
            }
        }

        return defaultStatus
    } catch (err) {
        console.error(
            "[Lemon Squeezy Check] Failed to check Lemon Squeezy subscription:",
            err
        )
        return defaultStatus
    }
}

/**
 * Update Firestore with latest Lemon Squeezy subscription data (async, non-blocking)
 */
export async function syncLemonSqueezyToFirestore(
    uid: string,
    subscriptionStatus: SubscriptionStatus
): Promise<{ updated: boolean }> {
    try {
        const userRef = adminDb.collection("users").doc(uid)
        const userDoc = await userRef.get()
        const currentData = userDoc.data()

        // IDEMPOTENCY CHECK: Skip update if already synced with same status & subscription ID
        if (currentData) {
            const alreadySynced =
                currentData.lemonSqueezyStatus === subscriptionStatus.status &&
                currentData.lemonSqueezySubscriptionId === subscriptionStatus.subscriptionId &&
                currentData.plan === (subscriptionStatus.hasCreatorAccess ? "creator" : "free")

            if (alreadySynced) {
                console.log(`[Sync] Skipping Firestore update for user ${uid} - already synced.`)
                return { updated: false }
            }
        }

        const updateData: any = {
            lemonSqueezyStatus: subscriptionStatus.status,
            plan: subscriptionStatus.hasCreatorAccess ? "creator" : "free",
            usageLimitMonthly: subscriptionStatus.hasCreatorAccess ? 100 : 5,
            updatedAt: Timestamp.now(),
        }

        if (subscriptionStatus.subscriptionId) {
            updateData.lemonSqueezySubscriptionId = subscriptionStatus.subscriptionId
        }

        if (subscriptionStatus.customerId) {
            updateData.lemonSqueezyCustomerId = subscriptionStatus.customerId
        }

        if (subscriptionStatus.periodEnd) {
            updateData.subscriptionPeriodEnd = Timestamp.fromDate(
                subscriptionStatus.periodEnd
            )
        }

        await userRef.update(updateData)
        console.log(`[Sync] Updated Firestore for user ${uid}: plan=${updateData.plan}, status=${updateData.lemonSqueezyStatus}`)
        return { updated: true }
    } catch (err) {
        console.error("Failed to sync Lemon Squeezy data to Firestore:", err)
        return { updated: false }
    }
}
