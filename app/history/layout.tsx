import { AppShell } from "@/components/layout/app-shell"
import { ReactNode } from "react"

export default function HistoryLayout({ children }: { children: ReactNode }) {
    return <AppShell>{children}</AppShell>
}
