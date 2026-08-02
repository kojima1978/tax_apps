'use client';

import React, { useRef, useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { fileToLogoDataUrl, LOGO_ACCEPT_ATTRIBUTE, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT } from '@/lib/agencyLogo';

interface AgencyLogoPickerProps {
  value?: string;
  onChange: (logoDataUrl: string | undefined) => void;
  onError: (message: string) => void;
  // compact は代理店マスター管理の表セル用（プレビュー小・アイコンのみ）
  variant?: 'form' | 'compact';
}

const AgencyLogoPicker: React.FC<AgencyLogoPickerProps> = ({ value, onChange, onError, variant = 'form' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const compact = variant === 'compact';
  const buttonClass = compact ? 'am-icon-btn' : 'agency-master-action-btn';

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 同じファイルを選び直しても change が発火するようにクリアしておく
    e.target.value = '';
    if (!file) return;

    setIsLoading(true);
    try {
      onChange(await fileToLogoDataUrl(file));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'ロゴ画像を読み込めませんでした');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`agency-logo-row${compact ? ' is-compact' : ''}`}>
      <div className="agency-logo-preview">
        {value ? (
          /* data URL なので next/image の最適化は使えない */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={value} alt="代理店ロゴ" />
        ) : (
          <span className="agency-logo-empty">未登録</span>
        )}
      </div>
      <div className="agency-logo-controls">
        <div className="agency-logo-buttons">
          <button
            type="button"
            className={buttonClass}
            onClick={() => inputRef.current?.click()}
            disabled={isLoading}
            title="画像を選択"
          >
            <Upload size={15} />
            {!compact && <span>{isLoading ? '読み込み中...' : '画像を選択'}</span>}
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => onChange(undefined)}
            disabled={!value || isLoading}
            title="ロゴを削除"
          >
            <Trash2 size={15} />
            {!compact && <span>削除</span>}
          </button>
        </div>
        {!compact && (
          <p className="agency-logo-hint">
            PNG / JPEG / WebP。長辺 {LOGO_MAX_WIDTH}×{LOGO_MAX_HEIGHT}px に自動縮小して保存します。
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={LOGO_ACCEPT_ATTRIBUTE}
        onChange={handleSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default AgencyLogoPicker;
