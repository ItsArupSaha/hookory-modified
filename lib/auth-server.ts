import { Timestamp } from "firebase-admin/firestore"
import { NextRequest } from "next/server"
import { adminAuth, adminDb } from "./firebase/admin"
import { getNextMonthStart } from "./utils"

export type PlanType = "free" | "creator"

export interface UserDoc {
  email: string | null
  displayName: string | null
  plan: PlanType
  emailVerified: boolean
  usageCount: number
  usageLimitMonthly: number
  usageResetAt: Timestamp
  lastGenerateAt?: Timestamp
  lemonSqueezyCustomerId?: string
  lemonSqueezySubscriptionId?: string
  lemonSqueezyStatus?: string
  lemonSqueezyCustomerEmail?: string
  subscriptionPeriodStart?: Timestamp | null
  subscriptionPeriodEnd?: Timestamp | null
  planStartsAt?: Timestamp | null
  planExpiresAt?: Timestamp | null
  welcomeEmailSent?: boolean
  welcomeEmailSentAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface AuthedUser {
  uid: string
  firebaseUser: any
  userDoc: UserDoc
}

export async function getUserFromRequest(req: NextRequest): Promise<AuthedUser | null> {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) return null

  try {
    const decoded = await adminAuth.verifyIdToken(token)
    const uid = decoded.uid
    const email = decoded.email ?? null
    const displayName = decoded.name ?? null
    const emailVerified = decoded.email_verified ?? false

    const userRef = adminDb.collection("users").doc(uid)
    const snap = await userRef.get()
    const now = new Date()

    if (!snap.exists) {
      const usageResetAtDate = getNextMonthStart()
      const doc: UserDoc = {
        email,
        displayName,
        plan: "free",
        emailVerified,
        usageCount: 0,
        usageLimitMonthly: 5,
        usageResetAt: Timestamp.fromDate(usageResetAtDate),
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      }
      await userRef.set(doc)

      // Welcome email is now sent when user first clicks Dashboard button
      // See /api/welcome-email endpoint

      return { uid, firebaseUser: decoded, userDoc: doc }
    }

    const data = snap.data() as UserDoc
    // Keep email + verification in sync
    const updated: Partial<UserDoc> = {}
    if (data.email !== email) updated.email = email
    if (data.displayName !== displayName) updated.displayName = displayName
    if (data.emailVerified !== emailVerified) updated.emailVerified = emailVerified
    if (Object.keys(updated).length > 0) {
      updated.updatedAt = Timestamp.fromDate(now)
      await userRef.update(updated)
    }

    return { uid, firebaseUser: decoded, userDoc: { ...data, ...updated } as UserDoc }
  } catch (err) {
    console.error("Auth error:", err)
    return null
  }
}

