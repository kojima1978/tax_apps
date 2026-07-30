import type { Asset } from '@/types';

/** カテゴリセクションのDOM id（ナビからのジャンプ先） */
export function categorySectionId(label: string): string {
  return `cat-${label}`;
}

/** カテゴリセクションへスクロール（オフセットは対象側の scroll-mt-* に任せる） */
export function scrollToCategory(label: string) {
  const el = document.getElementById(categorySectionId(label));
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

interface Props {
  groups: [string, Asset[]][];
}

/**
 * カテゴリ名＋件数のチップ一覧。
 * カテゴリが増えると縦スクロールが長くなるため、目的の表へ直接飛べるようにする。
 */
export function CategoryNav({ groups }: Props) {
  if (groups.length === 0) return null;

  return (
    <nav
      className="flex flex-wrap gap-1.5 bg-white rounded-md border border-gray-200 px-3 py-2"
      aria-label="カテゴリ一覧"
    >
      {groups.map(([label, assets]) => {
        const within3 = assets.filter((a) => a.isWithin3Years).length;
        return (
          <button
            key={label}
            onClick={() => scrollToCategory(label)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-gray-200 bg-gray-50 text-gray-700 hover:border-green-400 hover:bg-green-50 hover:text-green-800 cursor-pointer transition-colors"
            title={`${label} へ移動`}
          >
            {within3 > 0 && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0"
                aria-label={`3年以内取得 ${within3}件`}
              />
            )}
            <span>{label}</span>
            <span className="text-gray-500">{assets.length}件</span>
          </button>
        );
      })}
    </nav>
  );
}
