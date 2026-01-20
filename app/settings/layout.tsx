import { AppShell } from "@/components/layout/app-shell"
import { ReactNode } from "react"

export default function SettingsLayout({ children }: { children: ReactNode }) {
    return <AppShell>{children}</AppShell>
}
