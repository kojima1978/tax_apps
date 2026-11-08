import { useMemo } from 'react';
import { ClipboardCheck, Check } from 'lucide-react';
import type { Asset } from '@/domain/types';
import { buildReviewGroups, describeSource } from '@/domain/review';

interface Props {
  assets: Asset[];
  /** 該当行へ移動する */
  onJump: (assetId: string) => void;
  /** 確認済みにする（ids 省略で取込の行すべて） */
  onConfirm: (ids?: readonly string[]) => void;
}

interface Section {
  key: string;
  title: string;
  hint: string;
  tone: 'red' | 'purple';
  items: { asset: Asset; detail: string }[];
  /** 「確認済み」ボタンを出すか（未入力は直すしかないので出さない） */
  confirmable: boolean;
}

const TONE = {
  red: { box: 'border-red-200 bg-red-50/60', title: 'text-red-800', hover: 'hover:bg-red-100' },
  purple: { box: 'border-purple-200 bg-purple-50/60', title: 'text-purple-900', hover: 'hover:bg-purple-100' },
} as const;

/**
 * 取込の確認（台帳 PDF などから自動で入った行を、人が見終えるまで並べる）。
 * 取込の行が1つも無い案件では出さない。印刷にも出さない。
 */
export function IntakeReviewPanel({ assets, onJump, onConfirm }: Props) {
  const groups = useMemo(() => buildReviewGroups(assets), [assets]);
  if (!groups.hasIntake) return null;

  const sourceOf = (a: Asset) => (a.source ? describeSource(a.source) : '');
  const sections: Section[] = [
    {
      key: 'attention',
      title: '読み取りに自信が無い・取込時の注意あり',
      hint: '台帳と見比べてください',
      tone: 'red',
      confirmable: true,
      items: groups.attention.map((asset) => ({
        asset,
        detail: [asset.source?.uncertain ? '読み取りに自信なし' : '', ...(asset.review?.warnings ?? [])]
          .filter(Boolean)
          .join(' ／ '),
      })),
    },
    {
      key: 'building',
      title: '賃貸・固定資産税評価明細の確認',
      hint: '台帳からは分かりません。賃貸か、固定資産税の評価明細があるかを確かめてください',
      tone: 'purple',
      confirmable: true,
      items: groups.building.map((asset) => ({
        asset,
        detail: `賃貸 ${asset.isRental ? 'あり' : 'なし'}・評価明細 ${asset.hasFixedAssetTaxRecord ? 'あり' : 'なし'}`,
      })),
    },
    {
      key: 'missing',
      title: '必須の値が入っていない',
      hint: '直すと評価額が出ます',
      tone: 'red',
      confirmable: false,
      items: groups.missing.map(({ asset, fields }) => ({ asset, detail: `${fields.join('・')}が未入力` })),
    },
    {
      key: 'other',
      title: '自動で入った行',
      hint: '値を見て問題なければ「確認済み」',
      tone: 'purple',
      confirmable: true,
      items: groups.other.map((asset) => ({ asset, detail: sourceOf(asset) })),
    },
  ];

  const done = groups.pendingCount === 0 && groups.missing.length === 0;

  return (
    <section
      aria-labelledby="intake-review-title"
      className="rounded-md border border-purple-300 bg-white p-3 text-sm print:hidden"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 id="intake-review-title" className="flex items-center gap-1.5 font-bold text-purple-900">
          <ClipboardCheck size={16} aria-hidden="true" />
          取込の確認
        </h3>
        <span className="text-xs text-gray-600">
          {done
            ? 'すべて確認済みです'
            : `未確認 ${groups.pendingCount}件。行を直すか「確認済み」を押すと一覧から外れます`}
        </span>
        {groups.pendingCount > 0 && (
          <button
            type="button"
            onClick={() => onConfirm()}
            className="ml-auto flex min-h-9 items-center gap-1 rounded-md border border-purple-300 px-3 py-1 text-xs font-medium text-purple-800 transition-colors hover:bg-purple-50 cursor-pointer"
          >
            <Check size={14} aria-hidden="true" /> すべて確認済みにする
          </button>
        )}
      </div>

      {sections
        .filter((s) => s.items.length > 0)
        .map((s) => (
          <div key={s.key} className={`mt-2 rounded border p-2 ${TONE[s.tone].box}`}>
            <p className={`text-xs font-semibold ${TONE[s.tone].title}`}>
              {s.title}（{s.items.length}件）
              <span className="ml-2 font-normal opacity-80">{s.hint}</span>
            </p>
            <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto">
              {s.items.map(({ asset, detail }) => (
                <li key={asset.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onJump(asset.id)}
                    className={`flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 rounded px-1 py-0.5 text-left text-xs transition-colors cursor-pointer ${TONE[s.tone].hover}`}
                    title={`該当行へ移動${asset.source ? `\n取込元: ${sourceOf(asset)}` : ''}`}
                  >
                    <span className="shrink-0 font-mono tabular-nums opacity-70">NO {asset.no || '—'}</span>
                    <span className="min-w-0 max-w-full truncate">{asset.name || '（名称未入力）'}</span>
                    <span className="shrink-0 text-[11px] opacity-70">{asset.categoryLabel}</span>
                    {/* スマホ幅では理由を次の行へ回す（横に詰めると1文字ずつ折り返す） */}
                    <span className="min-w-0 basis-full text-gray-700 sm:basis-auto">{detail}</span>
                  </button>
                  {s.confirmable && (
                    <button
                      type="button"
                      onClick={() => onConfirm([asset.id])}
                      className="shrink-0 rounded border border-gray-300 bg-white px-2 py-0.5 text-[11px] text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer"
                      aria-label={`NO ${asset.no || '—'} ${asset.name || '（名称未入力）'} を確認済みにする`}
                    >
                      確認済み
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </section>
  );
}
