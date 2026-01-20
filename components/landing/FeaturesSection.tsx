"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BLOG_TEXT, GENERATED_POSTS } from "@/lib/data/landing-examples"

export function FeaturesSection() {
    return (
        <section className="mt-8 py-16 px-4 md:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8 px-4 md:px-6 lg:px-0">
                {/* Section Headline */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
                        See the Difference:{" "}
                        <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent">
                            From Blog to LinkedIn Gold
                        </span>
                    </h2>
                    <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
                        Watch how we transform a 2,800-word blog post into four scroll-stopping LinkedIn formats, each optimized for maximum engagement.
                    </p>
                </div>

                {/* Before Card */}
                <Card className="border-stone-200 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-1 relative before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/lined-paper-light.png')] before:opacity-30 before:pointer-events-none">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                            Before · 2,800-word blog post
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 rounded-md border border-stone-100 bg-stone-50/50 px-4 py-3 text-[12px] text-stone-600 max-h-[300px] overflow-y-auto font-serif">
                            <p className="whitespace-pre-wrap leading-relaxed">{BLOG_TEXT}</p>
                            <p className="text-[10px] text-stone-400 pt-2 border-t border-stone-200 font-sans">
                                {BLOG_TEXT.length} characters · No hook · No structure · Not LinkedIn-ready
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* After Header */}
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-slate-900">After using Hookory · 4 formats generated</h3>
                    <p className="text-sm text-slate-500 mt-2">Each format optimized for different engagement goals</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Format 1: Thought Leadership (Forest) */}
                    <Card className="border border-emerald-100 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-emerald-800">
                                Format 1: Thought Leadership
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 border border-emerald-200">
                                    Generated
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="rounded-md border border-emerald-50 bg-emerald-50/20 px-3 py-2 text-[12px] text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
                                {GENERATED_POSTS["thought-leadership"].content}
                            </div>
                            <div className="space-y-1.5 pt-2 border-t border-emerald-50">
                                <p className="text-[10px] font-semibold text-emerald-700">Why this works:</p>
                                <ul className="space-y-1 text-[10px] text-slate-600">
                                    {GENERATED_POSTS["thought-leadership"].improvements.map((imp, i) => (
                                        <li key={i} className="flex items-start gap-1.5">
                                            <span className="text-emerald-500 mt-0.5">✓</span>
                                            <span>{imp}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Format 2: Story-Based (Earth/Amber) */}
                    <Card className="border border-amber-100 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-amber-800">
                                Format 2: Story-Based
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                                    Generated
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="rounded-md border border-amber-50 bg-amber-50/20 px-3 py-2 text-[12px] text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
                                {GENERATED_POSTS["story-based"].content}
                            </div>
                            <div className="space-y-1.5 pt-2 border-t border-amber-50">
                                <p className="text-[10px] font-semibold text-amber-700">Why this works:</p>
                                <ul className="space-y-1 text-[10px] text-slate-600">
                                    {GENERATED_POSTS["story-based"].improvements.map((imp, i) => (
                                        <li key={i} className="flex items-start gap-1.5">
                                            <span className="text-amber-500 mt-0.5">✓</span>
                                            <span>{imp}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Format 3: Educational Carousel (Sky) */}
                    <Card className="border border-sky-100 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-sky-800">
                                Format 3: Educational Carousel
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-800 border border-sky-200">
                                    Generated
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="rounded-md border border-sky-50 bg-sky-50/20 px-3 py-2 text-[12px] text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
                                {GENERATED_POSTS["educational-carousel"].content}
                            </div>
                            <div className="space-y-1.5 pt-2 border-t border-sky-50">
                                <p className="text-[10px] font-semibold text-sky-700">Why this works:</p>
                                <ul className="space-y-1 text-[10px] text-slate-600">
                                    {GENERATED_POSTS["educational-carousel"].improvements.map((imp, i) => (
                                        <li key={i} className="flex items-start gap-1.5">
                                            <span className="text-sky-500 mt-0.5">✓</span>
                                            <span>{imp}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Format 4: Short Viral Hook (Clay/Rose) */}
                    <Card className="border border-rose-100 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-rose-800">
                                Format 4: Short Viral Hook
                                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-800 border border-rose-200">
                                    Generated
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="rounded-md border border-rose-50 bg-rose-50/20 px-3 py-2 text-[12px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                                {GENERATED_POSTS["short-viral-hook"].content}
                            </div>
                            <div className="space-y-1.5 pt-2 border-t border-rose-50">
                                <p className="text-[10px] font-semibold text-rose-700">Why this works:</p>
                                <ul className="space-y-1 text-[10px] text-slate-600">
                                    {GENERATED_POSTS["short-viral-hook"].improvements.map((imp, i) => (
                                        <li key={i} className="flex items-start gap-1.5">
                                            <span className="text-rose-500 mt-0.5">✓</span>
                                            <span>{imp}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    )
}
