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
 * System Prompt: opinionated, minimal, high-leverage for gpt-4o-mini.
 * Key upgrades:
 * - Forces source-anchored writing (prevents generic "leadership wisdom").
 * - Prevents invented personal stories when source is technical.
 * - Enforces "one failure pattern" (angle) without repeating a template phrase.
 */
function getSystemPrompt(): string {
  return `You are Hookory, a LinkedIn editor and ghostwriter.
You repurpose provided source content into one LinkedIn post that feels human, specific, and worth reading.

NON-NEGOTIABLES:
- Stay grounded in the SOURCE. Use at least 2 concrete details from it (tools, steps, numbers, terms, constraints).
- Do not invent facts. If the source is technical/instructional, do NOT fabricate a personal launch story or fake "my project" narrative.
- Pick ONE central angle and keep every paragraph aligned to it (no multi-topic summaries).
- Write for how LinkedIn is read: short lines, clear beats, zero filler.
- Emojis are acceptable when explicitly requested by context and should be treated as part of tone, not decoration.
- Reading level: simple, direct, grade 6–8. Prefer short common words.
- Avoid generic moralizing (e.g., "human side", "connection", "crucial", "unlock", "game-changer") unless the source explicitly supports it.

HOOK QUALITY:
- The first 2 lines must create tension using a concrete element from the source (not generic life advice).
- A great hook makes the reader feel: "Wait—how can that be true?"

ENDING:
- End with a specific, high-signal question that fits the angle and audience (no "thoughts?").
- 3–5 relevant hashtags max, only if truly relevant to the source.`
}

/**
 * Format rules (BODY behavior only). Hooks are enforced globally in system/process.
 */
function getFormatRules(format: LinkedInFormat): string {
  const rules: Record<LinkedInFormat, string> = {
    "main-post": `
OUTPUT TYPE: MAIN POST
Target length: 900–1600 characters.
Body shape:
- After the hook, state the core point fast (1–2 short lines).
- Add 2–4 tight supporting lines (evidence/steps/contrast), grounded in the source.
- End with a specific question tied to the core point.
`,
    "story-based": `
OUTPUT TYPE: STORY-STYLE POST
Target length: 1100–1900 characters.
Body shape:
- Open with a concrete failure / contradiction / surprise from the source.
- Build tension: what people assume vs what happens.
- Turning point: the key insight (still grounded in the source).
- Outcome: what changes when you apply it (keep realistic, no fake metrics).
- End with a sharp decision question.
Important:
- If the source is not personal, write as: "I used to assume..." only if it can be reasonably inferred.
  Otherwise write as an observer: "Here's the trap…" / "Most teams do X…"
`,
    "carousel": `
OUTPUT TYPE: CAROUSEL TEXT (SLIDES)
Target length: 1200–2200 characters.
Rules:
- Write as SLIDES with clear separators (e.g., "Slide 1:", "Slide 2:", etc.)
- Slide 1: big cover title only (6–10 words).
- Slides 2–5: ONE concrete point each. Max 30 words per slide.
- Final slide: short recap + one strong question.
`,
    "short-viral-hook": `
OUTPUT TYPE: SHORT HOOK POST
Target length: 450–850 characters.
Body shape:
- Hook (2 lines) based on a concrete source detail.
- 2–3 short lines expanding the single insight.
- Optional bullets (max 3) if it improves clarity.
- End with a sharp question.
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

  const emojiInstruction = emojiOn ? "Required (2–5). Usage is mandatory. Use relevantly to enhance meaning. Place at natural breaks." : "Do not use emojis"

  const regenerationInstruction = regenerate
    ? `RETRY MODE:
- Write a genuinely different hook + framing (not a paraphrase).
- Change the entry point (e.g., if previous hook was a question, use a blunt statement or contrast).
- Make it 15–25% sharper and more specific (more source detail, less abstraction).`
    : ""

  const formatRules = getFormatRules(format)

  /**
   * Critical upgrade: force a silent extraction step that:
   * - selects a single failure pattern/assumption from the source
   * - selects concrete anchors so it cannot drift into generic advice
   * - keeps the "angle" enforced without repeating "the mistake is..."
   */
  const process = `PROCESS (silent, do not output):
1) Pick ONE failure pattern from the source (assumption → consequence). If angle is provided, use it as the lens.
2) Extract 3 "SOURCE ANCHORS" (specific terms/steps/tools/numbers). You must use at least 2 in the post.
3) Decide the best reader takeaway for the chosen reader context.

WRITE (output only the post):
- Do NOT name the angle explicitly with template phrases (avoid "the common mistake is...").
- Instead, make the angle obvious through examples, contrast, and repeated reinforcement in different wording.
- Keep paragraphs to max 2 lines each.
- No markdown styling.`

  // Reader context guidance (lightweight, not persona-theatre)
  const readerGuidance = (() => {
    const rc = (readerContext || "").toLowerCase()
    if (rc.includes("decision")) {
      return `READER CONTEXT NOTE:
Write for decision-makers: frame as trade-offs, risk, cost of wrong priorities, and operational reality. Avoid emotional self-help tone.`
    }
    if (rc.includes("learner") || rc.includes("student")) {
      return `READER CONTEXT NOTE:
Write for learners: be slightly more explanatory, but still skimmable.`
    }
    if (rc.includes("peer")) {
      return `READER CONTEXT NOTE:
Write for peers: assume baseline familiarity, be concise, no hand-holding.`
    }
    return `READER CONTEXT NOTE:
Write for general LinkedIn readers: simple language, fast clarity.`
  })()

  // Angle note (kept subtle: lens, not literal)
  const angleNote = angle
    ? `ANGLE LENS:
Use this lens to choose what matters and what to ignore: "${angle}".`
    : `ANGLE LENS:
Auto-pick the strongest single lens from the source. Ignore the rest.`

  return `CONTEXT:
- Reader: ${readerContext || "General LinkedIn readers"}
- Tone: ${tonePreset || "professional"}
- Emojis: ${emojiInstruction}
${angleNote}

${readerGuidance}

${regenerationInstruction}

${process}

${formatRules}

OUTPUT CONSTRAINTS:
- Total length must be under ${MAX_OUTPUT_CHARS} characters.
- Hashtags: 0–5 at the end, only if relevant to the source.
- Emojis: ${emojiInstruction}

BONUS OUTPUT (Mandatory):
After the post, add a separator "---EXTRA_HOOKS---" and list exactly 5 alternative hooks.
Rules for extra hooks:
- Each hook must be grounded in a concrete source anchor (no generic life advice).
- Each hook must be 1–2 lines max.
Format exactly (just the text, no labels):
1. ...
2. ...
3. ...
4. ...
5. ...`
}

function getUserPrompt(inputText: string): string {
  const safeInput = inputText.replace(/"""/g, "'''")
  // Inject explicit entropy to prevent cache/determinism loops
  const entropy = `Generation Timestamp: ${Date.now()}`

  return `SOURCE CONTENT:
"""
${safeInput}
"""

---
User Metadata (Ignore for content, but use for sampling):
${entropy}`
}

async function generateWithOpenAI(options: GenerateOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY not set")

  validateInput(options.inputText)

  const openai = new OpenAI({ apiKey })
  const systemPrompt = getSystemPrompt()
  const instructionPrompt = getInstructionPrompt(
    options.format,
    options.context,
    options.regenerate || false
  )
  const userPrompt = getUserPrompt(options.inputText)

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${instructionPrompt}\n\n${userPrompt}` }
      ],
      // Slightly lower temp = less generic motivational drift
      temperature: 0.6,
      max_tokens: 1800
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
