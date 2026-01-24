import { z } from "zod"

export const GenerateBodySchema = z.object({
    inputType: z.enum(["text", "url"]),
    inputText: z.string().optional(),
    url: z.union([z.string().url(), z.literal("")]).optional(),
    context: z.object({
        readerContext: z.string().optional(),
        angle: z.string().optional(),
        tonePreset: z.enum(["professional", "conversational", "bold"]).optional(),
        emojiOn: z.boolean().optional(),
    }).optional(),
    formats: z.array(z.string()).min(1, "At least one format is required"),
    regenerate: z.boolean().optional(),
    saveHistory: z.boolean().optional(),
})

export type GenerateBody = z.infer<typeof GenerateBodySchema>
