import { useAppShell } from "@/components/layout/app-shell"
import { toast } from "@/components/ui/use-toast"
import { auth } from "@/lib/firebase/client"
import { User } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { FormatKey, ToneType } from "@/components/dashboard/types"

export function useRepurpose() {
    const { refreshUserData } = useAppShell()
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [tab, setTab] = useState<"text" | "url">("text")
    const [inputText, setInputText] = useState("")
    const [url, setUrl] = useState("")
    const [readerContext, setReaderContext] = useState("")
    const [angle, setAngle] = useState("")
    const [emojiOn, setEmojiOn] = useState(false)
    const [tonePreset, setTonePreset] = useState<ToneType>("professional")
    const [formats, setFormats] = useState<Record<FormatKey, boolean>>({
        "main-post": true,
        "story-based": false,
        "carousel": false,
        "short-viral-hook": false,
    })

    // Track which formats are in "Edit Mode"
    const [editingFormats, setEditingFormats] = useState<Record<string, boolean>>({})

    const [loading, setLoading] = useState(false)
    const [cooldown, setCooldown] = useState(0)
    const [results, setResults] = useState<Record<FormatKey, string>>({
        "main-post": "",
        "story-based": "",
        "carousel": "",
        "short-viral-hook": "",
    })
    const [plan, setPlan] = useState<"free" | "creator" | null>(null)
    const [usageCount, setUsageCount] = useState<number | null>(null)
    const [usageLimitMonthly, setUsageLimitMonthly] = useState<number | null>(null)

    // Store parsed hooks separately
    const [responseHooks, setResponseHooks] = useState<Record<FormatKey, string[]>>({
        "main-post": [],
        "story-based": [],
        "carousel": [],
        "short-viral-hook": [],
    })

    const [regeneratingFormat, setRegeneratingFormat] = useState<FormatKey | null>(null)

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
                        readerContext: readerContext.trim() || undefined,
                        angle: (angle || undefined),
                        emojiOn,
                        tonePreset: (tonePreset || undefined) as any,
                    },
                    formats: selectedFormats,
                    regenerate: false,
                    saveHistory: true,
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                if (res.status === 402) {
                    // Limit reached
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
                        .slice(0, 5)

                    ParsedHooks[key] = hooks
                } else {
                    ParsedResults[key] = text
                    ParsedHooks[key] = []
                }
            })

            setResults(ParsedResults)
            setResponseHooks(ParsedHooks)
            refreshUserData()

            toast({
                title: "Generated",
                description: "Your LinkedIn formats are ready.",
            })

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
            setCooldown(plan === "creator" ? 30 : 45)
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
        setRegeneratingFormat(format)
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
                        readerContext: readerContext.trim() || undefined,
                        angle: (angle || undefined),
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
                        .slice(0, 5)

                    ParsedHooks[key] = hooks
                } else {
                    ParsedResults[key] = text
                    ParsedHooks[key] = []
                }
            })

            setResults((prev) => ({ ...prev, ...ParsedResults }))
            setResponseHooks((prev) => ({ ...prev, ...ParsedHooks }))
            toast({
                title: "Regenerated",
                description: "Updated LinkedIn format is ready.",
            })
            refreshUserData()

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
            setCooldown(plan === "creator" ? 30 : 45)
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
            setRegeneratingFormat(null)
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
                "main-post": false,
                "story-based": false,
                "carousel": false,
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

        const parts = currentContent.split("\n\n")

        if (parts.length >= 2) {
            parts[0] = newHook
            const newContent = parts.join("\n\n")
            setResults(prev => ({
                ...prev,
                [key]: newContent
            }))
        } else {
            if (parts.length === 1) {
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

    return {
        user,
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
        loading,
        cooldown,
        results,
        setResults,
        plan,
        usageCount,
        usageLimitMonthly,
        responseHooks,
        regeneratingFormat,
        editingFormats,
        toggleEdit,
        canGenerate,
        isLimitReached,
        handleGenerate,
        handleRegenerate,
        handleSwapHook,
        handleCopy
    }
}
