import { SettingsNavigation } from "@/components/settings/SettingsNavigation"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="settings-workspace min-w-0">
            <SettingsNavigation />
            <div className="min-w-0">{children}</div>
        </div>
    )
}
