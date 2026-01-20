import { Loader2 } from "lucide-react"

export default function AdminLoading() {
    return (
        <div className="flex h-[50vh] items-center justify-center">
            <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                <p className="mt-2 text-sm text-stone-500">Loading...</p>
            </div>
        </div>
    )
}
