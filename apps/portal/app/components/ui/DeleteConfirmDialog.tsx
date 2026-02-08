import DialogOverlay from './DialogOverlay'
import { cancelBtn } from '@/lib/styles'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  title: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmDialog({ isOpen, title, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  return (
    <DialogOverlay isOpen={isOpen} onClose={onCancel}>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">削除の確認</h3>
      <p className="text-sm text-gray-600 mb-6">
        「{title}」を削除してもよろしいですか？この操作は取り消せません。
      </p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className={cancelBtn}
          autoFocus
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
    </DialogOverlay>
  )
}
