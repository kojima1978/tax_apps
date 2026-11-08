import type { AssetInput } from '@/domain/types';
import { reviewMark, reviewTooltip } from '@/domain/review';

/**
 * 取込の行の印（未確認の間だけ）。要確認＝赤、取込＝紫。
 * ツールチップに取込元（ファイル・ページ）と取込時の注意を出す。印刷には出さない。
 */
export function ReviewBadge({ asset }: { asset: AssetInput }) {
  const mark = reviewMark(asset);
  if (!mark) return null;
  const attention = mark === 'attention';
  return (
    <span
      className={`inline-block cursor-help whitespace-nowrap rounded border px-1 text-[10px] leading-4 print:hidden ${
        attention
          ? 'border-red-300 bg-red-100 text-red-800'
          : 'border-purple-300 bg-purple-100 text-purple-800'
      }`}
      title={reviewTooltip(asset)}
      aria-label={`${attention ? '要確認' : '取込（未確認）'}: ${reviewTooltip(asset).replace(/\n/g, '。')}`}
    >
      {attention ? '要確認' : '取込'}
    </span>
  );
}
