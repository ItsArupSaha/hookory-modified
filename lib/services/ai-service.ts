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
        /**
         * 1. Prepare Defaults
         * We ensure essential fields like tone have a fallback.
         */
        const tonePreset = context?.tonePreset || "professional"
        const emojiOn = !!context?.emojiOn // Restored missing variable

        /**
         * 2. Build Resolved Context
         * This object aligns with the GenerateContext interface required by the AI engine.
         * It strips away any legacy fields and focuses on the 4 core drivers (Reader, Angle, Tone, Emoji).
         */
        const resolvedContext = {
            ...context,
            tonePreset,
            readerContext: context?.readerContext,
            angle: context?.angle,
            emojiOn // Explicitly pass it
        }

        const outputs: Record<string, string> = {}
        const fromCache: Record<string, boolean> = {}

        /**
         * 3. Process Each Format
         * We iterate through requested formats (e.g., 'main-post', 'carousel') and generate/fetch content.
         */
        for (const format of formats) {
            // Compute unique cache key based on inputs + logic parameters
            const cacheKey = computeCacheKey(
                input,
                resolvedContext,
                format,
                emojiOn,
                tonePreset
            )

            let output = null
            // DISABLE CACHE: User wants fresh output for every token spent.
            // if (!regenerate) {
            //    output = await getCachedOutput(cacheKey)
            // }

            if (output) {
                outputs[format] = output
                fromCache[format] = true
                continue
            }

            /**
             * 4. Generate Content (Cache Miss)
             * Call the AI engine with the resolved context.
             */
            output = await generateLinkedInFormat(format as LinkedInFormat, input, resolvedContext, regenerate)
            outputs[format] = output
            fromCache[format] = false

            // Cache the result for future identical requests
            await setCachedOutput(
                cacheKey,
                output,
                "openai"
            )
        }

        return { outputs, fromCache }
    }
}
