import { generateLinkedInFormat, type LinkedInFormat } from "@/lib/ai"
import { computeCacheKey, getCachedOutput, setCachedOutput } from "@/lib/cache"
import { GenerateBody } from "@/lib/schemas/generate"

export class AiService {
    static async generateFormats(
        input: string,
        context: GenerateBody["context"],
        formats: string[],
        regenerate: boolean
    ) {
        // Default targetAudience if empty
        const targetAudience = context?.targetAudience?.trim() || "General LinkedIn users"
        const emojiOn = !!context?.emojiOn
        // Default to professional tone if not provided
        const tonePreset = context?.tonePreset || "professional"

        // Create resolved context with defaults for AI
        const resolvedContext = {
            ...context,
            targetAudience,
            tonePreset,
        }

        const outputs: Record<string, string> = {}
        const fromCache: Record<string, boolean> = {}

        for (const format of formats) {
            const cacheKey = computeCacheKey(
                input,
                resolvedContext,
                format,
                emojiOn,
                tonePreset
            )

            let output = null
            if (!regenerate) {
                output = await getCachedOutput(cacheKey)
            }

            if (output) {
                outputs[format] = output
                fromCache[format] = true
                continue
            }

            // Generate new content
            output = await generateLinkedInFormat(format as LinkedInFormat, input, resolvedContext, regenerate)
            outputs[format] = output
            fromCache[format] = false

            await setCachedOutput(
                cacheKey,
                output,
                "openai"
            )
        }

        return { outputs, fromCache }
    }
}
