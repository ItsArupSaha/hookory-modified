"use client"

import SiteFooter from "@/components/layout/site-footer"
import { auth } from "@/lib/firebase/client"
import { onAuthStateChanged, User } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { HeroSection } from "@/components/landing/HeroSection"
import { InfiniteMarquee } from "@/components/landing/InfiniteMarquee"
import { FeaturesSection } from "@/components/landing/FeaturesSection"
import { HowItWorksSection } from "@/components/landing/HowItWorksSection"
import { WhyDifferentSection, WhoItsForSection } from "@/components/landing/InfoSections"
import { PricingSection } from "@/components/landing/PricingSection"
import { Navbar } from "@/components/landing/Navbar"

export default function LandingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [navLoading, setNavLoading] = useState<null | "login" | "signup" | "dashboard">(null)

  const navigateWithFade = async (href: string) => {
    if (typeof window === "undefined") return
    const container = document.querySelector(".page-transition")
    container?.classList.add("page-leave")
    await new Promise((resolve) => setTimeout(resolve, 180))
    router.push(href)
  }

  const handleScrollToPricing = () => {
    if (typeof window === "undefined") return
    const el = document.getElementById("pricing")
    if (!el) return
    const navbarOffset = 72 // approximate sticky navbar height
    const rect = el.getBoundingClientRect()
    const targetY = rect.top + window.scrollY - navbarOffset

    window.scrollTo({ top: targetY, behavior: "smooth" })
  }

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    // Check auth state
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  return (
    <main
      className={`min-h-screen bg-stone-50 text-stone-900 transition-opacity duration-200 ${navLoading ? "opacity-60" : "opacity-100"
        }`}
    >
      <Navbar
        user={user}
        loading={loading}
        navLoading={navLoading}
        setNavLoading={setNavLoading}
        navigateWithFade={navigateWithFade}
        handleScrollToPricing={handleScrollToPricing}
      />

      <div className="mx-auto pb-16 md:pb-24">
        <HeroSection
          user={user}
          loading={loading}
          navLoading={navLoading}
          setNavLoading={setNavLoading}
          navigateWithFade={navigateWithFade}
        />

        <InfiniteMarquee />

        <HowItWorksSection />

        <FeaturesSection />

        <PricingSection user={user} />

        <WhyDifferentSection />

        <WhoItsForSection />

        <SiteFooter />
      </div >
    </main >
  )
}
