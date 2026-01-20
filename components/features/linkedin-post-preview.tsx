import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Copy, Edit2, Globe, ThumbsUp, MessageSquare, Share2, Send, Bookmark, Heart, Lightbulb } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { User } from "firebase/auth"

interface LinkedInPostPreviewProps {
    content: string
    user: User | null
    onEdit: () => void
    onCopy: () => void
}

export function LinkedInPostPreview({
    content,
    user,
    onEdit,
    onCopy,
}: LinkedInPostPreviewProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isTruncated, setIsTruncated] = useState(false)
    const textRef = useRef<HTMLParagraphElement>(null)

    // LinkedIn typically truncates around 210 chars or 3-5 lines.
    // We'll use a precise character limit similar to LinkedIn's specific visual break.
    const TRUNCATION_LIMIT = 210

    useEffect(() => {
        if (content.length > TRUNCATION_LIMIT) {
            setIsExpanded(false)
            setIsTruncated(true)
        } else {
            setIsExpanded(true)
            setIsTruncated(false)
        }
    }, [content])

    const displayText = isExpanded ? content : content.slice(0, TRUNCATION_LIMIT)

    const firstName = user?.displayName?.split(" ")[0] || "User"
    const lastName = user?.displayName?.split(" ").slice(1).join(" ") || ""
    const initials = (firstName[0] || "") + (lastName[0] || "")

    return (
        <div className="w-full max-w-[555px] rounded-lg border border-[#e0dfdc] bg-white font-sans text-[14px] text-[#000000e6] shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between p-3 pb-2">
                <div className="flex gap-2">
                    <Avatar className="h-12 w-12 cursor-pointer border border-transparent hover:border-[#0a66c2]/80">
                        <AvatarImage
                            src="/linkedin_profile.jpg"
                            alt={user?.displayName || "User"}
                        />
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="cursor-pointer text-sm font-semibold hover:text-[#0a66c2] hover:underline">
                            {user?.displayName || "Your Name"}
                        </span>
                        <span className="text-xs text-gray-500">Creator • 10k followers</span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span>1w • </span>
                            <Globe className="h-3 w-3" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onEdit}
                        className="h-8 w-8 rounded-full text-gray-600 hover:bg-gray-100"
                        title="Edit Post"
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onCopy}
                        className="h-8 w-8 rounded-full text-gray-600 hover:bg-gray-100"
                        title="Copy to Clipboard"
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="px-3 pb-2">
                <div className="whitespace-pre-wrap leading-[1.4] break-words text-sm relative">
                    {/* Render text. If truncated, simply render substring. */}
                    {displayText}

                    {!isExpanded && isTruncated && (
                        <span className="absolute bottom-0 right-0 bg-white pl-1 pointer-events-none">
                            ...
                            <button
                                onClick={() => setIsExpanded(true)}
                                className="pointer-events-auto ml-1 cursor-pointer font-medium text-gray-500 hover:text-[#0a66c2] hover:underline hover:decoration-[#0a66c2]"
                            >
                                see more
                            </button>
                        </span>
                    )}
                </div>
            </div>

            {/* Engagement Placeholder (Visual Only) */}
            <div className="mx-3 border-t border-[#e0dfdc] py-1">
                <div className="flex items-center justify-between text-xs text-gray-500 py-1">
                    <div className="flex items-center -space-x-1">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1485bd] ring-1 ring-white z-30">
                            <ThumbsUp className="h-2.5 w-2.5 text-white" fill="white" />
                        </span>
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#df704d] ring-1 ring-white z-20">
                            <Heart className="h-2.5 w-2.5 text-white" fill="white" />
                        </span>
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#f5bb5c] ring-1 ring-white z-10">
                            <Lightbulb className="h-2.5 w-2.5 text-white" fill="white" />
                        </span>
                        <span className="pl-3 ml-4 text-black hover:text-[#0a66c2] hover:underline cursor-pointer">84</span>
                    </div>
                    <div className="hover:text-[#0a66c2] hover:underline cursor-pointer">
                        12 comments • 2 reposts
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between px-1 pb-1">
                <div className="flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-md opacity-80">
                    <ThumbsUp className="h-[18px] w-[18px] -scale-x-100 text-[#00000099]" strokeWidth={1.5} />
                    <span className="text-[14px] font-semibold text-[#00000099]">Like</span>
                </div>
                <div className="flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-md opacity-80">
                    <MessageSquare className="h-[18px] w-[18px] text-[#00000099]" strokeWidth={1.5} />
                    <span className="text-[14px] font-semibold text-[#00000099]">Comment</span>
                </div>
                <div className="flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-md opacity-80">
                    <Share2 className="h-[18px] w-[18px] text-[#00000099]" strokeWidth={1.5} />
                    <span className="text-[14px] font-semibold text-[#00000099]">Repost</span>
                </div>
                <div className="flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-md opacity-80">
                    <Send className="h-[18px] w-[18px] -rotate-45 ml-0.5 mt-[7px] text-[#00000099]" strokeWidth={1.5} />
                    <span className="text-[14px] font-semibold text-[#00000099]">Send</span>
                </div>
            </div>
        </div>
    )
}
