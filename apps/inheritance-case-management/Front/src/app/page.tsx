"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { InheritanceCase, mockData } from "@/lib/mock-data"
import { columns } from "./columns"
import { DataTable } from "./data-table"
import { getCases } from "@/lib/case-service"
import { logout, getUser } from "@/lib/auth-service"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Plus, LogOut } from "lucide-react"

export default function InheritanceMockupPage() {
    const router = useRouter()
    // Initial render with mockData to match server HTML (hydration), then sync with localStorage
    const [data, setData] = useState<InheritanceCase[]>(mockData)
    const [username, setUsername] = useState<string>("")

    useEffect(() => {
        const user = getUser()
        if (user) {
            setUsername(user.username)
        }
    }, [])

    useEffect(() => {
        // Load actual data from backend
        const load = async () => {
            try {
                const cases = await getCases()
                setData(cases)
            } catch (e) {
                console.error(e)
            }

        }
        load()
    }, [])

    const handleLogout = () => {
        logout()
        router.push("/login")
    }

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">相続税申告案件一覧</h1>
                <div className="flex gap-2 items-center">
                    {username && (
                        <span className="text-sm text-gray-600 mr-2">
                            {username} さん
                        </span>
                    )}
                    <Link href="/analytics">
                        <Button variant="outline">経営分析</Button>
                    </Link>
                    <Link href="/settings">
                        <Button variant="outline">マスタ設定</Button>
                    </Link>
                    <Link href="/new">
                        <Button variant="outline">
                            <Plus className="mr-2 h-4 w-4" />
                            新規案件登録
                        </Button>
                    </Link>
                    <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        ログアウト
                    </Button>
                </div>
            </div>
            <DataTable columns={columns} data={data} />
        </div>
    )
}
