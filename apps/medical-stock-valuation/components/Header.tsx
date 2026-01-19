'use client';

import { useRouter } from 'next/navigation';
import { Home, Trash2 } from 'lucide-react';
import { buttonStyle, buttonHoverClass } from '@/lib/button-styles';
import { useToast } from '@/components/Toast';

type HeaderProps = {
  showClearButton?: boolean;
};

export default function Header({ showClearButton = false }: HeaderProps) {
  const router = useRouter();
  const toast = useToast();

  const handleGoHome = () => {
    router.push('/');
  };

  const handleClearData = () => {
    if (confirm('すべてのデータをクリアしますか？\nこの操作は取り消せません。')) {
      // localStorageのformDataをクリア
      localStorage.removeItem('formData');
      toast.success('データをクリアしました。');
      // ページをリロードして状態をリセット
      window.location.reload();
    }
  };

  return (
    <header className="bg-white shadow-sm rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
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
            className={buttonHoverClass}
            style={buttonStyle}
          >
            <Trash2 size={20} />
            データクリア
          </button>
        ) : (
          <button
            onClick={handleGoHome}
            className={buttonHoverClass}
            style={buttonStyle}
          >
            <Home size={20} />
            ホームに戻る
          </button>
        )}
      </div>
    </header>
  );
}
