"use client"

import { useState, useRef, Suspense, type DragEvent, type ChangeEvent } from "react"
import Link from "next/link"
import { Download, Upload, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { backupDataSchema, type BackupData } from "@/types/backup"
import { exportBackup, restoreBackup } from "@/lib/api/backup"
import { useToast } from "@/components/ui/Toast"

const TABLE_LABELS: { key: keyof BackupData["data"]; label: string }[] = [
  { key: "departments", label: "部署" },
  { key: "companies", label: "会社" },
  { key: "assignees", label: "担当者" },
  { key: "referrers", label: "紹介者" },
  { key: "cases", label: "案件" },
  { key: "caseContacts", label: "連絡先" },
  { key: "caseProgress", label: "進捗" },
]

function BackupContent() {
  const toast = useToast()
  const [exporting, setExporting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [backupData, setBackupData] = useState<BackupData | null>(null)
  const [fileName, setFileName] = useState("")
  const [parseError, setParseError] = useState("")
  const [confirmInput, setConfirmInput] = useState("")
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportBackup()
    } catch {
      toast.error("エクスポートに失敗しました")
    } finally {
      setExporting(false)
    }
  }

  const parseFile = (file: File) => {
    setParseError("")
    setBackupData(null)
    setResult(null)
    setConfirmInput("")
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        const parsed = backupDataSchema.parse(json)
        setBackupData(parsed)
      } catch {
        setParseError("無効なバックアップファイルです。正しいJSONファイルを選択してください。")
      }
    }
    reader.readAsText(file)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  const handleRestore = async () => {
    if (!backupData) return
    setRestoring(true)
    setResult(null)
    try {
      const res = await restoreBackup(backupData)
      if (res.success) {
        const total = Object.values(res.counts).reduce((a, b) => a + b, 0)
        setResult({ success: true, message: `リストアが完了しました。合計 ${total} 件のレコードを復元しました。` })
        setBackupData(null)
        setFileName("")
        setConfirmInput("")
        if (fileRef.current) fileRef.current.value = ""
      }
    } catch {
      setResult({ success: false, message: "リストアに失敗しました。データを確認してください。" })
    } finally {
      setRestoring(false)
    }
  }

  const caseCount = backupData?.data.cases.length ?? 0
  const confirmValid = confirmInput === String(caseCount)

  return (
    <div className="container mx-auto py-10 max-w-2xl px-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link href="/settings" className="hover:text-foreground transition-colors">設定</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">バックアップ / リストア</span>
      </nav>

      <h1 className="text-2xl font-bold mb-8">バックアップ / リストア</h1>

      {/* Export Section */}
      <section className="border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">エクスポート</h2>
        <p className="text-sm text-muted-foreground mb-4">
          全データをJSON形式でダウンロードします。バックアップや別環境への移行に使用できます。
        </p>
        <Button onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "エクスポート中..." : "JSONエクスポート"}
        </Button>
      </section>

      {/* Import Section */}
      <section className="border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-2">リストア</h2>
        <p className="text-sm text-muted-foreground mb-4">
          エクスポートしたJSONファイルからデータを復元します。
        </p>

        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-4 ${
            dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            JSONファイルをドラッグ＆ドロップ、またはクリックして選択
          </p>
          {fileName && <p className="text-sm mt-2 font-medium">{fileName}</p>}
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Parse Error */}
        {parseError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm mb-4">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {parseError}
          </div>
        )}

        {/* Preview Table */}
        {backupData && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              エクスポート日時: {new Date(backupData.exportedAt).toLocaleString("ja-JP")}
            </div>

            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium">テーブル</th>
                  <th className="text-right px-4 py-2 font-medium">件数</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_LABELS.map(({ key, label }) => (
                  <tr key={key} className="border-t">
                    <td className="px-4 py-2">{label}</td>
                    <td className="px-4 py-2 text-right font-mono">{backupData.data[key].length}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>リストアを実行すると、現在の全データが削除され、アップロードしたデータに置き換わります。</span>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                確認のため、案件数「<span className="font-mono font-bold">{caseCount}</span>」を入力してください
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={String(caseCount)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Restore Button */}
            <Button
              variant="destructive"
              onClick={handleRestore}
              disabled={!confirmValid || restoring}
            >
              <Upload className="h-4 w-4 mr-2" />
              {restoring ? "リストア実行中..." : "リストアを実行"}
            </Button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm mt-4 ${
              result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            {result.message}
          </div>
        )}
      </section>
    </div>
  )
}

export default function BackupSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BackupContent />
    </Suspense>
  )
}
