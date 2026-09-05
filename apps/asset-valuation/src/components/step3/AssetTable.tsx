import { Fragment, useEffect, useState } from 'react';
import {
  Trash2,
  Plus,
  Hash,
  Calendar,
  ArrowUp,
  ArrowDown,
  ArrowRightLeft,
  GripVertical,
  ChevronsUp,
  ChevronsDown,
  CornerDownLeft,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Asset, AnyAssetCategory, AssetCategory } from '@/types';
import { CATEGORY_CONFIG } from '@/types';
import type { SortKey, SortDirection } from '@/hooks/useAssetData';
import { CategorySelect } from '@/components/CategorySelect';
import { categorySectionId } from '@/components/CategoryNav';
import { assetRowId } from './anchors';
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

/** Alt+↑↓ で一度に飛ぶ行数 */
const JUMP_ROWS = 5;

/** スティッキーカラムの背景色（選択中 > 3年以内 > 通常） */
const stickyBg = (isHighlight: boolean, isSelected = false) =>
  isSelected ? 'bg-green-100' : isHighlight ? 'bg-yellow-50' : 'bg-white';

/** 金額入力: フォーカス時は生数値、ブラー時はカンマフォーマット */
function MoneyInput({
  value,
  onChange,
  ariaLabel,
  dataCol,
  onKeyDown,
}: {
  value: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  dataCol: string;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
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
      onKeyDown={onKeyDown}
      data-col={dataCol}
      className="w-full px-1 py-0.5 border rounded text-xs text-right font-mono tabular-nums"
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
  onMoveAssetsTo: (label: string, ids: string[], slot: number) => void;
  onMoveCategory: (label: string, direction: -1 | 1) => void;
  onMoveCategoryTo: (label: string, index: number) => void;
  /** エラー一覧からジャンプしてきた行（一時的に強調する） */
  flashAssetId?: string | null;
}

/** ドラッグ中の状態 */
interface DragState {
  label: string;
  sourceId: string;
  overId: string | null;
}

/** 「切り取り→挿入」で移動中の行。移動はカテゴリ内限定なので label で束ねる */
interface SelectionState {
  label: string;
  ids: string[];
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
  onMoveAssetsTo,
  onMoveCategory,
  onMoveCategoryTo,
  flashAssetId,
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
  // 「切り取り→挿入」で移動中の行
  const [selection, setSelection] = useState<SelectionState | null>(null);
  // Shift+クリックの範囲選択の起点
  const [lastPicked, setLastPicked] = useState<string | null>(null);

  const clearSelection = () => {
    setSelection(null);
    setLastPicked(null);
  };

  // Escでいつでも解除できるようにする（挿入位置を探して長距離スクロールした後でも戻れる）
  useEffect(() => {
    if (!selection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSelection(null);
      setLastPicked(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection]);

  /** 行の選択トグル。Shift併用で直前に選んだ行からの範囲選択 */
  const toggleSelect = (
    label: string,
    assets: Asset[],
    id: string,
    shift: boolean
  ) => {
    setSelection((prev) => {
      // 別カテゴリの行を選んだら、そのカテゴリの選択に切り替える（移動はカテゴリ内限定）
      const base = prev?.label === label ? prev.ids : [];
      if (shift && lastPicked && base.length > 0) {
        const from = assets.findIndex((a) => a.id === lastPicked);
        const to = assets.findIndex((a) => a.id === id);
        if (from >= 0 && to >= 0) {
          const [start, end] = from < to ? [from, to] : [to, from];
          const range = assets.slice(start, end + 1).map((a) => a.id);
          return { label, ids: Array.from(new Set([...base, ...range])) };
        }
      }
      const ids = base.includes(id)
        ? base.filter((x) => x !== id)
        : [...base, id];
      return ids.length > 0 ? { label, ids } : null;
    });
    setLastPicked(id);
  };

  /** カテゴリの全行を選択／解除 */
  const toggleSelectAll = (label: string, assets: Asset[], checked: boolean) => {
    setSelection(checked ? { label, ids: assets.map((a) => a.id) } : null);
    setLastPicked(null);
  };

  // 移動中の行が属するカテゴリ（フローティングバーの「末尾へ」「1つ下へ」で使う）
  const selectedGroup = selection ? (groupedAssets.get(selection.label) ?? []) : [];
  const selectedIndexes = selection
    ? selectedGroup
        .map((a, i) => (selection.ids.includes(a.id) ? i : -1))
        .filter((i) => i >= 0)
    : [];
  const canStepUp = selectedIndexes.length > 0 && Math.min(...selectedIndexes) > 0;
  const canStepDown =
    selectedIndexes.length > 0 &&
    Math.max(...selectedIndexes) < selectedGroup.length - 1;

  /** 選択行を slot の位置へまとめて挿入して選択を解除 */
  const insertAt = (label: string, slot: number) => {
    if (selection?.label !== label) return;
    onMoveAssetsTo(label, selection.ids, slot);
    clearSelection();
  };

  /**
   * 選択行を1つ上／1つ下へずらす。
   * 「先頭へ／末尾へ」と違い連続で押す操作なので、移動後も選択を保つ。
   */
  const stepSelection = (direction: -1 | 1) => {
    if (!selection) return;
    const idSet = new Set(selection.ids);
    const indexes = selectedGroup
      .map((a, i) => (idSet.has(a.id) ? i : -1))
      .filter((i) => i >= 0);
    if (indexes.length === 0) return;
    const first = Math.min(...indexes);
    const last = Math.max(...indexes);
    if (direction === -1) {
      if (first === 0) return;
      onMoveAssetsTo(selection.label, selection.ids, first - 1);
    } else {
      if (last >= selectedGroup.length - 1) return;
      // slot は移動前のグループ内位置。1つ下の行を飛び越すので +2 する
      onMoveAssetsTo(selection.label, selection.ids, last + 2);
    }
  };

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

  /**
   * キーボードでの並べ替え（ドラッグの代替）。
   * Space=選択トグル / ↑↓=1行 / Alt+↑↓=5行 / Shift+↑↓=先頭・末尾へ
   */
  const handleGripKey = (
    e: React.KeyboardEvent,
    label: string,
    assets: Asset[],
    id: string
  ) => {
    if (e.key === ' ') {
      e.preventDefault();
      toggleSelect(label, assets, id, e.shiftKey);
      return;
    }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const idx = assets.findIndex((a) => a.id === id);
    if (idx < 0) return;
    const up = e.key === 'ArrowUp';

    if (e.shiftKey) {
      onMoveAssetsTo(label, [id], up ? 0 : assets.length);
      return;
    }
    if (e.altKey) {
      // 下方向は自分自身が抜ける分を見込んで +1 する
      onMoveAssetsTo(
        label,
        [id],
        up
          ? Math.max(0, idx - JUMP_ROWS)
          : Math.min(assets.length, idx + JUMP_ROWS + 1)
      );
      return;
    }
    const target = assets[up ? idx - 1 : idx + 1];
    if (target) onMoveAsset(label, id, target.id);
  };

  /**
   * Enterで同じ列の次の行へ移動（Shift+Enterで前の行）。
   * ↑↓ を使わないのは、数値入力では値の増減、日付入力では日付の変更に既に割り当たっているため。
   */
  const handleCellKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const col = e.currentTarget.dataset.col;
    const table = e.currentTarget.closest('table');
    if (!col || !table) return;
    e.preventDefault();
    const cells = Array.from(
      table.querySelectorAll<HTMLInputElement>(`input[data-col="${col}"]`)
    );
    const next = cells[cells.indexOf(e.currentTarget) + (e.shiftKey ? -1 : 1)];
    if (!next) return;
    next.focus();
    next.select();
  };

  /** 挿入位置の行（移動中のカテゴリにだけ挟む） */
  const insertSlotRow = (label: string, slot: number, colCount: number) => (
    <tr>
      <td colSpan={colCount} className="p-0">
        <button
          type="button"
          onClick={() => insertAt(label, slot)}
          className="flex w-full cursor-pointer items-center justify-center gap-1 border-y border-dashed border-green-400 bg-green-50 py-0.5 text-[10px] font-medium text-green-700 transition-colors hover:bg-green-200"
        >
          <CornerDownLeft size={11} /> ここに挿入
        </button>
      </td>
    </tr>
  );

  // 空グループを除いてから描画する（カテゴリ移動の端判定を正しくするため）
  const groups = Array.from(groupedAssets.entries()).filter(
    ([, assets]) => assets.length > 0
  );

  return (
    <>
      <MobileAssetCards
        groups={groups}
        showDetail={showDetail}
        flashAssetId={flashAssetId}
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
        // このカテゴリで「切り取り→挿入」の最中か
        const selecting = selection?.label === label;
        const allSelected = selecting && selection.ids.length === assets.length;

        // 合計行のcolSpan計算用
        const leadSpan = 6 + (showDetail ? 1 : 0); // 選択・ハンドル〜耐用年数
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
            className="bg-white rounded-lg border border-gray-200 scroll-mt-28"
          >
            {/* カテゴリヘッダー。スクロール中もどのカテゴリを見ているか分かるよう追従させる */}
            <div className="sticky top-[5.75rem] z-20 bg-green-50 border-b px-4 py-2 flex items-center justify-between gap-3">
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
                  <span className="text-xs font-normal text-green-700">
                    評価額 <span className="font-mono">{formatYen(totalEvaluation)}</span>
                  </span>
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
                  {label}{' '}
                  資産一覧（左端のチェックで選択して挿入位置を指定、ハンドルをドラッグ、または ↑↓
                  キーで並べ替え。Enterで同じ列の次の行へ移動）
                </caption>
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="w-8 sticky left-0 bg-gray-50 z-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => toggleSelectAll(label, assets, e.target.checked)}
                        className="rounded cursor-pointer"
                        aria-label={`${label} の全行を選択`}
                        title="このカテゴリの全行を選択"
                      />
                    </th>
                    <th className="w-7 sticky left-8 bg-gray-50 z-10">
                      <span className="sr-only">並べ替え</span>
                    </th>
                    <th className="px-2 py-1.5 text-right w-20 sticky left-[60px] bg-gray-50 z-10">NO</th>
                    <th className="px-2 py-1.5 text-left w-40 sticky left-[140px] bg-gray-50 z-10">名称</th>
                    <th className="px-2 py-1.5 text-left w-24">取得年月</th>
                    {showDetail && (
                      <th className="px-2 py-1.5 text-right w-14">経過年数</th>
                    )}
                    <th className="px-2 py-1.5 text-right w-14">耐用年数</th>
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
                  {assets.map((asset, rowIndex) => {
                    const isDragging = drag?.sourceId === asset.id;
                    const isDropTarget =
                      drag?.label === label && drag.overId === asset.id;
                    const isSelected = selecting && selection.ids.includes(asset.id);
                    return (
                    <Fragment key={asset.id}>
                    {selecting && insertSlotRow(label, rowIndex, colCount)}
                    <tr
                      id={assetRowId(asset.id)}
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
                      className={`border-b scroll-mt-40 hover:bg-gray-50 ${
                        isSelected
                          ? 'bg-green-100'
                          : asset.isWithin3Years
                            ? 'bg-yellow-50'
                            : ''
                      } ${isDragging ? 'opacity-40' : ''} ${
                        isDropTarget ? 'border-t-2 border-t-green-500' : ''
                      } ${
                        flashAssetId === asset.id
                          ? 'outline outline-2 -outline-offset-2 outline-red-500'
                          : ''
                      }`}
                    >
                      <td
                        className={`px-1 text-center sticky left-0 z-10 ${stickyBg(asset.isWithin3Years, isSelected)}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          onClick={(e) => toggleSelect(label, assets, asset.id, e.shiftKey)}
                          className="rounded cursor-pointer"
                          aria-label={`${asset.name || '資産'} を移動対象に選択（Shift+クリックで範囲選択）`}
                          title="移動対象に選択（Shift+クリックで範囲選択）"
                        />
                      </td>
                      <td
                        className={`sticky left-8 z-10 ${stickyBg(asset.isWithin3Years, isSelected)}`}
                      >
                        <button
                          onMouseDown={() => setHandleRow(asset.id)}
                          onMouseUp={() => setHandleRow(null)}
                          onKeyDown={(e) => handleGripKey(e, label, assets, asset.id)}
                          className="flex w-full justify-center text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                          aria-label={`${asset.name || '資産'} の位置を変更（ドラッグ、↑↓ キーで1行、Alt+↑↓ で${JUMP_ROWS}行、Shift+↑↓ で先頭・末尾へ、Space で選択）`}
                          title={`ドラッグ / ↑↓=1行 / Alt+↑↓=${JUMP_ROWS}行 / Shift+↑↓=先頭・末尾へ / Space=選択`}
                        >
                          <GripVertical size={14} />
                        </button>
                      </td>
                      <td
                        className={`px-2 py-1 sticky left-[60px] z-10 ${stickyBg(asset.isWithin3Years, isSelected)}`}
                      >
                        <input
                          type="text"
                          value={asset.no}
                          onChange={(e) => onUpdateAsset(asset.id, { no: e.target.value })}
                          onKeyDown={handleCellKey}
                          data-col="no"
                          className="w-full px-1 py-0.5 border rounded text-xs text-right font-mono tabular-nums"
                          aria-label={`${asset.name || '資産'} NO`}
                        />
                      </td>
                      <td
                        className={`px-2 py-1 sticky left-[140px] z-10 ${stickyBg(asset.isWithin3Years, isSelected)}`}
                      >
                        <input
                          type="text"
                          value={asset.name}
                          onChange={(e) => onUpdateAsset(asset.id, { name: e.target.value })}
                          onKeyDown={handleCellKey}
                          data-col="name"
                          className="w-full px-1 py-0.5 border rounded text-xs"
                          aria-label="資産名称"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="date"
                          value={asset.acquisitionDate}
                          onChange={(e) => onUpdateAsset(asset.id, { acquisitionDate: e.target.value })}
                          onKeyDown={handleCellKey}
                          data-col="acquisitionDate"
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
                        <td className="px-2 py-1 text-right font-mono tabular-nums">
                          {asset.elapsedYears}
                        </td>
                      )}
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={asset.usefulLife || ''}
                          onChange={(e) => onUpdateAsset(asset.id, { usefulLife: Number(e.target.value) })}
                          onKeyDown={handleCellKey}
                          data-col="usefulLife"
                          className="w-full px-1 py-0.5 border rounded text-xs text-right font-mono tabular-nums"
                          aria-label={`${asset.name || '資産'} 耐用年数`}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <MoneyInput
                          value={asset.acquisitionCost}
                          onChange={(v) => onUpdateAsset(asset.id, { acquisitionCost: v })}
                          ariaLabel={`${asset.name || '資産'} 取得価額`}
                          dataCol="acquisitionCost"
                          onKeyDown={handleCellKey}
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
                          dataCol="bookValue"
                          onKeyDown={handleCellKey}
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
                  {selecting && insertSlotRow(label, assets.length, colCount)}
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

      {/* 移動中のフローティングバー。長距離スクロールしても操作を見失わないよう画面下に固定する */}
      {selection && (
        <div className="fixed inset-x-0 bottom-4 z-40 hidden justify-center px-4 md:flex">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-green-500 bg-white px-4 py-2 text-xs shadow-lg">
            <strong className="text-sm text-green-800">
              {selection.ids.length}件を移動中
            </strong>
            <span className="text-gray-600">
              {selection.label} 内の「ここに挿入」をクリック
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => stepSelection(-1)}
                disabled={!canStepUp}
                className="flex items-center gap-1 rounded border border-green-500 px-2 py-1 text-green-700 cursor-pointer transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
              >
                <ArrowUp size={12} /> 1つ上へ
              </button>
              <button
                onClick={() => stepSelection(1)}
                disabled={!canStepDown}
                className="flex items-center gap-1 rounded border border-green-500 px-2 py-1 text-green-700 cursor-pointer transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
              >
                <ArrowDown size={12} /> 1つ下へ
              </button>
              <button
                onClick={() => insertAt(selection.label, 0)}
                className="flex items-center gap-1 rounded border border-green-500 bg-green-600 px-2 py-1 text-white cursor-pointer transition-colors hover:bg-green-700"
              >
                <ChevronsUp size={12} /> 先頭へ
              </button>
              <button
                onClick={() => insertAt(selection.label, selectedGroup.length)}
                className="flex items-center gap-1 rounded border border-green-500 bg-green-600 px-2 py-1 text-white cursor-pointer transition-colors hover:bg-green-700"
              >
                <ChevronsDown size={12} /> 末尾へ
              </button>
              <button
                onClick={clearSelection}
                className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-gray-600 cursor-pointer transition-colors hover:border-gray-400 hover:text-gray-800"
              >
                <X size={12} /> 解除（Esc）
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
