import OpenAI from "openai"

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
You write LinkedIn posts the way experienced professionals do: concise, opinionated, and human. 
You avoid sounding instructional or academic. You prioritize flow and credibility over completeness.
You understand the importance of whitespace and how to hook a reader in the first 2 lines.

### NEGATIVE CONSTRAINTS
- Do NOT use generic AI intro phrases like "In today's landscape," "Unlock the potential," "Delve into," "Game-changer," "Tapestry," "Leverage," "Harness," "Unveil," "Navigate," "Embark on a journey," "In the realm of," "Master the art of," "Transform your," "Elevate your," "Unlock the power of," "Dive deep," "Let's explore," "Revolutionary," or "In today's fast-paced world."
- Do NOT use hashtags in the middle of sentences.
- Never mention the target audience name or group in the post directly. Write *for* them, not *at* them.
- Do NOT summarize the whole blog; focus only on the core value proposition.
- Do NOT use markdown bolding (like **text**) because LinkedIn does not support it. Use "quotes" for emphasis instead.`
}

function getFormatRules(format: LinkedInFormat): string {
  const rules: Record<LinkedInFormat, string> = {
    "thought-leadership": `
BODY STRUCTURE:
- Develop ONE strong idea or insight
- Support with reasoning, experience, or evidence
- Use 6–10 short lines total
- End with a reflective question or discussion CTA
TARGET LENGTH: 800–1200 characters
TONE: Confident, insightful, non-salesy
`,

    "story-based": `
BODY STRUCTURE:
- Describe the struggle or failure briefly
- Show the turning point (decision, realization, change)
- Explain the outcome or transformation
- End with a clear lesson or takeaway
STYLE:
- Human, vulnerable, first-person
- No motivational fluff
TARGET LENGTH: 1000–1500 characters
`,

    "educational-carousel": `
BODY STRUCTURE (SLIDE-BASED):
- Slide 1: Big cover title only
- Slides 2–5:
  - ONE concrete tip per slide
  - Bold headline + max 1 short sentence OR 2 bullets
  - Max 30 words per slide
- Final slide: Summary + CTA
IMPORTANT:
- Write as if each slide is read independently
TARGET LENGTH: 1200–1800 characters
`,

    "short-viral-hook": `
BODY STRUCTURE:
- Expand on ONE core insight only
- Use punchy, broken lines
- Optional bullets (max 3)
- End with a sharp CTA
STYLE:
- Fast-paced, minimalist
- No explanations, only implications
TARGET LENGTH: 400–800 characters
`
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

  const formatSpecificRules = getFormatRules(format)

  const regenerationInstruction = regenerate
    ? "CRITICAL: This is a retry. The previous output was rejected. You MUST write a completely different hook and angle. Choose a different mental angle or framing of the same idea. Do not simply paraphrase; shift the perspective."
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

### BONUS OUTPUT (MANDATORY)
After the main post, you MUST output a separator line exactly like this: "---EXTRA_HOOKS---" (ensure it is on a new line).
Then, list exactly 3 alternative hooks for this post.
- Format:
1. [Hook variation 1]
2. [Hook variation 2]
3. [Hook variation 3]
- Content: Just the opening hook (first 1-2 lines), not the full post.
- Variation: Ensure they use different angles (e.g., one direct, one story, one question).

### FINAL OUTPUT
Generate the LinkedIn post text, followed by the "---EXTRA_HOOKS---" separator and the numbered list of 3 hooks.`
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

async function generateWithOpenAI(options: GenerateOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set")
  }

  validateInput(options.inputText)

  const openai = new OpenAI({
    apiKey: apiKey,
  })

  const instructionPrompt = getInstructionPrompt(
    options.format,
    options.context,
    options.regenerate || false
  )
  const userPrompt = getUserPrompt(options.inputText)

  // OpenAI Chat Completion
  const systemPrompt = getSystemPrompt()
  const fullUserContent = `${instructionPrompt}\n\n${userPrompt}`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using gpt-4o-mini as requested
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullUserContent },
      ],
      temperature: 0.7, // Creative but controlled
      max_tokens: 2000, // Plenty of room for ~2900 chars
    })

    const text = response.choices[0].message.content

    if (!text || text.trim().length === 0) {
      throw new Error("Empty response from AI")
    }

    // Return FULL content - never trim or cut off
    return text.trim()
  } catch (error: any) {
    console.error("OpenAI generation error:", error)
    // User-friendly error mapping
    if (error.status === 429) {
      throw new Error("AI service is busy (Rate Limit). Please try again in a moment.")
    }
    if (error.status === 400) {
      throw new Error("The content could not be processed. Please check your input.")
    }
    if (error.code === 'context_length_exceeded') {
      throw new Error("Input is too long for the model to process.")
    }
    // Network errors or others
    if (error.message?.includes("timeout") || error.message?.includes("ETIMEDOUT")) {
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

  // Use the new OpenAI generator
  const generationPromise = generateWithOpenAI(options)

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
