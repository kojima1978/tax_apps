import { useEffect, useRef } from 'react'
import { cancelBtn } from '@/lib/styles'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  title: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmDialog({ isOpen, title, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) cancelRef.current?.focus()
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}
    >
      <div
        className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">削除の確認</h3>
        <p className="text-sm text-gray-600 mb-6">
          「{title}」を削除してもよろしいですか？この操作は取り消せません。
        </p>
        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className={cancelBtn}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  )
}
