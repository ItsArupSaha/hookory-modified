import { NextRequest } from "next/server"
import { adminAuth, adminDb } from "./firebase/admin"

/**
 * ADMIN SECURITY MODULE
 * 
 * This module provides strict admin-only access control.
 * Only emails explicitly listed in ADMIN_EMAIL* environment variables are allowed.
 * 
 * SECURITY MEASURES:
 * 1. Email matching is case-insensitive but exact
 * 2. Token verification through Firebase Admin SDK
 * 3. Double verification: both token validity AND email in admin list
 * 4. No caching of admin status - always verified fresh
 * 5. Logging of all admin access attempts for audit
 */

// Get all admin emails from environment variables
// Supports ADMIN_EMAIL1 through ADMIN_EMAIL10
export function getAdminEmails(): string[] {
    const adminEmails: string[] = []

    for (let i = 1; i <= 10; i++) {
        const email = process.env[`ADMIN_EMAIL${i}`]
        if (email && email.trim()) {
            adminEmails.push(email.trim().toLowerCase())
        }
    }

    return adminEmails
}

/**
 * Check if an email is in the admin list
 * Case-insensitive comparison for security
 */
export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false

    const normalizedEmail = email.trim().toLowerCase()
    const adminEmails = getAdminEmails()

    return adminEmails.includes(normalizedEmail)
}

export interface AdminUser {
    uid: string
    email: string
    displayName: string | null
    isAdmin: true
}

/**
 * Verify admin access from an API request
 * 
 * STRICT SECURITY:
 * 1. Extracts Bearer token from Authorization header
 * 2. Verifies token with Firebase Admin SDK
 * 3. Checks if the token's email is in the admin list
 * 4. Returns null for ANY failure - never exposes why access was denied
 * 
 * @param req - Next.js request object
 * @returns AdminUser if verified, null otherwise
 */
export async function getAdminFromRequest(req: NextRequest): Promise<AdminUser | null> {
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

    if (!token) {
        console.warn("[Admin Auth] No token provided")
        return null
    }

    try {
        // Verify token with Firebase Admin SDK
        const decoded = await adminAuth.verifyIdToken(token)

        if (!decoded.email) {
            console.warn("[Admin Auth] Token has no email claim")
            return null
        }

        // CRITICAL: Check if email is in admin list
        if (!isAdminEmail(decoded.email)) {
            // Log attempted unauthorized access for security audit
            console.warn(`[Admin Auth] UNAUTHORIZED ACCESS ATTEMPT by: ${decoded.email}`)
            return null
        }

        console.log(`[Admin Auth] Access granted to: ${decoded.email}`)

        return {
            uid: decoded.uid,
            email: decoded.email,
            displayName: decoded.name || null,
            isAdmin: true
        }
    } catch (err: any) {
        // Don't expose error details - just log and deny
        console.error("[Admin Auth] Token verification failed:", err.message)
        return null
    }
}

/**
 * Wrapper function for admin-only API routes
 * Returns a consistent 403 response for unauthorized access
 */
export function unauthorizedResponse() {
    return new Response(
        JSON.stringify({ error: "Forbidden" }),
        {
            status: 403,
            headers: { "Content-Type": "application/json" }
        }
    )
}
