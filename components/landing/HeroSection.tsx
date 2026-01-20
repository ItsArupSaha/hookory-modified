"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { User } from "firebase/auth"

interface HeroSectionProps {
    user: User | null
    loading: boolean
    navLoading: null | "login" | "signup" | "dashboard"
    setNavLoading: (state: null | "login" | "signup" | "dashboard") => void
    navigateWithFade: (href: string) => Promise<void>
}

export function HeroSection({ user, loading, navLoading, setNavLoading, navigateWithFade }: HeroSectionProps) {
    return (
        <div className="relative max-w-[95%] mx-auto mt-24 rounded-[2.5rem] overflow-hidden min-h-[600px] flex items-center shadow-2xl ring-1 ring-white/20">
            <Image
                src="/nature.jpeg"
                fill
                className="object-cover"
                alt="Nature Portal"
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/70" />

            <div className="relative z-10 w-full px-4 md:px-6 lg:px-8 py-20">
                <div className="max-w-3xl mx-auto space-y-7 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 backdrop-blur-md px-4 py-1.5 text-[11px] font-medium text-white shadow-sm mx-auto">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Built for LinkedIn-first creators · Free plan included
                    </div>
                    <div className="space-y-3">
                        <h1 className="text-4xl font-semibold tracking-tight text-white drop-shadow-2xl sm:text-5xl lg:text-6xl animate-fade-in-up">
                            Turn one idea into{" "}
                            <span className="text-emerald-200">
                                four scroll-stopping
                            </span>{" "}
                            LinkedIn posts.
                        </h1>
                        <p className="max-w-xl mx-auto text-base text-white drop-shadow-2xl sm:text-lg font-medium animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                            Paste a blog, thread, or doc and get multiple LinkedIn-ready
                            versions with strong hooks, clean structure, and clear CTAs —
                            in under 30 seconds.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        {user ? (
                            <Button size="lg" asChild className="bg-white text-emerald-900 hover:bg-white/90 border-0 shadow-lg">
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-2"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (navLoading) return
                                        setNavLoading("dashboard")
                                        navigateWithFade("/dashboard")
                                    }}
                                >
                                    Go to Dashboard
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        ) : (
                            <>
                                <Link
                                    href="/signup"
                                    className="relative inline-flex h-12 overflow-hidden rounded-full p-[2px] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-50 shadow-xl hover:scale-105 transition-transform duration-200"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (navLoading) return
                                        setNavLoading("signup")
                                        navigateWithFade("/signup")
                                    }}
                                >
                                    <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#059669_0%,#6ee7b7_50%,#059669_100%)]" />
                                    <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-emerald-600 px-8 py-1 text-base font-semibold text-white backdrop-blur-3xl transition-colors hover:bg-emerald-700">
                                        {navLoading === "signup" ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Loading...
                                            </>
                                        ) : (
                                            <>Try free <ArrowRight className="ml-2 h-4 w-4" /></>
                                        )}
                                    </span>
                                </Link>
                                <div className="flex flex-col text-xs text-white/80 drop-shadow-md">
                                    <span>No credit card required</span>
                                    <span>Google login · Email login · Cancel anytime</span>
                                </div>
                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}
