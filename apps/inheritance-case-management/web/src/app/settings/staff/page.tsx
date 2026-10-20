"use client"

import { useState, useEffect, useCallback, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { MasterBreadcrumb } from "@/components/master-list/MasterBreadcrumb"
import { MasterLoadError } from "@/components/master-list/MasterLoadError"
import { parseError } from "@/hooks/use-error-handler"
import { useToast } from "@/components/ui/Toast"
import type { Department, Assignee } from "@/types/shared"
import { getDepartments } from "@/lib/api/departments"
import { getAssignees } from "@/lib/api/assignees"
import { getStaffDirectorySync, resyncStaffDirectory, type StaffDirectorySyncResult } from "@/lib/api/staff-directory"
import { Users } from "lucide-react"
import { StaffDirectoryNotice } from "./StaffDirectoryNotice"
import { StaffGroupList } from "./StaffGroupList"
import { StaffToolbar } from "./StaffToolbar"
import { getGroupedAssignees } from "./staff-utils"

function StaffContent() {
    const toast = useToast()
    const searchParams = useSearchParams()
    const returnTo = searchParams.get("returnTo")

    const [departments, setDepartments] = useState<Department[]>([])
    const [assignees, setAssignees] = useState<Assignee[]>([])
    const [loading, setLoading] = useState(true)
    // トーストは消えるので、読めなかったことは帯で残す（空の一覧と区別が付かなくなる）。
    const [loadError, setLoadError] = useState<string | null>(null)
    const [showInactive, setShowInactive] = useState(false)

    const [sync, setSync] = useState<StaffDirectorySyncResult | null>(null)

    const [filterDept, setFilterDept] = useState<string>("")
    const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())

    const reload = useCallback(async () => {
        // 先に台帳から写し直してから一覧を読む。台帳が読めなくても写しは表示する
        try {
            setSync(await getStaffDirectorySync())
        } catch {
            setSync(null)
        }
        try {
            const [d, a] = await Promise.all([getDepartments(), getAssignees()])
            setDepartments(d.sort((a, b) => a.sortOrder - b.sortOrder))
            setAssignees(a)
            setLoadError(null)
        } catch (e) {
            const info = parseError(e)
            setLoadError(info.status ? `${info.message}（HTTP ${info.status}）` : info.message)
            toast.error("データの取得に失敗しました")
        } finally {
            setLoading(false)
        }
    }, [toast])

    useEffect(() => { reload() }, [reload])

    const activeDepts = useMemo(() => departments.filter(d => d.active), [departments])

    const groupedAssignees = useMemo(() => {
        return getGroupedAssignees({ assignees, activeDepts, showInactive, filterDept })
    }, [assignees, activeDepts, showInactive, filterDept])

    const toggleDeptExpanded = useCallback((key: string) => {
        setExpandedDepts(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }, [])

    const expandAll = useCallback(() => {
        setExpandedDepts(new Set(groupedAssignees.map(({ dept }) => dept ? String(dept.id) : "none")))
    }, [groupedAssignees])

    const collapseAll = useCallback(() => {
        setExpandedDepts(new Set())
    }, [])

    const allExpanded = groupedAssignees.length > 0 && groupedAssignees.every(({ dept }) => expandedDepts.has(dept ? String(dept.id) : "none"))

    const handleResync = useCallback(async () => {
        try {
            const result = await resyncStaffDirectory()
            setSync(result)
            const [d, a] = await Promise.all([getDepartments(), getAssignees()])
            setDepartments(d.sort((a, b) => a.sortOrder - b.sortOrder))
            setAssignees(a)
            if (result?.ok) toast.success("社員台帳から読み直しました")
            else toast.error("社員台帳を読めませんでした")
        } catch {
            toast.error("社員台帳を読めませんでした")
        }
    }, [toast])

    if (loading) {
        return <div className="container mx-auto py-10 max-w-3xl px-4"><p className="text-muted-foreground">読み込み中...</p></div>
    }

    return (
        <div className="container mx-auto py-10 max-w-3xl px-4">
            <MasterBreadcrumb returnTo={returnTo} title="担当者管理" />

            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-lg bg-white text-black border border-black/10">
                    <Users className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-bold">担当者管理</h1>
            </div>

            <StaffDirectoryNotice sync={sync} onResync={handleResync} />

            {loadError && (
                <div className="mb-6">
                    <MasterLoadError label="担当者・部署" message={loadError} onReload={reload} />
                </div>
            )}

            <StaffToolbar
                activeDepts={activeDepts}
                filterDept={filterDept}
                showInactive={showInactive}
                allExpanded={allExpanded}
                onFilterDeptChange={setFilterDept}
                onToggleShowInactive={() => setShowInactive(prev => !prev)}
                onToggleExpandAll={allExpanded ? collapseAll : expandAll}
            />

            <StaffGroupList
                groups={groupedAssignees}
                expandedDepts={expandedDepts}
                onToggleDeptExpanded={toggleDeptExpanded}
            />
        </div>
    )
}

export default function StaffPage() {
    return (
        <Suspense fallback={<div className="container mx-auto py-10 px-4"><p className="text-muted-foreground">読み込み中...</p></div>}>
            <StaffContent />
        </Suspense>
    )
}
