"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { FormatKey, ToneType, MAX_INPUT_LENGTH_CREATOR, MAX_INPUT_LENGTH_FREE, READER_CONTEXT_OPTIONS, ANGLE_OPTIONS } from "./types"

interface InputSectionProps {
    plan: "free" | "creator" | null
    tab: "text" | "url"
    setTab: (tab: "text" | "url") => void
    inputText: string
    setInputText: (text: string) => void
    url: string
    setUrl: (url: string) => void
    readerContext: string
    setReaderContext: (context: string) => void
    angle: string
    setAngle: (angle: string) => void
    emojiOn: boolean
    setEmojiOn: (on: boolean) => void
    tonePreset: ToneType
    setTonePreset: (tone: ToneType) => void
    formats: Record<FormatKey, boolean>
    toggleFormat: (key: FormatKey) => void
    handleGenerate: () => Promise<void>
    canGenerate: boolean
    loading: boolean
    cooldown: number
    isLimitReached: boolean
}

export function InputSection({
    plan,
    tab,
    setTab,
    inputText,
    setInputText,
    url,
    setUrl,
    readerContext,
    setReaderContext,
    angle,
    setAngle,
    emojiOn,
    setEmojiOn,
    tonePreset,
    setTonePreset,
    formats,
    toggleFormat,
    handleGenerate,
    canGenerate,
    loading,
    cooldown,
    isLimitReached
}: InputSectionProps) {
    const router = useRouter()

    // Local state for "Custom" input visibility
    const [isCustomReader, setIsCustomReader] = useState(false)
    const [isCustomAngle, setIsCustomAngle] = useState(false)

    // Sync custom state with external props on mount/update if needed
    // If value is not in options and not empty, it's custom.
    useEffect(() => {
        if (readerContext && !READER_CONTEXT_OPTIONS.includes(readerContext as any)) {
            setIsCustomReader(true)
        }
        if (angle && !ANGLE_OPTIONS.includes(angle as any)) {
            setIsCustomAngle(true)
        }
    }, []) // Run once on mount to set initial state

    const handleReaderSelect = (val: string) => {
        if (val === "custom") {
            setIsCustomReader(true)
            setReaderContext("") // Clear for new input
        } else {
            setIsCustomReader(false)
            setReaderContext(val)
        }
    }

    const handleAngleSelect = (val: string) => {
        if (val === "custom") {
            setIsCustomAngle(true)
            setAngle("") // Clear for new input
        } else {
            setIsCustomAngle(false)
            setAngle(val)
        }
    }

    return (
        <div className="space-y-6">
            {/* Input card */}
            <Card className="border-stone-200 bg-white/70 backdrop-blur-xl shadow-sm rounded-[2rem] overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="border-b border-stone-100/50 pb-4">
                    <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs shadow-sm">1</div>
                        Input Source
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="flex gap-2 text-xs bg-stone-100/50 p-1.5 rounded-full w-fit">
                        <button
                            className={`rounded-full px-5 py-2 text-[11px] font-medium transition-all duration-300 ${tab === "text"
                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                                : "bg-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-200/50"
                                }`}
                            onClick={() => setTab("text")}
                        >
                            Paste Text
                        </button>
                        <button
                            className={`rounded-full px-5 py-2 text-[11px] font-medium transition-all duration-300 ${tab === "url"
                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                                : plan === "free"
                                    ? "bg-transparent text-stone-400 cursor-not-allowed opacity-60"
                                    : "bg-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-200/50"
                                }`}
                            onClick={() => {
                                if (plan === "free") {
                                    toast({
                                        title: "Upgrade required",
                                        description: "URL input is available on the Creator plan. Upgrade to unlock.",
                                        variant: "destructive",
                                    })
                                    return
                                }
                                setTab("url")
                            }}
                            disabled={plan === "free"}
                        >
                            Paste URL
                            {plan === "free" && (
                                <span className="ml-1 text-[10px] opacity-70">(Creator only)</span>
                            )}
                        </button>
                    </div>

                    {tab === "text" ? (
                        <div className="space-y-3">
                            <Label htmlFor="inputText" className="text-xs font-semibold text-stone-600 ml-1">
                                Content to repurpose
                            </Label>
                            <div className="relative group">
                                <Textarea
                                    id="inputText"
                                    value={inputText}
                                    onChange={(e) => {
                                        const maxLength = plan === "creator" ? MAX_INPUT_LENGTH_CREATOR : MAX_INPUT_LENGTH_FREE
                                        setInputText(e.target.value.slice(0, maxLength))
                                    }}
                                    rows={8}
                                    maxLength={plan === "creator" ? MAX_INPUT_LENGTH_CREATOR : MAX_INPUT_LENGTH_FREE}
                                    placeholder="Paste your article, newsletter, or long-form content here…"
                                    className="rounded-2xl border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none text-sm p-4 shadow-inner"
                                />
                                <div className="absolute bottom-3 right-3 text-[10px] text-stone-400 bg-white/50 backdrop-blur px-2 py-1 rounded-full border border-stone-100">
                                    {inputText.length}/{plan === "creator" ? MAX_INPUT_LENGTH_CREATOR : MAX_INPUT_LENGTH_FREE}
                                </div>
                            </div>
                        </div>
                    ) : plan === "free" ? (
                        <div className="space-y-4 rounded-3xl border border-stone-200 bg-stone-50/80 p-8 text-center backdrop-blur-sm">
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-stone-800">
                                    URL input is a Creator feature
                                </p>
                                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                                    Upgrade to unlock URL extraction, history saving, and higher limits.
                                </p>
                                <Button
                                    size="sm"
                                    className="mt-4 rounded-full bg-emerald-600 text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                                    onClick={() => router.push("/usage")}
                                >
                                    Upgrade to Creator
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Label htmlFor="url" className="text-xs font-semibold text-stone-600 ml-1">
                                Public URL (Medium, Notion, Google Doc)
                            </Label>
                            <Input
                                id="url"
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://"
                                className="h-11 rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm shadow-inner"
                            />
                            <p className="text-[11px] text-stone-500 ml-1">
                                Paste a publicly viewable article or doc. We&apos;ll extract
                                the readable content for you.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Context card - SIMPLIFIED */}
            <Card className="border-stone-200 bg-white/70 backdrop-blur-xl shadow-sm rounded-[2rem] overflow-hidden hover:shadow-md transition-all">
                <CardHeader className="border-b border-stone-100/50 pb-4">
                    <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs shadow-sm">2</div>
                        Context
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 pt-6">

                    {/* Field 1: Reader Context */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-stone-600 ml-1">
                            Who are you writing this for?
                        </Label>
                        {!isCustomReader ? (
                            <Select
                                value={READER_CONTEXT_OPTIONS.includes(readerContext as any) ? readerContext : ""}
                                onValueChange={handleReaderSelect}
                            >
                                <SelectTrigger className="h-11 rounded-xl border-stone-200 bg-stone-50/50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm shadow-sm transition-all hover:bg-stone-50">
                                    <SelectValue placeholder="Select target audience..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-stone-100 shadow-xl backdrop-blur-xl bg-white/90">
                                    {READER_CONTEXT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                    <SelectItem value="custom" className="font-semibold text-emerald-600 focus:text-emerald-700">Type my own...</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex gap-2">
                                <Input
                                    value={readerContext}
                                    onChange={(e) => setReaderContext(e.target.value)}
                                    placeholder="E.g. Real Estate Agents in NY..."
                                    className="h-11 rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-full text-sm shadow-inner"
                                    autoFocus
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setIsCustomReader(false)
                                        setReaderContext("")
                                    }}
                                    className="h-11 text-stone-400 hover:text-stone-600"
                                >
                                    Cancel
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Field 2: Angle */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-stone-600 ml-1">
                            What should this post focus on?
                        </Label>
                        {!isCustomAngle ? (
                            <Select
                                value={ANGLE_OPTIONS.includes(angle as any) ? angle : ""}
                                onValueChange={handleAngleSelect}
                            >
                                <SelectTrigger className="h-11 rounded-xl border-stone-200 bg-stone-50/50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm shadow-sm transition-all hover:bg-stone-50">
                                    <SelectValue placeholder="Select focus angle..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-stone-100 shadow-xl backdrop-blur-xl bg-white/90">
                                    {ANGLE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                    <SelectItem value="custom" className="font-semibold text-emerald-600 focus:text-emerald-700">Type my own...</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex gap-2">
                                <Input
                                    value={angle}
                                    onChange={(e) => setAngle(e.target.value)}
                                    placeholder="E.g. A counter-intuitive discovery about..."
                                    className="h-11 rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-full text-sm shadow-inner"
                                    autoFocus
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setIsCustomAngle(false)
                                        setAngle("")
                                    }}
                                    className="h-11 text-stone-400 hover:text-stone-600"
                                >
                                    Cancel
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Field 3: Tone & Emojis */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-stone-600 ml-1">
                                Writing tone
                            </Label>
                            <Select
                                value={tonePreset}
                                onValueChange={(v) => setTonePreset(v as any)}
                            >
                                <SelectTrigger className="h-11 rounded-xl border-stone-200 bg-stone-50/50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm shadow-sm transition-all hover:bg-stone-50">
                                    <SelectValue placeholder="Writing tone" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-stone-100 shadow-xl backdrop-blur-xl bg-white/90">
                                    <SelectItem value="professional">Professional</SelectItem>
                                    <SelectItem value="conversational">Conversational</SelectItem>
                                    <SelectItem value="bold">Bold</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-stone-600 ml-1">Emojis</Label>
                            <div className="flex items-center gap-3 text-xs text-stone-600 h-11 px-1">
                                <button
                                    type="button"
                                    onClick={() => setEmojiOn(!emojiOn)}
                                    className={`flex h-7 w-12 items-center rounded-full border px-1 transition-all duration-300 ${emojiOn
                                        ? "border-emerald-500 bg-emerald-500 shadow-emerald-200 shadow-md"
                                        : "border-stone-200 bg-stone-100"
                                        }`}
                                >
                                    <span
                                        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${emojiOn ? "translate-x-5" : "translate-x-0"
                                            }`}
                                    />
                                </button>
                                <span className="font-medium text-stone-500">{emojiOn ? "Enabled" : "Disabled"}</span>
                            </div>
                        </div>
                    </div>

                </CardContent>
            </Card>

            {/* Formats */}
            <Card className="border-stone-200 bg-white/70 backdrop-blur-xl shadow-sm rounded-[2rem] overflow-hidden hover:shadow-md transition-all">
                <CardHeader className="border-b border-stone-100/50 pb-4">
                    <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs shadow-sm">3</div>
                        What do you need right now?
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 pt-6">
                    {(
                        [
                            ["main-post", "Main LinkedIn post"],
                            ["story-based", "Story-style post"],
                            ["carousel", "Educational / carousel text"],
                            ["short-viral-hook", "Short hook post (scroll-stopping)"],
                        ] as [FormatKey, string][]
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => toggleFormat(key)}
                            className={`flex flex-col items-start rounded-2xl border px-4 py-3 text-left text-xs transition-all duration-200 ${formats[key]
                                ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/20"
                                : "border-stone-200 bg-white/50 text-stone-600 hover:border-emerald-200 hover:bg-emerald-50/30"
                                }`}
                        >
                            <span className="font-bold">{label}</span>
                        </button>
                    ))}
                </CardContent>
            </Card>

            <div className="flex justify-end pt-2">
                <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || cooldown > 0}
                    className="relative h-12 min-w-[180px] overflow-hidden rounded-full bg-emerald-600 px-8 text-sm font-semibold text-white shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 hover:bg-emerald-700 disabled:opacity-70"
                >
                    {loading && (
                        <span className="absolute inset-0 flex items-center justify-center bg-emerald-700">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        </span>
                    )}
                    {loading
                        ? "Generating…"
                        : isLimitReached
                            ? "Limit Reached"
                            : cooldown > 0
                                ? `Cooldown (${cooldown}s)`
                                : "Generate Content"}
                </Button>
            </div>
        </div>
    )
}
