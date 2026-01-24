// lib/ai/index.ts

import OpenAI from "openai"

/**
 * Supported LinkedIn Output Formats.
 * These map 1:1 with the defined format rules.
 */
export type LinkedInFormat =
  | "main-post"
  | "story-based"
  | "carousel"
  | "short-viral-hook"

/**
 * Context Interface.
 * Defines the strict set of inputs the AI considers.
 * - readerContext: Who is reading? (sets complexity/background)
 * - angle: What is the focus? (sets the core insight)
 * - emojiOn: Preference toggle
 * - tonePreset: Stylistic direction
 */
export interface GenerateContext {
  readerContext?: string
  angle?: string
  emojiOn?: boolean
  tonePreset?: "professional" | "conversational" | "bold"
}

export interface GenerateOptions {
  format: LinkedInFormat
  inputText: string
  context: GenerateContext
  regenerate?: boolean
}

// Input constants
// MAX_INPUT_CHARS protects the system from huge payloads.
const MAX_INPUT_CHARS = 20000
const MAX_OUTPUT_CHARS = 2900

function normalizeInput(inputText: string): string {
  let normalized = inputText.trim()
  normalized = normalized.replace(/[ \t]+/g, " ")
  normalized = normalized.replace(/\n\s*\n/g, "\n\n")
  return normalized
}

function validateInput(inputText: string): void {
  if (!inputText || inputText.trim().length === 0) {
    throw new Error("Input text cannot be empty")
  }
  const meaningfulContent = inputText.replace(/[\s\n\r\t]/g, "")
  if (meaningfulContent.length < 50) {
    throw new Error("Input text is too short. Please provide more content to repurpose.")
  }
  if (inputText.length > MAX_INPUT_CHARS) {
    throw new Error(`Input text exceeds maximum length of ${MAX_INPUT_CHARS} characters`)
  }
}

/**
 * Generates the System Prompt for the AI.
 * This prompt defines the persona and the core style guide.
 *
 * PROMPT STRATEGY:
 * We use a "Style Guide" approach (Positive Constraints) rather than
 * "Negative Constraints" (e.g., "Don't do X").
 * This guides the model effectively even with smaller models like gpt-4o-mini.
 */
function getSystemPrompt(): string {
  return `You are a skilled LinkedIn Ghostwriter.
You are an expert and professional linkedin ghostwriter who repurposes content into authentic, high-engagement LinkedIn posts.

STYLE GUIDE:
1. Human Tone: Vary sentence length. Short for impact, long for nuance.
2. Directness: Active voice only. No fluff words ("crucial", "landscape", "uncover").
3. Audience: Address "you" directly. Never say "everyone" or "folks".
4. Concrete: Use specific examples/metaphors, not abstract concepts.
5. Ending: Provoke discussion with a specific question. No lazy "thoughts?".
6. Hashtags: Add 3-5 relevant and top-trending hashtags at the end.`
}

/**
 * logical mapping of formats to their specific structural rules.
 */
function getFormatRules(format: LinkedInFormat): string {
  const rules: Record<LinkedInFormat, string> = {
    "main-post": `
OUTPUT TYPE: MAIN POST
- Length: 800-1200 characters
- Structure:
  - Strong hook (1-2 lines)
  - Clear insight or argument
  - Short supporting points
  - Reflective ending
- Style: Insightful, confident, clean.
`,
    "story-based": `
OUTPUT TYPE: STORY POST
- Length: 1000-1500 characters
- Structure:
  - The struggle/moment of failure (brief)
  - The realization (pivot)
  - The outcome or lesson
- Style: Vulnerable, first-person ("I"), narrative.
`,
    "carousel": `
OUTPUT TYPE: CAROUSEL TEXT (SLIDES)
- Length: 1200-1800 characters
- Structure:
  - Slide 1: Title only
  - Slides 2-5: One clear tip/idea per slide (max 30 words)
  - Final Slide: Summary
- Style: Punchy, educational, slide-by-slide.
`,
    "short-viral-hook": `
OUTPUT TYPE: SHORT VIRAL POST
- Length: 400-800 characters
- Structure:
  - Single sharp insight
  - Broken lines for readability
  - Fast pacing
- Style: Minimalist, provocative.
`
  }
  return rules[format]
}

function getInstructionPrompt(
  format: LinkedInFormat,
  context: GenerateContext,
  regenerate: boolean
): string {
  const { readerContext, angle, emojiOn, tonePreset } = context

  const emojiInstruction = emojiOn ? "ON (Use 1-5 naturally)" : "OFF (None)"

  const regenerationInstruction = regenerate
    ? "RETRY INSTRUCTION: The user rejected the previous output. \n1. Do NOT just paraphrase. \n2. Write a completely NEW hook (if you asked a question, make a statement). \n3. Make the tone 20% sharper/bolder."
    : ""

  const formatRules = getFormatRules(format)

  // "Internal Thinking" process to prevent generic summaries.
  // We ask the model to silently analyze before writing.
  const processInstructions = `PROCESS:
First, silently identify the strongest "Hook" and single "Core Insight".
Then, write the post based strictly on that angle. 
IMPORTANT: Output ONLY the final post. Do not reveal your analysis.`

  return `CONTEXT:
- Reader context: ${readerContext || "General LinkedIn readers"}
- Angle: ${angle || "Auto-detect best angle"}
- Tone: ${tonePreset || "Professional"}
- Emojis: ${emojiInstruction}

${regenerationInstruction}

${processInstructions}

${formatRules}

Formatting Constraints:
- NO markdown bold/italic (LinkedIn doesn't support it). Use "quotes" for emphasis.
- DO NOT start with a greeting like "Hey [Audience Name]". Start directly with the hook.
- Max 3 hashtags at the end (contexual, not generic).
- Use line breaks for readability.
- Total character limit: Under ${MAX_OUTPUT_CHARS} chars.

BONUS OUTPUT (Mandatory):
After the post, add a separator "---EXTRA_HOOKS---" and list exactly 5 alternative hooks:
1. Contrarian Hook: [Content]
2. Problem-first Hook: [Content]
3. Authority Hook: [Content]
4. Curiosity Hook: [Content]
5. Direct promise Hook: [Content]
(Just the first 2 lines for each hook).`
}

function getUserPrompt(inputText: string): string {
  const safeInput = inputText.replace(/"""/g, "'''")
  return `SOURCE CONTENT:
"""
${safeInput}
"""`
}

async function generateWithOpenAI(options: GenerateOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY not set")

  validateInput(options.inputText)

  const openai = new OpenAI({ apiKey })
  const systemPrompt = getSystemPrompt()
  const instructionPrompt = getInstructionPrompt(options.format, options.context, options.regenerate || false)
  const userPrompt = getUserPrompt(options.inputText)

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${instructionPrompt}\n\n${userPrompt}` }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const text = response.choices[0].message.content
    if (!text) throw new Error("Empty response from AI")
    return text.trim()
  } catch (error: any) {
    console.error("OpenAI generation error:", error)
    if (error.status === 429) throw new Error("AI service busy. Try again shortly.")
    if (error.status === 400) throw new Error("Content could not be processed.")
    throw new Error("AI generation failed.")
  }
}

/**
 * Main entry point for generating LinkedIn content.
 * Handles normalization, validation, and race-conditions (timeouts).
 *
 * @param format - The target LinkedIn post format
 * @param inputText - The raw source text
 * @param context - Configuration for tone, audience, etc.
 * @param regenerate - Whether this is a retry (triggers stricter prompts)
 */
export async function generateLinkedInFormat(
  format: LinkedInFormat,
  inputText: string,
  context: GenerateContext,
  regenerate?: boolean
): Promise<string> {
  const normalized = normalizeInput(inputText)
  if (normalized.length > MAX_INPUT_CHARS) {
    throw new Error(`Input too long (${normalized.length} chars).`)
  }

  // Timeout wrapper (60s)
  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error("AI generation timeout")), 60000)
  })

  return Promise.race([
    generateWithOpenAI({ format, inputText: normalized, context, regenerate }),
    timeoutPromise
  ])
}
