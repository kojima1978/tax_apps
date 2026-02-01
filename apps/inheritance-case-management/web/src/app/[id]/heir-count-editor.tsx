"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { useToast } from "@/components/ui/Toast"

export function HeirCountEditor({ initialCount }: { initialCount: number }) {
    const toast = useToast()
    const [count, setCount] = useState(initialCount)
    const [isEditing, setIsEditing] = useState(false)

    const handleSave = () => {
        // Here you would typically call a Server Action or API
        setIsEditing(false)
        console.log("Saved new count:", count)
        toast.success(`相続人数を${count}名に更新しました`)
    }

    if (isEditing) {
        return (
            <div className="flex items-end gap-2">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="heir-count">相続人数</Label>
                    <Input
                        type="number"
                        id="heir-count"
                        value={count}
                        onChange={(e) => setCount(parseInt(e.target.value) || 0)}
                        className="w-32"
                    />
                </div>
                <Button onClick={handleSave} size="sm">保存</Button>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>キャンセル</Button>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-4">
            <div>
                <span className="text-sm font-medium text-muted-foreground mr-2">相続人数:</span>
                <span className="text-lg font-bold">{count}名</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>変更</Button>
        </div>
    )
}
