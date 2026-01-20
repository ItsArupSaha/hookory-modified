"use client"

import { useState } from "react"
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
import { useToast } from "@/components/ui/use-toast"
import { Loader2, MessageSquare } from "lucide-react"
import { auth } from "@/lib/firebase/client"

export function FeedbackDialog({ children }: { children?: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")
    const { toast } = useToast()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!message.trim()) return

        setLoading(true)
        try {
            const token = await auth?.currentUser?.getIdToken()
            if (!token) {
                throw new Error("You must be logged in to submit feedback")
            }

            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ message }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Failed to submit feedback")
            }

            toast({
                title: "Feedback sent!",
                description: "Thank you for helping us improve Hookor.",
                className: "bg-emerald-50 border-emerald-200 text-emerald-800",
            })
            setOpen(false)
            setMessage("")
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="ghost" className="w-full justify-start gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Feedback
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Send Feedback</DialogTitle>
                    <DialogDescription>
                        Tell us what you like, what&apos;s missing, or report a bug. We appreciate your input!
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <Textarea
                        placeholder="Type your feedback here..."
                        className="min-h-[100px]"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={loading}
                    />
                    <DialogFooter>
                        <Button type="submit" disabled={loading || !message.trim()} className="button-primary bg-emerald-600 hover:bg-emerald-700 text-white">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Feedback
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
