'use client';

import { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import ImageUploader from '@/components/ImageUploader';
import TransactionEditor from '@/components/TransactionEditor';
import ValidationPanel from '@/components/ValidationPanel';
import ExportPanel from '@/components/ExportPanel';
import { usePassbookStore } from '@/store/passbookStore';

export default function Home() {
  const { sessionId, pages, currentPage } = usePassbookStore();
  const [activeTab, setActiveTab] = useState<'upload' | 'edit' | 'export'>('upload');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                通帳OCR Pro v3.1
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                完全ローカル処理 | PaddleOCR 3.3.x (PP-OCRv5)
              </p>
            </div>

            {sessionId && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">セッションID:</span>{' '}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {sessionId.slice(0, 8)}...
                </code>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-primary-600 text-primary-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload size={18} />
            アップロード
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            disabled={!currentPage}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'edit'
                ? 'border-primary-600 text-primary-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <FileText size={18} />
            編集・確認
            {currentPage && (
              <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs">
                {pages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('export')}
            disabled={pages.length === 0}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-primary-600 text-primary-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <CheckCircle size={18} />
            出力
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'upload' && <ImageUploader />}

        {activeTab === 'edit' && currentPage && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <TransactionEditor />
            </div>
            <div>
              <ValidationPanel />
            </div>
          </div>
        )}

        {activeTab === 'export' && pages.length > 0 && <ExportPanel />}

        {activeTab === 'edit' && !currentPage && (
          <div className="card text-center py-12">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              画像をアップロードしてください
            </p>
          </div>
        )}
      </main>

      {/* Status Bar */}
      {pages.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-gray-600">総ページ数:</span>{' '}
                  <span className="font-semibold">{pages.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">エラー:</span>{' '}
                  <span className="font-semibold text-error-600">
                    {pages.reduce((sum, p) => sum + (p.error_count || 0), 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">警告:</span>{' '}
                  <span className="font-semibold text-warning-600">
                    {pages.reduce((sum, p) => sum + (p.warning_count || 0), 0)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                GPU: NVIDIA RTX 3060 | PP-OCRv5
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
