import { PageTransition } from "@/components/page-transition"
import { Toaster } from "@/components/ui/toaster"
import type { Metadata } from "next"
import { Ubuntu } from "next/font/google"
import "./globals.css"

const ubuntu = Ubuntu({
    subsets: ["latin"],
    weight: ["300", "400", "500", "700"]
})

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://hookory-modified.vercel.app"),
    title: {
        default: "Hookory | Turn Blogs into LinkedIn Posts",
        template: "%s | Hookory",
    },
    description: "Stop writing from scratch. Turn one blog post into a month of LinkedIn content with AI. Better quality than $20-50/month tools — all for just $9.99/month.",
    openGraph: {
        title: "Hookory - Repurpose Content for LinkedIn",
        description: "Paste a URL, get viral LinkedIn posts. Better than $20-50/month tools — only $9.99/month. Try it for free.",
        url: "https://hookory.vercel.app",
        siteName: "Hookory",
        images: [
            {
                url: "/hookoryLogo.png",
                width: 1200,
                height: 630,
            },
        ],
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Hookory - Repurpose Content for LinkedIn",
        description: "Paste a URL, get viral LinkedIn posts. Better quality than $20-50/month tools — only $9.99/month.",
        images: ["/hookoryLogo.png"],
    },
    icons: {
        icon: "/hookoryLogo.png",
        apple: "/hookoryLogo.png",
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={ubuntu.className}>
                <PageTransition>{children}</PageTransition>
                <Toaster />
            </body>
        </html>
    )
}
