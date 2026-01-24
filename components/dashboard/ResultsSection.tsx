"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { LinkedInPostPreview } from "@/components/features/linkedin-post-preview"
import { User } from "firebase/auth"
import { Loader2 } from "lucide-react"
import { FormatKey } from "./types"

interface ResultsSectionProps {
    results: Record<FormatKey, string>
    formats: Record<FormatKey, boolean>
    loading: boolean
    regeneratingFormat: FormatKey | null
    plan: "free" | "creator" | null
    editingFormats: Record<string, boolean>
    toggleEdit: (key: string) => void
    handleRegenerate: (key: FormatKey) => Promise<void>
    handleSwapHook: (key: FormatKey, hook: string) => void
    handleCopy: (text: string) => void
    responseHooks: Record<FormatKey, string[]>
    setResults: React.Dispatch<React.SetStateAction<Record<FormatKey, string>>>
    user: User | null
}

export function ResultsSection({
    results,
    formats,
    loading,
    regeneratingFormat,
    plan,
    editingFormats,
    toggleEdit,
    handleRegenerate,
    handleSwapHook,
    handleCopy,
    responseHooks,
    setResults,
    user
}: ResultsSectionProps) {
    const selectedFormats = (Object.keys(formats) as FormatKey[]).filter(
        (k) => formats[k]
    )

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-stone-800 pl-1">
                Outputs
            </h2>
            {selectedFormats.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[2.5rem] border border-stone-200 bg-white/50 p-12 text-center text-stone-400">
                    <p className="text-sm">Select a format to see preview</p>
                </div>
            ) : (
                selectedFormats.map((key) => {
                    const titleMap: Record<FormatKey, string> = {
                        "main-post": "Main LinkedIn post",
                        "story-based": "Story-style post",
                        "carousel": "Carousel text",
                        "short-viral-hook": "Short hook post",
                    }
                    const value = results[key] || ""
                    const charCount = value.length

                    // Don't show anything for this format if no content generated yet
                    if (!value) return null

                    return (
                        <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-bold text-stone-800">
                                    {titleMap[key]}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-medium text-stone-400 mr-2">{charCount} chars</span>
                                    {plan === "creator" && (
                                        <button
                                            type="button"
                                            onClick={() => handleRegenerate(key)}
                                            disabled={(!value || value.trim().length === 0) || loading}
                                            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-medium text-stone-600 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 flex items-center gap-1.5 min-w-[85px] justify-center"
                                        >
                                            {regeneratingFormat === key ? (
                                                <>
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    <span>Regenerating...</span>
                                                </>
                                            ) : (
                                                <span>Regenerate</span>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {editingFormats[key] ? (
                                <Card className="border-stone-200 bg-white/80 backdrop-blur-xl shadow-lg shadow-stone-200/50 rounded-[2rem] overflow-hidden transition-all hover:shadow-xl">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-stone-100 bg-white/50 px-6 py-4">
                                        <CardTitle className="text-sm font-bold text-stone-800">
                                            Edit Content
                                        </CardTitle>
                                        <button
                                            type="button"
                                            onClick={() => toggleEdit(key)}
                                            className="rounded-lg border border-stone-200 bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-emerald-700"
                                        >
                                            Done
                                        </button>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Textarea
                                            rows={Math.max(7, Math.ceil(charCount / 80))}
                                            value={value}
                                            onChange={(e) =>
                                                setResults((prev) => ({
                                                    ...prev,
                                                    [key]: e.target.value,
                                                }))
                                            }
                                            className="min-h-[160px] w-full resize-y border-0 bg-transparent p-6 text-sm text-stone-700 focus:ring-0 leading-relaxed"
                                            style={{ overflowY: 'auto' }}
                                            placeholder="Generated content will appear here..."
                                        />
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="flex justify-center py-2">
                                    <LinkedInPostPreview
                                        content={value}
                                        user={user}
                                        onEdit={() => toggleEdit(key)}
                                        onCopy={() => handleCopy(value)}
                                    />
                                </div>
                            )}

                            {/* Hook Variations */}
                            {!editingFormats[key] && responseHooks[key]?.length > 0 && (
                                <div className="mt-3 px-2">
                                    <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <span className="bg-emerald-100 text-emerald-600 rounded px-1 py-0.5">NEW</span>
                                        Alternative Hooks (Click to Swap)
                                    </p>
                                    <div className="grid gap-2">
                                        {responseHooks[key].map((hook, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSwapHook(key, hook)}
                                                className="text-left text-sm p-3 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white hover:border-emerald-200 hover:shadow-sm transition-all text-stone-700 group relative overflow-hidden"
                                            >
                                                <span className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <span className="font-medium text-emerald-600 mr-2 opacity-50 text-xs">#{i + 1}</span>
                                                {hook}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })
            )}
        </div>
    )
}
