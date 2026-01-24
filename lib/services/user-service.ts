import { checkAndResetUsage, checkCooldown, incrementUsage } from "@/lib/usage"
import { checkRateLimit } from "@/lib/rate-limit"
import { Timestamp } from "firebase-admin/firestore"

export const MAX_INPUT_LENGTH_FREE = 8000
export const MAX_INPUT_LENGTH_CREATOR = 15000

export class UserService {
    static async checkRateLimit(ip: string) {
        return checkRateLimit(ip)
    }

    static async validatePlan(userDoc: any, inputType: string, regenerate: boolean) {

        // Plan restrictions - Read from Firebase
        const planFromFirebase = userDoc.plan as "free" | "creator" | undefined
        const planExpiresAt = (userDoc.planExpiresAt as any)?.toDate?.() || userDoc.subscriptionPeriodEnd?.toDate() || null

        // Check if plan has expired
        const now = new Date()
        const isExpired = planExpiresAt ? planExpiresAt <= now : false

        // Determine if user has paid plan access
        const isPaid = planFromFirebase === "creator" && !isExpired

        if (!isPaid) {
            if (inputType === "url") {
                throw new Error("URL input is available on the Creator plan. Upgrade to unlock.")
            }
            if (regenerate) {
                throw new Error("Regenerate is available on the Creator plan. Upgrade to unlock.")
            }
        }

        return { isPaid }
    }

    static async checkCooldown(uid: string) {
        const cooldown = await checkCooldown(uid)
        if (!cooldown.allowed) {
            return { allowed: false, secondsRemaining: cooldown.secondsRemaining }
        }
        return { allowed: true }
    }

    static async checkUsageLimit(uid: string) {
        const usage = await checkAndResetUsage(uid)
        if (usage.usageCount >= usage.usageLimitMonthly) {
            return { limited: true }
        }
        return { limited: false }
    }

    static async incrementUsage(uid: string) {
        return incrementUsage(uid)
    }
}
