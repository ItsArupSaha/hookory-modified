"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { auth } from "@/lib/firebase/client"
import { User } from "firebase/auth"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LinkedInPostPreview } from "@/components/linkedin-post-preview"

type FormatKey =
    | "thought-leadership"
    | "story-based"
    | "educational-carousel"
    | "short-viral-hook"

const MAX_INPUT_LENGTH_FREE = 5000
const MAX_INPUT_LENGTH_CREATOR = 10000

export default function NewRepurposePage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [tab, setTab] = useState<"text" | "url">("text")
    const [inputText, setInputText] = useState("")
    const [url, setUrl] = useState("")
    const [targetAudience, setTargetAudience] = useState("")
    const [goal, setGoal] = useState<"engagement" | "leads" | "authority" | "">("engagement") // Default: "Start conversations"
    const [style, setStyle] = useState<"thought-leader" | "storyteller" | "educator" | "">("thought-leader") // Default: "Opinion & insight"
    const [emojiOn, setEmojiOn] = useState(false)
    const [tonePreset, setTonePreset] = useState<
        "professional" | "conversational" | "storytelling" | "educational" | ""
    >("professional")
    const [formats, setFormats] = useState<Record<FormatKey, boolean>>({
        "thought-leadership": true,
        "story-based": false,
        "educational-carousel": false,
        "short-viral-hook": false,
    })
    // Track which formats are in "Edit Mode"
    const [editingFormats, setEditingFormats] = useState<Record<string, boolean>>({})

    const [loading, setLoading] = useState(false)
    const [cooldown, setCooldown] = useState(0)
    const [results, setResults] = useState<Record<FormatKey, string>>({
        "thought-leadership": "",
        "story-based": "",
        "educational-carousel": "",
        "short-viral-hook": "",
    })
    const [plan, setPlan] = useState<"free" | "creator" | null>(null)
    const [usageCount, setUsageCount] = useState<number | null>(null)
    const [usageLimitMonthly, setUsageLimitMonthly] = useState<number | null>(null)

    // Store parsed hooks separately
    const [responseHooks, setResponseHooks] = useState<Record<FormatKey, string[]>>({
        "thought-leadership": [],
        "story-based": [],
        "educational-carousel": [],
        "short-viral-hook": [],
    })

    useEffect(() => {
        async function loadMe() {
            if (!auth) return
            const currentUser = auth.currentUser
            if (!currentUser) return
            setUser(currentUser)
            try {
                const token = await currentUser.getIdToken()
                const res = await fetch("/api/me", {
                    headers: { Authorization: `Bearer ${token}` },
                })
                const data = await res.json()
                if (res.ok) {
                    setPlan(data.plan as "free" | "creator")
                    setUsageCount(data.usageCount ?? 0)
                    setUsageLimitMonthly(data.usageLimitMonthly ?? 5)
                }
            } catch {
                // non-critical
            }
        }
        loadMe()
    }, [])

    // If free user is on URL tab, switch to text tab
    useEffect(() => {
        if (plan === "free" && tab === "url") {
            setTab("text")
        }
    }, [plan, tab])

    const selectedFormats = (Object.keys(formats) as FormatKey[]).filter(
        (k) => formats[k]
    )

    const isLimitReached = usageCount !== null && usageLimitMonthly !== null && usageCount >= usageLimitMonthly

    const canGenerate =
        selectedFormats.length > 0 &&
        (tab === "text"
            ? inputText.trim().length > 0
            : url.trim().length > 0) &&
        !loading &&
        !isLimitReached

    async function getUserAndToken(): Promise<{ user: User; token: string } | null> {
        if (!auth) return null
        const user = auth.currentUser
        if (!user) {
            router.push("/login")
            return null
        }
        const token = await user.getIdToken()
        return { user, token }
    }

    async function handleGenerate() {
        if (!canGenerate) return
        setLoading(true)
        try {
            const userInfo = await getUserAndToken()
            if (!userInfo) return
            setUser(userInfo.user)

            const res = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${userInfo.token}`,
                },
                body: JSON.stringify({
                    inputType: tab === "text" ? "text" : "url",
                    inputText,
                    url,
                    context: {
                        targetAudience: targetAudience.trim() || undefined,
                        goal: (goal || undefined) as any,
                        style: (style || undefined) as any,
                        emojiOn,
                        tonePreset: (tonePreset || undefined) as any,
                    },
                    formats: selectedFormats,
                    regenerate: false,
                    saveHistory: true,
                    // If we want the preview to be the initial state, we don't need to do anything special here
                    // as editingFormats defaults to false (preview mode)
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                if (res.status === 402) {
                    // Limit reached - button is already disabled and message is shown at top
                    // Refresh usage data to update the UI
                    const userInfo = await getUserAndToken()
                    if (userInfo) {
                        const meRes = await fetch("/api/me", {
                            headers: { Authorization: `Bearer ${userInfo.token}` },
                        })
                        if (meRes.ok) {
                            const meData = await meRes.json()
                            setUsageCount(meData.usageCount ?? 0)
                            setUsageLimitMonthly(meData.usageLimitMonthly ?? 5)
                        }
                    }
                    return
                }
                if (res.status === 403 || res.status === 429) {
                    toast({
                        title: "Please wait",
                        description: data.error || "Try again in a bit.",
                        variant: "destructive",
                    })
                    if (typeof data.secondsRemaining === "number") {
                        setCooldown(data.secondsRemaining)
                    }
                    return
                }
                throw new Error(data.error || "Failed to generate")
            }

            const outputs = data.outputs as Record<string, string>

            // Parse content and hooks
            const ParsedResults = { ...results }
            const ParsedHooks = { ...responseHooks }

            Object.entries(outputs).forEach(([k, text]) => {
                const key = k as FormatKey
                if (text.includes("---EXTRA_HOOKS---")) {
                    const parts = text.split("---EXTRA_HOOKS---")
                    ParsedResults[key] = parts[0].trim()

                    const hookSection = parts[1].trim()
                    // Extract numbered lines 1. 2. 3.
                    const hooks = hookSection
                        .split("\n")
                        .map(line => line.trim())
                        .filter(line => /^\d+\./.test(line))
                        .map(line => line.replace(/^\d+\.\s*/, "").replace(/^"/, "").replace(/"$/, "").trim())
                        .slice(0, 3) // Ensure max 3

                    ParsedHooks[key] = hooks
                } else {
                    ParsedResults[key] = text
                    ParsedHooks[key] = []
                }
            })

            setResults(ParsedResults)
            setResponseHooks(ParsedHooks)
            toast({
                title: "Generated",
                description: "Your LinkedIn formats are ready.",
            })
            // Refresh usage data after successful generation
            if (userInfo) {
                const meRes = await fetch("/api/me", {
                    headers: { Authorization: `Bearer ${userInfo.token}` },
                })
                if (meRes.ok) {
                    const meData = await meRes.json()
                    setUsageCount(meData.usageCount ?? 0)
                    setUsageLimitMonthly(meData.usageLimitMonthly ?? 5)
                }
            }
            setCooldown(45)
            const interval = setInterval(() => {
                setCooldown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.message || "Something went wrong.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    async function handleRegenerate(format: FormatKey) {
        if (!auth) return
        const userInfo = await getUserAndToken()
        if (!userInfo) return
        setLoading(true)
        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${userInfo.token}`,
                },
                body: JSON.stringify({
                    inputType: tab === "text" ? "text" : "url",
                    inputText,
                    url,
                    context: {
                        targetAudience: targetAudience.trim() || undefined,
                        goal: (goal || undefined) as any,
                        style: (style || undefined) as any,
                        emojiOn,
                        tonePreset: (tonePreset || undefined) as any,
                    },
                    formats: [format],
                    regenerate: true,
                    saveHistory: true,
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                if (res.status === 402) {
                    // Limit reached - button is already disabled and message is shown at top
                    // Refresh usage data to update the UI
                    if (userInfo) {
                        const meRes = await fetch("/api/me", {
                            headers: { Authorization: `Bearer ${userInfo.token}` },
                        })
                        if (meRes.ok) {
                            const meData = await meRes.json()
                            setUsageCount(meData.usageCount ?? 0)
                            setUsageLimitMonthly(meData.usageLimitMonthly ?? 5)
                        }
                    }
                    return
                }
                if (res.status === 403 || res.status === 429) {
                    toast({
                        title: "Please wait",
                        description: data.error || "Try again in a bit.",
                        variant: "destructive",
                    })
                    if (typeof data.secondsRemaining === "number") {
                        setCooldown(data.secondsRemaining)
                    }
                    return
                }
                throw new Error(data.error || "Failed to regenerate")
            }

            const outputs = data.outputs as Record<string, string>

            // Parse content and hooks for single regeneration
            const ParsedResults = { ...results }
            const ParsedHooks = { ...responseHooks }

            Object.entries(outputs).forEach(([k, text]) => {
                const key = k as FormatKey
                if (text.includes("---EXTRA_HOOKS---")) {
                    const parts = text.split("---EXTRA_HOOKS---")
                    ParsedResults[key] = parts[0].trim()

                    const hookSection = parts[1].trim()
                    const hooks = hookSection
                        .split("\n")
                        .map(line => line.trim())
                        .filter(line => /^\d+\./.test(line))
                        .map(line => line.replace(/^\d+\.\s*/, "").replace(/^"/, "").replace(/"$/, "").trim())
                        .slice(0, 3)

                    ParsedHooks[key] = hooks
                } else {
                    ParsedResults[key] = text
                    ParsedHooks[key] = []
                }
            })

            setResults((prev) => ({
                ...prev,
                ...ParsedResults,
            }))
            setResponseHooks((prev) => ({
                ...prev,
                ...ParsedHooks,
            }))
            toast({
                title: "Regenerated",
                description: "Updated LinkedIn format is ready.",
            })
            // Refresh usage data after successful regeneration
            if (userInfo) {
                const meRes = await fetch("/api/me", {
                    headers: { Authorization: `Bearer ${userInfo.token}` },
                })
                if (meRes.ok) {
                    const meData = await meRes.json()
                    setUsageCount(meData.usageCount ?? 0)
                    setUsageLimitMonthly(meData.usageLimitMonthly ?? 5)
                }
            }
            setCooldown(45)
            const interval = setInterval(() => {
                setCooldown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.message || "Something went wrong.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    function toggleEdit(key: string) {
        setEditingFormats((prev) => ({
            ...prev,
            [key]: !prev[key],
        }))
    }

    function toggleFormat(key: FormatKey) {
        setFormats((prev) => {
            const willSelect = !prev[key]
            const base: Record<FormatKey, boolean> = {
                "thought-leadership": false,
                "story-based": false,
                "educational-carousel": false,
                "short-viral-hook": false,
            }
            if (willSelect) {
                base[key] = true
            }
            return base
        })
    }

    function handleSwapHook(key: FormatKey, newHook: string) {
        const currentContent = results[key]
        if (!currentContent) return

        // Assume the hook is the first paragraph (up to double newline)
        // Or if no double newline, simply replace the first non-empty block
        const parts = currentContent.split("\n\n")

        // If content has at least 2 parts (Hook + Body), swap part 0
        if (parts.length >= 2) {
            parts[0] = newHook
            const newContent = parts.join("\n\n")
            setResults(prev => ({
                ...prev,
                [key]: newContent
            }))
        } else {
            // Fallback: Just prepend hook + newline + original (if original is short/one block)
            // Or better: Assume the whole "first block" is the hook
            const newContent = newHook + "\n\n" + parts.slice(1).join("\n\n")
            // Wait, if slice(1) is empty, we just have the hook?
            // If length is 1, it's safer to just replace it? No, that deletes the body.
            // Let's try to find the first line break \n
            const lines = currentContent.split("\n")
            // If > 2 lines, assume first 1-2 are hook?
            // Safest: Append `\n\n` + old_body_minus_first_sentence
            // Actually, for simplicity, let's just use the split("\n\n") logic which is standard for AI posts
            // If only 1 block, we won't swap to avoid destroying the whole post.
            // But we can try to force it.
            if (parts.length === 1) {
                // If it's a short post, maybe just prepend?
                setResults(prev => ({
                    ...prev,
                    [key]: newHook + "\n\n" + currentContent
                }))
            }
        }
    }

    function handleCopy(text: string) {
        if (!text) return
        navigator.clipboard.writeText(text)
        toast({
            title: "Copied",
            description: "Content copied to clipboard.",
        })
    }

    return (
        <div className="space-y-8 text-stone-900 pb-12">
            {isLimitReached && (
                <div className="rounded-3xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur-md">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="flex items-center gap-2 text-sm font-bold text-stone-800">
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                Monthly limit reached
                            </p>
                            <p className="text-xs text-stone-500">
                                You&apos;ve used {usageCount} of {usageLimitMonthly} generations this month. Upgrade to increase your limit.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            className="rounded-full bg-stone-900 px-6 text-xs text-white hover:bg-stone-800 shadow-lg"
                            onClick={() => router.push("/usage")}
                        >
                            Upgrade Now
                        </Button>
                    </div>
                </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-stone-800 sm:text-4xl">
                        New Repurpose
                    </h1>
                    <p className="mt-1 text-sm text-stone-500 font-medium">
                        Paste your content and choose a LinkedIn format.
                    </p>
                </div>
                {cooldown > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-pulse" />
                        Cooldown: {cooldown}s
                    </span>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
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

                    {/* Context card */}
                    <Card className="border-stone-200 bg-white/70 backdrop-blur-xl shadow-sm rounded-[2rem] overflow-hidden hover:shadow-md transition-all">
                        <CardHeader className="border-b border-stone-100/50 pb-4">
                            <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs shadow-sm">2</div>
                                Context
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-5 sm:grid-cols-2 pt-6">
                            <div className="space-y-2 sm:col-span-2">
                                <Label
                                    htmlFor="targetAudience"
                                    className="text-xs font-semibold text-stone-600 ml-1"
                                >
                                    Who is this post for?
                                </Label>
                                <Input
                                    id="targetAudience"
                                    value={targetAudience}
                                    onChange={(e) => setTargetAudience(e.target.value)}
                                    placeholder="e.g. Founders, HR leaders, Recruiters, Developers"
                                    className="h-11 rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-full text-sm shadow-inner"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-stone-600 ml-1">What&apos;s your goal?</Label>
                                <Select
                                    value={goal}
                                    onValueChange={(v) => setGoal(v as any)}
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-stone-200 bg-stone-50/50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm shadow-sm transition-all hover:bg-stone-50">
                                        <SelectValue placeholder="What's your goal?" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-stone-100 shadow-xl backdrop-blur-xl bg-white/90">
                                        <SelectItem value="engagement">Start conversations</SelectItem>
                                        <SelectItem value="authority">Build credibility</SelectItem>
                                        <SelectItem value="leads">Attract opportunities</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-stone-600 ml-1">Post style</Label>
                                <Select
                                    value={style}
                                    onValueChange={(v) => setStyle(v as any)}
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-stone-200 bg-stone-50/50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm shadow-sm transition-all hover:bg-stone-50">
                                        <SelectValue placeholder="Post style" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-stone-100 shadow-xl backdrop-blur-xl bg-white/90">
                                        <SelectItem value="thought-leader">Opinion & insight</SelectItem>
                                        <SelectItem value="storyteller">Personal story</SelectItem>
                                        <SelectItem value="educator">Teach something</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-stone-600 ml-1">Emojis</Label>
                                <div className="flex items-center gap-3 text-xs text-stone-600">
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
                                        <SelectItem value="conversational">Friendly</SelectItem>
                                        <SelectItem value="storytelling">Story-driven</SelectItem>
                                        <SelectItem value="educational">Instructional</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Formats */}
                    <Card className="border-stone-200 bg-white/70 backdrop-blur-xl shadow-sm rounded-[2rem] overflow-hidden hover:shadow-md transition-all">
                        <CardHeader className="border-b border-stone-100/50 pb-4">
                            <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs shadow-sm">3</div>
                                What should we generate?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-2 pt-6">
                            {(
                                [
                                    ["thought-leadership", "Main LinkedIn post"],
                                    ["story-based", "Story-style post"],
                                    ["educational-carousel", "Educational / carousel text"],
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

                {/* Results */}
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
                                "thought-leadership": "Main LinkedIn post",
                                "story-based": "Story-style post",
                                "educational-carousel": "Educational / carousel text",
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
                                                    disabled={!value || value.trim().length === 0}
                                                    className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-medium text-stone-600 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                                                >
                                                    Regenerate
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
            </div>
        </div>
    )
}

