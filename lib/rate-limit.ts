import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

/**
 * Rate Limiter Configuration
 * 
 * Strategy:
 * 1. Try to use Upstash Redis (Best for Vercel/Serverless)
 * 2. Fallback to In-Memory Map (Best for Dev/Local)
 */

type Duration = "1 m" | "10 s" | "60 s" // Upstash durations

// --- In-Memory Fallback (from previous step) ---
interface RateLimitContext {
    count: number
    lastReset: number
}
const ipCache = new Map<string, RateLimitContext>()

function memoryRateLimit(ip: string, limit: number, windowSeconds: number): { success: boolean, retryAfter?: number } {
    const now = Date.now()
    const windowMs = windowSeconds * 1000
    const record = ipCache.get(ip) || { count: 0, lastReset: now }

    if (now - record.lastReset > windowMs) {
        record.count = 0
        record.lastReset = now
    }

    if (record.count >= limit) {
        // Simple retry calculation
        const retryAfter = Math.ceil((windowMs - (now - record.lastReset)) / 1000)
        return { success: false, retryAfter }
    }

    record.count += 1
    ipCache.set(ip, record)

    // Lazy Cleanup
    if (ipCache.size > 5000) ipCache.clear()

    return { success: true }
}

// --- Upstash Implementation ---
let ratelimit: Ratelimit | undefined

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    ratelimit = new Ratelimit({
        redis: Redis.fromEnv(),
        // limiter: Ratelimit.slidingWindow(10, "10 s"),
        // analytics: true,
        /**
         * Optional prefix for the keys used in redis. This is useful if you want to share a redis
         * instance with other applications and want to avoid key collisions. The default prefix is
         * "@upstash/ratelimit"
         */
        prefix: "@upstash/ratelimit",
        limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 requests per 60s
    })
}

// --- Unified Export ---

export async function checkRateLimit(identifier: string) {
    // 1. Upstash
    if (ratelimit) {
        try {
            const result = await ratelimit.limit(identifier)
            return {
                success: result.success,
                // retryAfter is in seconds for Upstash? No, usually ms or timestamp.
                // Upstash returns reset time (unix ms).
                retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
            }
        } catch (err) {
            console.error("Upstash Rate Limit Error:", err)
            // Fail Open (allow request if Redis is down)
            return { success: true }
        }
    }

    // 2. Fallback Memory
    // 10 requests / 60 seconds
    return memoryRateLimit(identifier, 10, 60)
}

// Keep the old export for compatibility if needed, but we should switch to `checkRateLimit`
// which is async (because Upstash is async).
// The memory one was synchronous before, but now we make it async signature to match.
export const rateLimit = async (ip: string, limit: number, windowMs: number) => {
    // Adapter to match old signature if needed, but better to use checkRateLimit directly.
    return checkRateLimit(ip)
}
