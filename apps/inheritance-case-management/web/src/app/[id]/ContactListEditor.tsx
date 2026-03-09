"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { EmptyState } from "@/components/ui/EmptyState"
import { UserPlus } from "lucide-react"
import type { Contact } from "@/types/shared"

interface ContactListEditorProps {
    contacts: Contact[]
    onChange: (contacts: Contact[]) => void
}

export function ContactListEditor({ contacts, onChange }: ContactListEditorProps) {
    const handleFieldChange = (index: number, field: keyof Contact, value: string) => {
        const newContacts = [...contacts]
        newContacts[index] = { ...newContacts[index], [field]: value }
        onChange(newContacts)
    }

    const handleAdd = () => {
        onChange([...contacts, { name: "", phone: "", email: "" }])
    }

    const handleDelete = (index: number) => {
        if (!confirm("この連絡先を削除してもよろしいですか？")) return
        onChange(contacts.filter((_, i) => i !== index))
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end">
                <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
                    + 追加
                </Button>
            </div>
            {contacts.map((contact, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg relative">
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
                    <div className="space-y-2">
                        <Label>メールアドレス</Label>
                        <Input
                            value={contact.email}
                            onChange={(e) => handleFieldChange(index, "email", e.target.value)}
                            placeholder="example@email.com"
                        />
                    </div>
                    {contacts.length > 1 && (
                        <div className="col-span-1 md:col-span-3 flex justify-end -mt-2">
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
