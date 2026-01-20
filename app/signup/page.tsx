"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { auth } from "@/lib/firebase/client"
import {
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    signInWithPopup,
} from "firebase/auth"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { FormEvent, useState } from "react"

export default function SignupPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loadingEmail, setLoadingEmail] = useState(false)
    const [loadingGoogle, setLoadingGoogle] = useState(false)

    async function handleGoogle() {
        if (!auth) return
        setLoadingGoogle(true)
        try {
            const provider = new GoogleAuthProvider()
            // Customize OAuth flow
            provider.setCustomParameters({
                prompt: "select_account",
            })
            provider.addScope("email")
            provider.addScope("profile")
            const result = await signInWithPopup(auth, provider)
            toast({
                title: "Welcome to Hookory",
                description: "Start generating amazing content!",
            })
            router.push("/dashboard")
        } catch (err: any) {
            console.error(err)
            toast({
                title: "Google signup failed",
                description: err?.message || "Please try again.",
                variant: "destructive",
            })
        } finally {
            setLoadingGoogle(false)
        }
    }

    async function handleEmailSignup(e: FormEvent) {
        e.preventDefault()
        if (!auth) return
        setLoadingEmail(true)
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password)
            toast({
                title: "Account created",
                description: "Welcome! Start generating amazing content.",
            })
            router.push("/dashboard")
        } catch (err: any) {
            console.error(err)
            toast({
                title: "Signup failed",
                description: err?.message || "Please try again.",
                variant: "destructive",
            })
        } finally {
            setLoadingEmail(false)
        }
    }

    return (
        <main className="relative flex min-h-screen items-center justify-center bg-stone-50 px-4 text-stone-900">
            <Link
                href="/"
                className="absolute left-8 top-8 z-50 flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-emerald-600"
            >
                <ArrowLeft className="h-4 w-4" />
                Back
            </Link>
            <div className="absolute inset-0 bg-[url('/nature.jpeg')] bg-cover bg-center opacity-5 pointer-events-none" />
            <Card className="w-full max-w-md border-stone-200 bg-white/80 backdrop-blur-xl shadow-xl rounded-[2.5rem] overflow-hidden relative z-10">
                <CardHeader className="space-y-2 text-center pt-10 pb-6">
                    <CardTitle className="text-2xl font-bold tracking-tight text-stone-800">
                        Create your free account
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 px-8 pb-10">
                    <button
                        type="button"
                        onClick={handleGoogle}
                        disabled={loadingGoogle || loadingEmail}
                        className="relative w-full h-10 rounded-full p-[2px] overflow-hidden group hover:scale-[1.02] transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                        <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#059669_0%,#6ee7b7_50%,#059669_100%)]" />
                        <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-white px-4 text-xs font-medium text-stone-600 backdrop-blur-3xl">
                            {loadingGoogle ? (
                                "Signing up…"
                            ) : (
                                <div className="flex items-center gap-2">
                                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.83z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.83c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                    Continue with Google
                                </div>
                            )}
                        </span>
                    </button>

                    <div className="flex items-center gap-3 text-[11px] text-stone-400 uppercase tracking-wider font-medium">
                        <span className="h-px flex-1 bg-stone-200" />
                        or
                        <span className="h-px flex-1 bg-stone-200" />
                    </div>

                    <form className="space-y-4" onSubmit={handleEmailSignup}>
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-xs font-medium text-stone-600 ml-1">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all text-sm h-11"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="password" className="text-xs font-medium text-stone-600 ml-1">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all text-sm h-11"
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            className="mt-2 w-full h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 font-medium"
                            disabled={loadingEmail || loadingGoogle}
                        >
                            {loadingEmail ? "Creating account…" : "Sign up with email"}
                        </Button>
                    </form>

                    <p className="text-center text-xs text-stone-500">
                        Already have an account?{" "}
                        <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
                            Log in
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </main>
    )
}

