"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { EmptyState } from "@/components/ui/EmptyState"
import { UserPlus, Search, Loader2 } from "lucide-react"
import type { Contact } from "@/types/shared"
import { MAX_CONTACT_COLUMNS } from "@/lib/import"

interface ContactListEditorProps {
    contacts: Contact[]
    onChange: (contacts: Contact[]) => void
}

async function fetchAddress(postalCode: string): Promise<string | null> {
    const cleaned = postalCode.replace(/[^\d]/g, "")
    if (cleaned.length !== 7) return null
    try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`)
        const data = await res.json()
        if (data.results && data.results.length > 0) {
            const r = data.results[0]
            return `${r.address1}${r.address2}${r.address3}`
        }
    } catch { /* ignore */ }
    return null
}

export function ContactListEditor({ contacts, onChange }: ContactListEditorProps) {
    const [searching, setSearching] = useState<number | null>(null)

    const handleFieldChange = (index: number, field: keyof Contact, value: string) => {
        const newContacts = [...contacts]
        newContacts[index] = { ...newContacts[index], [field]: value }
        onChange(newContacts)
    }

    const handlePostalCodeChange = async (index: number, value: string) => {
        handleFieldChange(index, "postalCode", value)
        const cleaned = value.replace(/[^\d]/g, "")
        if (cleaned.length === 7) {
            setSearching(index)
            const address = await fetchAddress(cleaned)
            if (address) {
                const newContacts = [...contacts]
                newContacts[index] = { ...newContacts[index], postalCode: value, address }
                onChange(newContacts)
            }
            setSearching(null)
        }
    }

    const handleSearchClick = async (index: number) => {
        const postalCode = contacts[index].postalCode
        setSearching(index)
        const address = await fetchAddress(postalCode)
        if (address) {
            handleFieldChange(index, "address", address)
        }
        setSearching(null)
    }

    const handleAdd = () => {
        onChange([...contacts, { name: "", phone: "", postalCode: "", address: "", memo: "" }])
    }

    const handleDelete = (index: number) => {
        if (!confirm("この連絡先を削除してもよろしいですか？")) return
        onChange(contacts.filter((_, i) => i !== index))
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end">
                <Button type="button" variant="outline" size="sm" onClick={handleAdd} disabled={contacts.length >= MAX_CONTACT_COLUMNS}>
                    + 追加{contacts.length >= MAX_CONTACT_COLUMNS && `（最大${MAX_CONTACT_COLUMNS}件）`}
                </Button>
            </div>
            {contacts.map((contact, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>氏名</Label>
                            <Input
                                value={contact.name}
                                onChange={(e) => handleFieldChange(index, "name", e.target.value)}
                                placeholder="氏名"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>電話番号</Label>
                            <Input
                                value={contact.phone}
                                onChange={(e) => handleFieldChange(index, "phone", e.target.value)}
                                placeholder="090-0000-0000"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4">
                        <div className="space-y-2">
                            <Label>郵便番号</Label>
                            <div className="flex gap-1">
                                <Input
                                    value={contact.postalCode}
                                    onChange={(e) => handlePostalCodeChange(index, e.target.value)}
                                    placeholder="000-0000"
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="px-2 h-9 shrink-0"
                                    onClick={() => handleSearchClick(index)}
                                    disabled={searching === index}
                                    title="住所検索"
                                >
                                    {searching === index
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Search className="h-4 w-4" />
                                    }
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>住所</Label>
                            <Input
                                value={contact.address}
                                onChange={(e) => handleFieldChange(index, "address", e.target.value)}
                                placeholder="都道府県 市区町村 番地"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>メモ</Label>
                        <textarea
                            value={contact.memo}
                            onChange={(e) => handleFieldChange(index, "memo", e.target.value)}
                            placeholder="備考・メールアドレス等"
                            rows={2}
                            className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary min-h-[56px]"
                        />
                    </div>
                    {contacts.length > 1 && (
                        <div className="flex justify-end -mt-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 h-8 px-2"
                                onClick={() => handleDelete(index)}
                            >
                                削除
                            </Button>
                        </div>
                    )}
                </div>
            ))}
            {contacts.length === 0 && (
                <EmptyState
                    icon={UserPlus}
                    title="連絡先が登録されていません"
                    description="「+ 追加」ボタンで連絡先を追加できます"
                    action={{ label: "+ 追加", onClick: handleAdd }}
                />
            )}
        </div>
    )
}
