import { useState, useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalCount: number;
  filterDescription: string;
  isDeleting: boolean;
}

export function BulkDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  totalCount,
  filterDescription,
  isDeleting,
}: BulkDeleteModalProps) {
  const [confirmInput, setConfirmInput] = useState("");

  useEffect(() => {
    if (isOpen) setConfirmInput("");
  }, [isOpen]);

  const isConfirmed = confirmInput === String(totalCount);

  const handleClose = () => {
    setConfirmInput("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="一括削除">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {filterDescription} の {totalCount}件 を削除します
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          この操作は取り消せません。削除前にバックアップを取得することを推奨します。
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            確認のため削除件数「{totalCount}」を入力してください
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={String(totalCount)}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            disabled={isDeleting}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            キャンセル
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!isConfirmed || isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                削除中...
              </>
            ) : (
              "削除を実行"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
