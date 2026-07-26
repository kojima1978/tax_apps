import { SettingsLocalNavigation } from "@/components/settings/SettingsLocalNavigation"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="mx-auto grid max-w-[1480px] min-w-0 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-3">
            <div className="relative z-10 -mb-6 px-4 pt-4 lg:mb-0 lg:px-0 lg:pl-3 lg:pt-10">
                <SettingsLocalNavigation />
            </div>
            <div className="min-w-0">{children}</div>
        </div>
    )
}
