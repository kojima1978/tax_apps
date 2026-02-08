'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Trash2 } from 'lucide-react';
import { BTN_CLASS, HOVER_CLASS } from '@/lib/button-styles';
import { useToast } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';

type HeaderProps = {
  showClearButton?: boolean;
};

export default function Header({ showClearButton = false }: HeaderProps) {
  const router = useRouter();
  const toast = useToast();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleClearData = () => {
    setShowConfirm(true);
  };

  const executeClearData = () => {
    setShowConfirm(false);
    localStorage.removeItem('formData');
    toast.success('データをクリアしました。');
    window.location.reload();
  };

  return (
    <>
      <header className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" title="ポータルに戻る" className="text-gray-400 hover:text-emerald-600 transition-colors">
              <Home size={24} />
            </a>
            <img
              src="/medical/calculator.svg"
              alt="計算機"
              width="60"
              height="60"
            />
            <h1 className="text-2xl font-bold m-0">
              出資持分の評価額試算ツール
            </h1>
          </div>
          {showClearButton ? (
            <button
              onClick={handleClearData}
              className={`${BTN_CLASS} ${HOVER_CLASS}`}
            >
              <Trash2 size={20} />
              データクリア
            </button>
          ) : (
            <button
              onClick={handleGoHome}
              className={`${BTN_CLASS} ${HOVER_CLASS}`}
            >
              <Home size={20} />
              ホームに戻る
            </button>
          )}
        </div>
      </header>
      <ConfirmDialog
        isOpen={showConfirm}
        onConfirm={executeClearData}
        onCancel={() => setShowConfirm(false)}
        title="データクリア"
        message="すべてのデータをクリアしますか？&#10;この操作は取り消せません。"
      />
    </>
  );
}
