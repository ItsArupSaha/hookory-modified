import { extractTextFromUrl } from "@/lib/url-extractor"
import { adminDb } from "@/lib/firebase/admin"
import { Timestamp } from "firebase-admin/firestore"
import { MAX_INPUT_LENGTH_CREATOR, MAX_INPUT_LENGTH_FREE } from "./user-service"

export class ContentService {
    static async extract(inputType: "text" | "url", inputText?: string, url?: string, isPaid = false) {
        let finalInputText = ""
        const maxInputLength = isPaid ? MAX_INPUT_LENGTH_CREATOR : MAX_INPUT_LENGTH_FREE

        if (inputType === "url") {
            if (!url) {
                throw new Error("URL is required.")
            }
            try {
                finalInputText = await extractTextFromUrl(url)
                if (finalInputText.length > maxInputLength) {
                    finalInputText = finalInputText.slice(0, maxInputLength)
                }
            } catch (extractError: any) {
                console.error("URL extraction failed:", extractError)
                throw new Error(extractError.message || "Failed to extract content from URL. Please try copying the content directly.")
            }
        } else {
            if (!inputText || inputText.trim().length === 0) {
                throw new Error("Input text is required.")
            }
            if (inputText.length > maxInputLength) {
                throw new Error(`Input too long. Maximum ${maxInputLength} characters for ${isPaid ? "Creator" : "Free"} plan. Upgrade to Creator plan for ${MAX_INPUT_LENGTH_CREATOR} characters.`)
            }
            finalInputText = inputText
        }

        return finalInputText
    }
}

export class HistoryService {
    static async log(uid: string, inputText: string, context: any, formats: string[], outputs: Record<string, string>, isPaid: boolean) {
        if (!isPaid) return

        // Truncate input text if needed for storage
        const maxStoredLength = MAX_INPUT_LENGTH_CREATOR

        const jobRef = adminDb.collection("jobs").doc()
        const now = Timestamp.now()
        await jobRef.set({
            userId: uid,
            inputText: inputText.length > maxStoredLength ? inputText.slice(0, maxStoredLength) : inputText,
            context,
            formatsSelected: formats,
            outputs,
            createdAt: now,
        })
    }
}
