import { GoogleGenerativeAI } from "@google/generative-ai"

export type LinkedInFormat =
  | "thought-leadership"
  | "story-based"
  | "educational-carousel"
  | "short-viral-hook"

export interface GenerateContext {
  targetAudience?: string
  goal?: "engagement" | "leads" | "authority"
  style?: "thought-leader" | "storyteller" | "educator"
  emojiOn?: boolean
  tonePreset?: "professional" | "conversational" | "storytelling" | "educational"
}

export interface GenerateOptions {
  format: LinkedInFormat
  inputText: string
  context: GenerateContext
  regenerate?: boolean
}


// Input length guard
// Set to 20,000 to safely support Premium users (10k chars) + buffer
// Enforce the specific 5k vs 10k limits in route.ts before calling this
const MAX_INPUT_CHARS = 20000
const MAX_OUTPUT_CHARS = 2900

function normalizeInput(inputText: string): string {
  let normalized = inputText.trim()
  // Replace multiple spaces/tabs with single space (but keep newlines)
  normalized = normalized.replace(/[ \t]+/g, " ")
  // Ensure max 2 newlines (paragraph breaks)
  normalized = normalized.replace(/\n\s*\n/g, "\n\n")
  return normalized
}

function validateInput(inputText: string): void {
  if (!inputText || inputText.trim().length === 0) {
    throw new Error("Input text cannot be empty")
  }

  // Check for meaningful content (not just whitespace/special chars)
  const meaningfulContent = inputText.replace(/[\s\n\r\t]/g, "")
  if (meaningfulContent.length < 50) {
    throw new Error("Input text is too short. Please provide more content to repurpose.")
  }

  if (inputText.length > MAX_INPUT_CHARS) {
    throw new Error(`Input text exceeds maximum length of ${MAX_INPUT_CHARS} characters`)
  }
}

function getSystemPrompt(): string {
  return `### SYSTEM ROLE
You are an expert LinkedIn Ghostwriter and Content Strategist. 
You specialize in taking long-form content and condensing it into high-viral, scroll-stopping LinkedIn posts. 
You understand the "broetry" style, the importance of whitespace, and how to hook a reader in the first 2 lines.

### NEGATIVE CONSTRAINTS (CRITICAL)
- Do NOT use generic AI intro phrases like "In today's landscape," "Unlock the potential," "Delve into," "Game-changer," "Tapestry," "Leverage," "Harness," "Unveil," "Navigate," "Embark on a journey," "In the realm of," "Master the art of," "Transform your," "Elevate your," "Unlock the power of," "Dive deep," "Let's explore," "Revolutionary," or "In today's fast-paced world."
- Do NOT use hashtags in the middle of sentences.
- Do not mention the target audience name or group in the post. NEVER! Use them to understand - for which kind of audience are you writing the post, so that they may get attracted by that post severely.
- Do NOT summarize the whole blog; focus only on the core value proposition.
- Do NOT use emojis excessively; use them sparingly as bullet points or emphasis only.
- Do NOT use markdown bolding (like **text**) because LinkedIn does not support it. Use "quotes" for emphasis instead.
- Write like a real LinkedIn creator would write. Use natural, conversational language.`
}

function getFormatRules(format: LinkedInFormat, emojiOn: boolean): string {
  const rules: Record<LinkedInFormat, string> = {
    "thought-leadership": `Target: 800-1200 characters. Structure: Strong/Contrarian hook → Support → Question/CTA.`,
    "story-based": `Target: 1000-1500 characters. Structure: Personal hook → Narrative arc (setup/conflict/resolution) → Takeaway.`,
    "educational-carousel": `Target: 1200-1800 characters. Structure: Numbered points (max 6) with ${emojiOn ? "emojis" : "numbers"}. Each point = one slide.`,
    "short-viral-hook": `Target: Under 500 characters. Structure: One hook line → One insight → One CTA.`,
  }
  return rules[format]
}

function getInstructionPrompt(
  format: LinkedInFormat,
  context: GenerateContext,
  regenerate: boolean
): string {
  const { targetAudience, goal, style, emojiOn, tonePreset } = context

  // Map internal values to readable strings for the prompt
  const goalText =
    goal === "leads"
      ? "Get leads/sales"
      : goal === "authority"
        ? "Build Authority"
        : "Get viral engagement"

  const toneText = tonePreset || "Professional yet conversational"
  const audienceText = targetAudience || "General Professionals"

  const formatSpecificRules = getFormatRules(format, !!emojiOn)

  const regenerationInstruction = regenerate
    ? "CRITICAL: This is a retry. The previous output was rejected. You MUST write a completely different hook and angle."
    : ""

  const emojiInstruction = emojiOn
    ? "Use 1-3 relevant emojis strategically placed in a moderate and professional way. Emojis should enhance the message, not distract from it. Place them naturally within the content where they add value."
    : "Do not use emojis."

  return `### INPUT DATA
**Target Audience:** ${audienceText}
**Primary Goal:** ${goalText}
**Post Style:** ${style || "Engaging"}
**Tone:** ${toneText}
**Output Format:** ${format.replace(/-/g, " ")}
**Emojis:** ${emojiInstruction}

${regenerationInstruction}

### INSTRUCTIONS
Your task is to repurpose the SOURCE CONTENT provided by the user into a LinkedIn post based strictly on the INPUT DATA above.

Follow these execution steps:
1. **Analyze:** Read the source content and identify the single most valuable insight that aligns with the Audience's pain points.
2. **The Hook:** Write a "scroll-stopping" first line. It must be punchy, under 15 words, and create immediate curiosity.
3. **Drafting:** Write the post body.
   - Use short, punchy sentences.
   - Use line breaks between almost every sentence (mobile optimization).
   - Remove fluff. If a sentence doesn't add value, delete it.
4. **Formatting:** Apply the specific rules below:
${formatSpecificRules}
5. **Call to Action (CTA):** End with a specific question or instruction that drives the Goal.

### FORMATTING RULES (STRICT)
- CRITICAL: LinkedIn does NOT support markdown formatting. Do NOT use asterisks (*) for bold, underscores (_) for italic, or any markdown symbols. These will appear as literal characters and look unprofessional.
- You CAN use lists (numbered or bulleted with plain text), double quotes, and line breaks - these are all plain text formatting that works on LinkedIn.
- Hashtags (if used): Maximum 3 hashtags at the end. Choose hashtags based ONLY on the actual content topics and themes, NOT based on the selected options (goal, style, format). Use the most popular and relevant hashtags that match the content's core topics.
- Character limit: Maximum ${MAX_OUTPUT_CHARS} characters (including spaces and newlines). Keep it under this limit.

### FINAL OUTPUT
Generate ONLY the LinkedIn post text. Do not include the "Hook variations" or analysis in the final output, just the final ready-to-post content.`
}

function getUserPrompt(inputText: string): string {
  // Input is already normalized before this function is called
  // Prevent user from breaking out of the content block by escaping triple quotes
  const safeInput = inputText.replace(/"""/g, "'''")
  return `### SOURCE CONTENT
"""
${safeInput}
"""`
}

async function generateWithGemini(options: GenerateOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set")
  }

  validateInput(options.inputText)

  const genAI = new GoogleGenerativeAI(apiKey)
  // Use gemini-2.5-flash for faster, cost-effective generation
  // Alternative: "gemini-2.5-pro" for higher quality (slower, more expensive)
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: getSystemPrompt() // Use native systemInstruction for better adherence
  } as any) // Type assertion needed as types may not be fully up to date

  const instructionPrompt = getInstructionPrompt(
    options.format,
    options.context,
    options.regenerate || false
  )
  const userPrompt = getUserPrompt(options.inputText)

  // Combine instruction and user prompts (system prompt is handled via systemInstruction)
  const fullPrompt = `${instructionPrompt}

${userPrompt}`

  try {
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()

    if (!text || text.trim().length === 0) {
      throw new Error("Empty response from AI")
    }

    // Return FULL content - never trim or cut off
    // AI is instructed to stay under MAX_OUTPUT_CHARS, but we show complete response
    // The app waits for full AI response before displaying
    return text.trim() // Only trim leading/trailing whitespace, never cut content
  } catch (error: any) {
    console.error("Gemini generation error:", error)
    // User-friendly error mapping
    if (error.message?.includes("quota") || error.message?.includes("429") || error.message?.includes("rate limit")) {
      throw new Error("AI service is busy (Rate Limit). Please try again in a moment.")
    }
    if (error.message?.includes("candidate") || error.message?.includes("safety")) {
      throw new Error("The content could not be processed due to safety guidelines.")
    }
    if (error.message?.includes("timeout") || error.message?.includes("deadline")) {
      throw new Error("Request timed out. Please try again.")
    }
    throw new Error("AI generation failed. Please try again.")
  }
}

export async function generateLinkedInFormat(
  format: LinkedInFormat,
  inputText: string,
  context: GenerateContext,
  regenerate?: boolean
): Promise<string> {
  const normalized = normalizeInput(inputText)

  // We check length here to protect the Engine.
  // NOTE: Your route.ts MUST check the 5k/10k limit before calling this!
  if (normalized.length > MAX_INPUT_CHARS) {
    throw new Error(`Input text is too long (${normalized.length} chars). Max allowed is ${MAX_INPUT_CHARS}.`)
  }

  validateInput(normalized)

  const options: GenerateOptions = {
    format,
    inputText: normalized, // Don't truncate - route.ts handles limits
    context,
    regenerate,
  }

  // Timeout wrapper
  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error("AI generation timeout")), 60000) // 60s timeout
  })

  const generationPromise = generateWithGemini(options)

  try {
    return await Promise.race([generationPromise, timeoutPromise])
  } catch (error: any) {
    // Wrap timeout errors in user-safe messages
    if (error.message?.includes("timeout")) {
      throw new Error("Request timed out. Please try again.")
    }
    // Re-throw other errors (they're already user-safe from the generator functions)
    throw error
  }
}
