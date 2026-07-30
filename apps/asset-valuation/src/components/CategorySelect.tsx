import {
  ASSET_CLASSES,
  CLASS_METHODS,
  CATEGORY_CONFIG,
  buildCategory,
  defaultCategoryOf,
} from '@/types';
import type {
  AnyAssetCategory,
  AssetCategory,
  AssetClass,
  DepreciationMethod,
} from '@/types';

/** 枠線の色分け */
export type CategorySelectTone = 'error' | 'auto' | 'normal';

const TONE_CLASS: Record<CategorySelectTone, string> = {
  error: 'border-red-300 bg-red-50',
  auto: 'border-green-300 bg-green-50',
  normal: 'border-gray-300 bg-white',
};

interface Props {
  value: AnyAssetCategory | '';
  onChange: (category: AssetCategory) => void;
  tone?: CategorySelectTone;
  /** 行内に置く用の小さめサイズ */
  compact?: boolean;
}

/**
 * 資産区分 → 償却方法 の2段プルダウン。
 * カテゴリ数が39あるため、1つのselectに並べず区分で絞り込ませる。
 */
export function CategorySelect({ value, onChange, tone = 'normal', compact = false }: Props) {
  const config = value ? CATEGORY_CONFIG[value] : undefined;
  const assetClass = config?.assetClass ?? '';
  const methods: readonly DepreciationMethod[] = assetClass
    ? CLASS_METHODS[assetClass]
    : [];

  const handleClassChange = (next: string) => {
    if (!next) return;
    const cls = next as AssetClass;
    const nextMethods = CLASS_METHODS[cls] as readonly DepreciationMethod[];
    // 現在の償却方法が新しい区分でも選べるなら維持する
    const method =
      config?.method && nextMethods.includes(config.method)
        ? config.method
        : undefined;
    onChange(method ? buildCategory(cls, method as never) : defaultCategoryOf(cls));
  };

  const sizeClass = compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1.5 text-sm';
  const selectClass = `${sizeClass} border rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-500 disabled:cursor-not-allowed disabled:text-gray-500 ${TONE_CLASS[tone]}`;

  return (
    <div className="flex flex-1 items-center gap-2">
      <select
        value={assetClass}
        onChange={(e) => handleClassChange(e.target.value)}
        className={`flex-1 min-w-0 ${selectClass}`}
        aria-label="資産区分"
      >
        <option value="">— 資産区分 —</option>
        {ASSET_CLASSES.map((cls) => (
          <option key={cls} value={cls}>
            {cls}
          </option>
        ))}
      </select>
      <select
        value={config?.method ?? ''}
        onChange={(e) =>
          assetClass &&
          onChange(buildCategory(assetClass, e.target.value as never))
        }
        disabled={!assetClass || methods.length <= 1}
        className={`${compact ? 'w-32' : 'w-36'} shrink-0 ${selectClass}`}
        aria-label="償却方法"
      >
        {!assetClass && <option value="">— 償却方法 —</option>}
        {methods.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
