export type FormatKey =
    | "main-post"
    | "story-based"
    | "carousel"
    | "short-viral-hook"

export const MAX_INPUT_LENGTH_FREE = 8000
export const MAX_INPUT_LENGTH_CREATOR = 15000

// Simplified Context Types
export type ToneType = "professional" | "conversational" | "bold"

// Presets (for UI)
export const READER_CONTEXT_OPTIONS = [
    "Peers in my field",
    "People learning this topic",
    "Decision-makers / leaders",
    "General LinkedIn audience"
] as const

export const ANGLE_OPTIONS = [
    "Lesson learned",
    "Common mistake",
    "Strong opinion",
    "Practical framework",
    "Personal insight / story",
    "Let Hookory choose"
] as const

export interface RepurposeState {
    tab: "text" | "url"
    inputText: string
    url: string

    // New simplified context
    readerContext: string // Can be preset or custom
    angle: string         // Can be preset or custom
    tonePreset: ToneType
    emojiOn: boolean

    // Removed: goal, style, targetAudience (old)

    formats: Record<FormatKey, boolean>
    loading: boolean
    cooldown: number
    results: Record<FormatKey, string>
    plan: "free" | "creator" | null
    usageCount: number | null
    usageLimitMonthly: number | null
    responseHooks: Record<FormatKey, string[]>
    regeneratingFormat: FormatKey | null
    editingFormats: Record<string, boolean>
}
