import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

export function getNextMonthStart(): Date {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  nextMonth.setUTCHours(0, 0, 0, 0)
  return nextMonth
}

/**
 * Check localStorage for payment status within 20-second window
 * Returns the plan status if payment was completed within last 20 seconds, null otherwise
 */
export function getLocalStoragePaymentStatus(): "creator" | null {
  if (typeof window === "undefined") return null

  try {
    const stored = localStorage.getItem("paymentStatus")
    if (!stored) return null

    const { plan, timestamp } = JSON.parse(stored)
    const now = Date.now()
    const elapsed = now - timestamp

    // If within 2 minutes (120000ms), return the stored plan
    if (elapsed < 120000 && plan === "creator") {
      return "creator"
    } else {
      // Clear expired status
      localStorage.removeItem("paymentStatus")
      return null
    }
  } catch (err) {
    console.error("Error reading localStorage payment status:", err)
    return null
  }
}

/**
 * Store payment status in localStorage for 1-minute window
 */
export function setLocalStoragePaymentStatus(plan: "creator"): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem("paymentStatus", JSON.stringify({
      plan,
      timestamp: Date.now()
    }))
  } catch (err) {
    console.error("Error storing localStorage payment status:", err)
  }
}

/**
 * Clear payment status from localStorage
 */
export function clearLocalStoragePaymentStatus(): void {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem("paymentStatus")
  } catch (err) {
    console.error("Error clearing localStorage payment status:", err)
  }
}