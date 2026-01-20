"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Star, StarHalf } from "lucide-react"
import { cn } from "@/lib/utils"
import { auth } from "@/lib/firebase/client"

export function ReviewDialog({ children }: { children?: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(false)
    const { toast } = useToast()

    // Form State
    const [name, setName] = useState("")
    const [profession, setProfession] = useState("")
    const [review, setReview] = useState("")
    const [stars, setStars] = useState(5.0)
    const [hoverStars, setHoverStars] = useState<number | null>(null)

    // Check if user already reviewed when dialog opens
    useEffect(() => {
        if (open && auth?.currentUser) {
            setChecking(true)
            auth.currentUser.getIdToken().then(token => {
                fetch("/api/reviews", {
                    headers: { "Authorization": `Bearer ${token}` }
                })
                    .then((res) => res.json())
                    .then((data) => {
                        if (data.hasReviewed) {
                            setOpen(false)
                            toast({
                                title: "Review already submitted",
                                description: "You have already submitted a review. Please contact with us if you want to update it.",
                                className: "bg-emerald-50 border-emerald-200 text-emerald-800",
                            })
                        }
                    })
                    .catch(console.error)
                    .finally(() => setChecking(false))
            })
        }
    }, [open, toast])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim() || !review.trim()) return

        setLoading(true)
        try {
            const token = await auth?.currentUser?.getIdToken()
            if (!token) {
                throw new Error("You must be logged in to submit a review")
            }

            const res = await fetch("/api/reviews", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ name, profession, stars, review }),
            })

            const data = await res.json()

            if (!res.ok) {
                if (res.status === 409) {
                    toast({
                        title: "Review exists",
                        description: "You have already submitted a review. Please contact with us.",
                        className: "bg-emerald-50 border-emerald-200 text-emerald-800",
                    })
                    setOpen(false)
                    return
                }
                throw new Error(data.error || "Failed to submit review")
            }

            toast({
                title: "Review submitted!",
                description: "Thank you for your review.",
                className: "bg-emerald-50 border-emerald-200 text-emerald-800",
            })
            setOpen(false)
            // Reset form
            setName("")
            setProfession("")
            setReview("")
            setStars(5.0)
        } catch (error: any) {
            toast({
                title: "Submission failed",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    // Helper to render stars
    // We'll support 0.5 increments for selection if we want complex logic, 
    // but for simple UI, let's stick to clicking full stars or maybe just simple 5 stars.
    // User asked for "make sure user can give 4.5 stars".
    // To implement 4.5 check: We can use a slider or clever div overlay.
    // OR simpler: Render 5 stars, detect click on left/right half.

    const handleStarClick = (index: number, isHalf: boolean) => {
        setStars(index + (isHalf ? 0.5 : 1))
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="ghost" className="w-full justify-start gap-2">
                        <Star className="h-4 w-4" />
                        Review
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Write a Review</DialogTitle>
                    <DialogDescription>
                        Share your experience with Hookor. Your feedback helps others!
                    </DialogDescription>
                </DialogHeader>

                {checking ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-stone-900">Name <span className="text-red-500">*</span></Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="profession" className="text-stone-900">Profession <span className="text-stone-400 font-normal">(Optional)</span></Label>
                                <Input id="profession" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="e.g. Content Creator" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-stone-900">Rating</Label>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((starValue) => {
                                    const index = starValue - 1
                                    const ratingValue = hoverStars ?? stars

                                    // Check if this star should be full, half, or empty
                                    const isFull = ratingValue >= starValue
                                    const isHalf = ratingValue === starValue - 0.5

                                    return (
                                        <div
                                            key={index}
                                            className="relative cursor-pointer transition-transform hover:scale-110"
                                            onMouseLeave={() => setHoverStars(null)}
                                        >
                                            {/* Base Star (Background) */}
                                            <Star className="h-10 w-10 text-stone-200 fill-stone-100" />

                                            {/* Colored Overlay */}
                                            {(isFull || isHalf) && (
                                                <div className="absolute inset-0 overflow-hidden"
                                                    style={{ width: isFull ? '100%' : '50%' }}
                                                >
                                                    <Star className="h-10 w-10 text-amber-500 fill-amber-400" />
                                                </div>
                                            )}

                                            {/* Hit Targets for Interaction */}
                                            {/* Left Half (X.5) */}
                                            <div
                                                className="absolute inset-y-0 left-0 w-1/2 z-10"
                                                onMouseEnter={() => setHoverStars(index + 0.5)}
                                                onClick={() => handleStarClick(index, true)}
                                            />
                                            {/* Right Half (X.0) */}
                                            <div
                                                className="absolute inset-y-0 right-0 w-1/2 z-10"
                                                onMouseEnter={() => setHoverStars(index + 1)}
                                                onClick={() => handleStarClick(index, false)}
                                            />
                                        </div>
                                    )
                                })}
                                <span className="ml-2 text-lg font-bold text-stone-700">{stars}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="review" className="text-stone-900">Review <span className="text-red-500">*</span></Label>
                            <Textarea
                                id="review"
                                placeholder="Tell us what you think..."
                                className="min-h-[100px]"
                                value={review}
                                onChange={(e) => setReview(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={loading || !name.trim() || !review.trim()} className="button-primary bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Review
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
