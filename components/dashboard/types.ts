export type FormatKey =
    | "thought-leadership"
    | "story-based"
    | "educational-carousel"
    | "short-viral-hook"

export const MAX_INPUT_LENGTH_FREE = 8000
export const MAX_INPUT_LENGTH_CREATOR = 15000

export type GoalType = "engagement" | "leads" | "authority" | ""
export type StyleType = "thought-leader" | "storyteller" | "educator" | ""
export type ToneType = "professional" | "conversational" | "storytelling" | "educational" | ""

export interface RepurposeState {
    tab: "text" | "url"
    inputText: string
    url: string
    targetAudience: string
    goal: GoalType
    style: StyleType
    emojiOn: boolean
    tonePreset: ToneType
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
