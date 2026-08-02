import { Fragment, useState } from 'react';
import {
  Trash2,
  Plus,
  Hash,
  Calendar,
  ArrowUp,
  ArrowDown,
  ArrowRightLeft,
  GripVertical,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Asset, AnyAssetCategory, AssetCategory } from '@/types';
import { CATEGORY_CONFIG } from '@/types';
import type { SortKey, SortDirection } from '@/hooks/useAssetData';
import { CategorySelect } from '@/components/CategorySelect';
import { categorySectionId } from '@/components/CategoryNav';
import { formatYen, formatDepreciation, calcGroupTotals } from '@/utils/formatters';
import { MobileAssetCards } from './MobileAssetCards';

const SORT_OPTIONS: { key: SortKey; icon: LucideIcon; label: string }[] = [
  { key: 'no', icon: Hash, label: 'NO' },
  { key: 'acquisitionDate', icon: Calendar, label: '取得年月日' },
];

const DIRECTION_LABEL: Record<SortDirection, string> = {
  asc: '昇順',
  desc: '降順',
};

/** カテゴリ（小計グループ）自体の移動ボタン */
const CATEGORY_MOVES: { direction: -1 | 1; icon: LucideIcon; label: string }[] = [
  { direction: -1, icon: ArrowUp, label: '上へ' },
  { direction: 1, icon: ArrowDown, label: '下へ' },
];

/** スティッキーカラムの背景色 */
const stickyBg = (isHighlight: boolean) =>
  isHighlight ? 'bg-yellow-50' : 'bg-white';

/** 金額入力: フォーカス時は生数値、ブラー時はカンマフォーマット */
function MoneyInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  return (
    <input
      type="text"
      value={editing ? raw : value ? formatYen(value) : ''}
      onFocus={() => { setEditing(true); setRaw(value ? String(value) : ''); }}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => {
        const v = Number(raw.replace(/,/g, ''));
        if (!isNaN(v)) onChange(v);
        setEditing(false);
      }}
      className="w-full px-1 py-0.5 border rounded text-xs text-right font-mono"
      aria-label={ariaLabel}
    />
  );
}

interface Props {
  groupedAssets: Map<string, Asset[]>;
  /** 計算結果の列（経過年数・償却額/残価率・評価根拠）を表示するか */
  showDetail: boolean;
  onUpdateAsset: (id: string, updates: Partial<Asset>) => void;
  onDeleteAsset: (id: string) => void;
  onAddEmptyAsset: (category: AnyAssetCategory, categoryLabel: string) => void;
  onToggleFixedAssetTaxBulk: (label: string, checked: boolean) => void;
  onSortAssets: (label: string, sortBy: SortKey, direction: SortDirection) => void;
  onMoveAsset: (label: string, sourceId: string, targetId: string) => void;
  onMoveCategory: (label: string, direction: -1 | 1) => void;
  onMoveCategoryTo: (label: string, index: number) => void;
}

/** ドラッグ中の状態 */
interface DragState {
  label: string;
  sourceId: string;
  overId: string | null;
}

export function AssetTable({
  groupedAssets,
  showDetail,
  onUpdateAsset,
  onDeleteAsset,
  onAddEmptyAsset,
  onToggleFixedAssetTaxBulk,
  onSortAssets,
  onMoveAsset,
  onMoveCategory,
  onMoveCategoryTo,
}: Props) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [sortState, setSortState] = useState<
    Record<string, { key: SortKey; direction: SortDirection }>
  >({});
  const [drag, setDrag] = useState<DragState | null>(null);
  // ハンドルを押している行だけ draggable にして、セル内の文字選択を妨げない
  const [handleRow, setHandleRow] = useState<string | null>(null);
  // カテゴリ変更パネルを開いている行
  const [categoryRow, setCategoryRow] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (pendingDelete === id) {
      onDeleteAsset(id);
      setPendingDelete(null);
    } else {
      setPendingDelete(id);
    }
  };

  /** カテゴリ変更 = 小計グループの移動。categoryLabel も揃える */
  const handleCategoryChange = (id: string, category: AssetCategory) => {
    onUpdateAsset(id, { category, categoryLabel: category });
    setCategoryRow(null);
  };

  /** 同じキーをもう一度押したら昇順/降順を反転 */
  const handleSort = (label: string, key: SortKey) => {
    const current = sortState[label];
    const direction: SortDirection =
      current?.key === key && current.direction === 'asc' ? 'desc' : 'asc';
    setSortState((prev) => ({ ...prev, [label]: { key, direction } }));
    onSortAssets(label, key, direction);
  };

  /** ↑↓キーでの並べ替え（ドラッグの代替） */
  const handleGripKey = (
    e: React.KeyboardEvent,
    label: string,
    assets: Asset[],
    id: string
  ) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const idx = assets.findIndex((a) => a.id === id);
    const target = assets[e.key === 'ArrowUp' ? idx - 1 : idx + 1];
    if (target) onMoveAsset(label, id, target.id);
  };

  // 空グループを除いてから描画する（カテゴリ移動の端判定を正しくするため）
  const groups = Array.from(groupedAssets.entries()).filter(
    ([, assets]) => assets.length > 0
  );

  return (
    <>
      <MobileAssetCards
        groups={groups}
        showDetail={showDetail}
        onUpdateAsset={onUpdateAsset}
        onDeleteAsset={onDeleteAsset}
        onAddEmptyAsset={onAddEmptyAsset}
        onToggleFixedAssetTaxBulk={onToggleFixedAssetTaxBulk}
        onSortAssets={onSortAssets}
        onMoveAsset={onMoveAsset}
        onMoveCategory={onMoveCategory}
      />
      <div className="hidden space-y-6 md:block">
      {groups.map(([label, assets], groupIndex) => {
        const category = assets[0]!.category;
        const config = CATEGORY_CONFIG[category];
        const sort = sortState[label];
        const within3 = assets.filter((a) => a.isWithin3Years).length;

        const { totalAcquisition, totalEvaluation, totalBookValue } = calcGroupTotals(assets);

        // 合計行のcolSpan計算用
        const leadSpan = 5 + (showDetail ? 1 : 0); // ハンドル〜耐用年数
        const trailSpan =
          (showDetail ? 1 : 0) + // 評価根拠
          (config.hasFixedAssetTaxRecord ? 1 : 0) +
          (config.hasRental ? 1 : 0) +
          1; // 操作列
        const colCount = leadSpan + (showDetail ? 4 : 3) + trailSpan;

        return (
          <div
            key={label}
            id={categorySectionId(label)}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden scroll-mt-16"
          >
            {/* カテゴリヘッダー */}
            <div className="bg-green-50 border-b px-4 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 min-w-0">
                {/* カテゴリの並べ替え（表の順序＝Excel出力の順序） */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {CATEGORY_MOVES.map(({ direction, icon: Icon, label: moveLabel }) => (
                    <button
                      key={direction}
                      onClick={() => onMoveCategory(label, direction)}
                      disabled={
                        direction === -1
                          ? groupIndex === 0
                          : groupIndex === groups.length - 1
                      }
                      className="p-1 rounded border border-transparent text-green-700 cursor-pointer transition-colors hover:bg-green-100 hover:border-green-300 disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent"
                      aria-label={`${label} を${moveLabel}移動`}
                      title={`このカテゴリを${moveLabel}移動`}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
                  {/* 離れた位置へは1段ずつ押さずに直接指定できるようにする */}
                  {groups.length > 2 && (
                    <select
                      value={groupIndex}
                      onChange={(e) => onMoveCategoryTo(label, Number(e.target.value))}
                      className="ml-0.5 px-1 py-0.5 text-xs rounded border border-green-300 bg-white text-green-800 cursor-pointer"
                      aria-label={`${label} の位置（全${groups.length}件中）`}
                      title="このカテゴリを◯番目へ移動"
                    >
                      {groups.map((_, i) => (
                        <option key={i} value={i}>
                          {i + 1}番目
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <h3 className="font-bold text-green-800 shrink-0 flex items-center gap-2">
                  {label}（{assets.length}件）
                  {within3 > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs font-normal">
                      3年以内 {within3}件
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {config.hasFixedAssetTaxRecord && (
                  <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assets.every((a) => a.hasFixedAssetTaxRecord)}
                      onChange={(e) => onToggleFixedAssetTaxBulk(label, e.target.checked)}
                      className="rounded cursor-pointer"
                      aria-label={`${label} 固定資産税評価明細 一括`}
                    />
                    固定資産税評価明細 一括
                  </label>
                )}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-500">並び替え</span>
                  {SORT_OPTIONS.map(({ key, icon: Icon, label: sortLabel }) => {
                    const active = sort?.key === key;
                    const DirIcon =
                      active && sort.direction === 'desc' ? ArrowDown : ArrowUp;
                    return (
                      <button
                        key={key}
                        onClick={() => handleSort(label, key)}
                        className={`flex items-center gap-0.5 px-1.5 py-1 rounded border cursor-pointer transition-colors ${
                          active
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700'
                        }`}
                        aria-label={
                          active
                            ? `${label}を${sortLabel}の${DIRECTION_LABEL[sort.direction]}で並べ替え中。押すと反転`
                            : `${label}を${sortLabel}順に並べ替え`
                        }
                        title={
                          active
                            ? `もう一度押すと${DIRECTION_LABEL[sort.direction === 'asc' ? 'desc' : 'asc']}`
                            : `${sortLabel}順に並べ替え`
                        }
                      >
                        <Icon size={12} />
                        {sortLabel}
                        {active && (
                          <>
                            <DirIcon size={12} />
                            {DIRECTION_LABEL[sort.direction]}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => onAddEmptyAsset(category, label)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer transition-colors"
                >
                  <Plus size={12} /> 行追加
                </button>
              </div>
            </div>

            {/* テーブル */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <caption className="sr-only">
                  {label} 資産一覧（左端のハンドルをドラッグ、または ↑↓ キーで並べ替え）
                </caption>
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="w-7 sticky left-0 bg-gray-50 z-10">
                      <span className="sr-only">並べ替え</span>
                    </th>
                    <th className="px-2 py-1.5 text-left w-12 sticky left-7 bg-gray-50 z-10">NO</th>
                    <th className="px-2 py-1.5 text-left w-40 sticky left-[76px] bg-gray-50 z-10">名称</th>
                    <th className="px-2 py-1.5 text-left w-24">取得年月</th>
                    {showDetail && (
                      <th className="px-2 py-1.5 text-center w-14">経過年数</th>
                    )}
                    <th className="px-2 py-1.5 text-center w-14">耐用年数</th>
                    <th className="px-2 py-1.5 text-right w-24">取得価額</th>
                    {showDetail && (
                      <th className="px-2 py-1.5 text-right w-24">{config.headerLabel}</th>
                    )}
                    <th className="px-2 py-1.5 text-right w-24">相続税評価額</th>
                    <th className="px-2 py-1.5 text-right w-24">期末簿価</th>
                    {showDetail && (
                      <th className="px-2 py-1.5 text-center w-28">評価根拠</th>
                    )}
                    {config.hasFixedAssetTaxRecord && (
                      <th className="px-2 py-1.5 text-center w-16">固資税</th>
                    )}
                    {config.hasRental && (
                      <th className="px-2 py-1.5 text-center w-12">賃貸</th>
                    )}
                    <th className="px-2 py-1.5 w-14">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const isDragging = drag?.sourceId === asset.id;
                    const isDropTarget =
                      drag?.label === label && drag.overId === asset.id;
                    return (
                    <Fragment key={asset.id}>
                    <tr
                      draggable={handleRow === asset.id}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        setDrag({ label, sourceId: asset.id, overId: null });
                      }}
                      onDragOver={(e) => {
                        if (!drag || drag.label !== label || drag.sourceId === asset.id) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (drag.overId !== asset.id) {
                          setDrag({ ...drag, overId: asset.id });
                        }
                      }}
                      onDrop={(e) => {
                        if (!drag || drag.label !== label) return;
                        e.preventDefault();
                        onMoveAsset(label, drag.sourceId, asset.id);
                        setDrag(null);
                        setHandleRow(null);
                      }}
                      onDragEnd={() => {
                        setDrag(null);
                        setHandleRow(null);
                      }}
                      className={`border-b hover:bg-gray-50 ${
                        asset.isWithin3Years ? 'bg-yellow-50' : ''
                      } ${isDragging ? 'opacity-40' : ''} ${
                        isDropTarget ? 'border-t-2 border-t-green-500' : ''
                      }`}
                    >
                      <td className={`sticky left-0 z-10 ${stickyBg(asset.isWithin3Years)}`}>
                        <button
                          onMouseDown={() => setHandleRow(asset.id)}
                          onMouseUp={() => setHandleRow(null)}
                          onKeyDown={(e) => handleGripKey(e, label, assets, asset.id)}
                          className="flex w-full justify-center text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                          aria-label={`${asset.name || '資産'} の位置を変更（ドラッグ、または ↑↓ キー）`}
                          title="ドラッグ、または ↑↓ キーで並べ替え"
                        >
                          <GripVertical size={14} />
                        </button>
                      </td>
                      <td className={`px-2 py-1 sticky left-7 z-10 ${stickyBg(asset.isWithin3Years)}`}>
                        <input
                          type="number"
                          value={asset.no || ''}
                          onChange={(e) => onUpdateAsset(asset.id, { no: Number(e.target.value) })}
                          className="w-full px-1 py-0.5 border rounded text-xs"
                          aria-label={`${asset.name || '資産'} NO`}
                        />
                      </td>
                      <td className={`px-2 py-1 sticky left-[76px] z-10 ${stickyBg(asset.isWithin3Years)}`}>
                        <input
                          type="text"
                          value={asset.name}
                          onChange={(e) => onUpdateAsset(asset.id, { name: e.target.value })}
                          className="w-full px-1 py-0.5 border rounded text-xs"
                          aria-label="資産名称"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="date"
                          value={asset.acquisitionDate}
                          onChange={(e) => onUpdateAsset(asset.id, { acquisitionDate: e.target.value })}
                          className="w-full px-1 py-0.5 border rounded text-xs"
                          aria-label={`${asset.name || '資産'} 取得年月`}
                        />
                        {asset.isWithin3Years && (
                          <span className="inline-block mt-0.5 px-1 rounded bg-yellow-100 border border-yellow-300 text-yellow-800 text-[10px]">
                            3年以内 → 簿価
                          </span>
                        )}
                      </td>
                      {showDetail && (
                        <td className="px-2 py-1 text-center font-mono">
                          {asset.elapsedYears}
                        </td>
                      )}
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={asset.usefulLife || ''}
                          onChange={(e) => onUpdateAsset(asset.id, { usefulLife: Number(e.target.value) })}
                          className="w-full px-1 py-0.5 border rounded text-xs text-center"
                          aria-label={`${asset.name || '資産'} 耐用年数`}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <MoneyInput
                          value={asset.acquisitionCost}
                          onChange={(v) => onUpdateAsset(asset.id, { acquisitionCost: v })}
                          ariaLabel={`${asset.name || '資産'} 取得価額`}
                        />
                      </td>
                      {showDetail && (
                        <td className="px-2 py-1 text-right font-mono">
                          {formatDepreciation(category, asset.depreciationAmountOrRate)}
                        </td>
                      )}
                      <td className="px-2 py-1 text-right font-mono">
                        {asset.evaluationAmount === null ? (
                          <span className="text-gray-500">−</span>
                        ) : (
                          formatYen(asset.evaluationAmount)
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <MoneyInput
                          value={asset.bookValue}
                          onChange={(v) => onUpdateAsset(asset.id, { bookValue: v })}
                          ariaLabel={`${asset.name || '資産'} 期末簿価`}
                        />
                      </td>
                      {showDetail && (
                        <td className="px-2 py-1 text-center text-[10px] text-gray-600">
                          {asset.evaluationBasis}
                        </td>
                      )}
                      {config.hasFixedAssetTaxRecord && (
                        <td className="px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={asset.hasFixedAssetTaxRecord}
                            onChange={(e) => onUpdateAsset(asset.id, { hasFixedAssetTaxRecord: e.target.checked })}
                            className="rounded cursor-pointer"
                            aria-label={`${asset.name || '資産'} 固定資産税評価明細`}
                          />
                        </td>
                      )}
                      {config.hasRental && (
                        <td className="px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={asset.isRental}
                            onChange={(e) => onUpdateAsset(asset.id, { isRental: e.target.checked })}
                            className="rounded cursor-pointer"
                            aria-label={`${asset.name || '資産'} 賃貸`}
                          />
                        </td>
                      )}
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setCategoryRow((prev) => (prev === asset.id ? null : asset.id))
                            }
                            className={`cursor-pointer transition-colors ${
                              categoryRow === asset.id
                                ? 'text-green-600'
                                : 'text-gray-400 hover:text-green-600'
                            }`}
                            aria-label={`${asset.name || '資産'} のカテゴリを変更`}
                            title="カテゴリを変更"
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(asset.id)}
                            onBlur={() => setPendingDelete(null)}
                            className={`flex items-center gap-0.5 cursor-pointer transition-colors whitespace-nowrap ${
                              pendingDelete === asset.id
                                ? 'text-red-600 hover:text-red-700'
                                : 'text-gray-400 hover:text-red-500'
                            }`}
                            aria-label={`${asset.name || '資産'} を削除`}
                          >
                            <Trash2 size={14} />
                            {pendingDelete === asset.id && (
                              <span className="text-[10px] font-medium">確認</span>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* カテゴリ変更パネル（開いた行の直下） */}
                    {categoryRow === asset.id && (
                      <tr className="border-b bg-green-50/60">
                        <td colSpan={colCount} className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-600 shrink-0">
                              {asset.name || '資産'} のカテゴリを変更
                            </span>
                            <div className="max-w-md flex-1">
                              <CategorySelect
                                value={asset.category}
                                onChange={(cat) => handleCategoryChange(asset.id, cat)}
                                compact
                              />
                            </div>
                            <button
                              onClick={() => setCategoryRow(null)}
                              className="text-gray-400 hover:text-gray-700 cursor-pointer"
                              aria-label="カテゴリ変更を閉じる"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold border-t-2">
                    <td colSpan={leadSpan} className="px-2 py-1.5 text-right sticky left-0 bg-gray-50 z-10">
                      合　計
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {formatYen(totalAcquisition)}
                    </td>
                    {showDetail && <td />}
                    <td className="px-2 py-1.5 text-right font-mono">
                      {formatYen(totalEvaluation)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {formatYen(totalBookValue)}
                    </td>
                    <td colSpan={trailSpan} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
      </div>
    </>
  );
}
