'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import { usePassbookStore } from '@/store/passbookStore';

export default function ImageUploader() {
  const { uploadImage, isProcessing, error } = usePassbookStore();
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedFileName, setUploadedFileName] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploadedFileName(file.name);
    setUploadStatus('uploading');

    try {
      await uploadImage(file);
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 2000);
    } catch (error) {
      setUploadStatus('error');
      console.error('Upload error:', error);
    }
  }, [uploadImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    disabled: isProcessing,
  });

  return (
    <div className="space-y-6">
      {/* Session Info */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">セッション情報</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              銀行名（任意）
            </label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="例: みずほ銀行"
              disabled={isProcessing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              口座番号（任意）
            </label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="例: 1234567"
              disabled={isProcessing}
            />
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">画像アップロード</h2>

        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-all duration-200
            ${isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-4">
            {uploadStatus === 'uploading' && (
              <>
                <Loader2 size={64} className="text-primary-600 animate-spin" />
                <div>
                  <p className="text-lg font-medium text-gray-900">処理中...</p>
                  <p className="text-sm text-gray-500 mt-1">
                    画像を解析しています
                  </p>
                </div>
              </>
            )}

            {uploadStatus === 'success' && (
              <>
                <CheckCircle size={64} className="text-success-600" />
                <div>
                  <p className="text-lg font-medium text-gray-900">完了！</p>
                  <p className="text-sm text-gray-500 mt-1">{uploadedFileName}</p>
                </div>
              </>
            )}

            {uploadStatus === 'idle' && (
              <>
                {isDragActive ? (
                  <>
                    <Upload size={64} className="text-primary-600" />
                    <p className="text-lg font-medium text-gray-900">
                      ここにドロップ
                    </p>
                  </>
                ) : (
                  <>
                    <ImageIcon size={64} className="text-gray-400" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        画像をドラッグ&ドロップ
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        またはクリックしてファイルを選択
                      </p>
                    </div>
                  </>
                )}
              </>
            )}

            {uploadStatus === 'error' && (
              <>
                <ImageIcon size={64} className="text-error-600" />
                <div>
                  <p className="text-lg font-medium text-error-600">
                    エラーが発生しました
                  </p>
                  {error && (
                    <p className="text-sm text-gray-500 mt-1">{error}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {uploadStatus === 'idle' && (
            <div className="mt-6 text-xs text-gray-500">
              対応形式: JPG, PNG, BMP, TIFF | 最大サイズ: 10MB
            </div>
          )}
        </div>

        {/* Processing Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            処理の流れ
          </h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>1. 画像前処理（印影除去、ノイズ低減、傾き補正）</li>
            <li>2. PaddleOCR 3.3.x (PP-OCRv5) による文字認識</li>
            <li>3. 表構造解析と取引データ抽出</li>
            <li>4. 残高バリデーションと誤認識検出</li>
            <li>5. 編集画面への遷移</li>
          </ul>
          <p className="text-xs text-blue-700 mt-3">
            処理時間: 約1.5〜3秒/ページ（RTX 3060使用時）
          </p>
        </div>
      </div>
    </div>
  );
}
