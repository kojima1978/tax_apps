import type { ReactNode } from 'react';
import type { CoverageMonth, CoverageStatus, MonthlyCoverage } from './monthlyCoverage';

/** チップの色。月以外（基礎情報チップ）も同じ配色に揃えるため公開している。 */
export const CHIP_STATUS_CLASS = {
  none: 'admin-chip-none',
  partial: 'admin-chip-partial',
  full: 'admin-chip-full',
} as const;

/** 状態の記号。色だけで状態を伝えないようにする（印刷・色覚特性・モノクロ表示）。 */
const CHIP_STATUS_SYMBOL: Readonly<Record<CoverageStatus, string>> = {
  none: '−',
  partial: '!',
  full: '✓',
};

function chipCountText(status: CoverageStatus, count: number, total: number): string {
  if (status === 'none') return '未登録';
  return status === 'full' ? `${count}件` : `${count}/${total}`;
}

interface ChipStatusCountProps {
  status: CoverageStatus;
  count: number;
  total: number;
}

/**
 * チップの件数行。頭に状態の記号（− ! ✓）を付ける。
 *
 * 以前はチップ列の下に凡例を並べて色の意味を説明していたが、チップ自体が記号と件数で
 * 状態を名乗れるなら凡例は要らない。年分ごとに凡例1行ぶんの高さを使わずに済む。
 *
 * 記号を月名の行ではなく件数行に置くのは幅の都合。月名は「2025年11月」が最長で、
 * 件数行（「115/115」）はそれより狭い。狭い側に足せばチップは太らないので、
 * 14個の月チップが1行に収まったままになる。
 */
export function ChipStatusCount({ status, count, total }: ChipStatusCountProps) {
  return (
    <span className="admin-chip-count">
      <span className="admin-chip-mark" aria-hidden="true">{CHIP_STATUS_SYMBOL[status]}</span>
      {chipCountText(status, count, total)}
    </span>
  );
}

/** 当年は「5月」、前年11・12月分は年を付けて区別する。 */
function labelOf(month: CoverageMonth, gregorianYear: number): string {
  return month.year === gregorianYear ? `${month.month}月` : `${month.year}年${month.month}月`;
}

/**
 * 2年平均株価の入り具合。株価と件数が食い違うときだけ数を出す。
 * 前年11・12月分にはそもそも付かないので何も出さない。
 */
function twoYearTextOf(month: CoverageMonth): string | null {
  if (!month.twoYearExpected || month.status === 'none') return null;
  return month.twoYearCount >= month.count ? '2年平均あり' : `2年平均 ${month.twoYearCount}`;
}

/**
 * 上のうち、チップの面に出すぶん。足りていない月だけ。
 *
 * 以前はそろっている月にも「2年平均あり」を出し、そもそも付かない月には全角スペースを
 * 置いて高さを揃えていた ── つまり大半の月では空行に1行ぶん使っていた。
 * 足りないときだけ行が生えるようにすると、3行目があること自体が目印になる。
 * そろっている旨は title に残るので情報は落ちない。
 */
function twoYearShortageOf(month: CoverageMonth): string | null {
  if (!month.twoYearExpected || month.status === 'none') return null;
  return month.twoYearCount >= month.count ? null : `2年平均 ${month.twoYearCount}`;
}

function titleOf(month: CoverageMonth, categoryCount: number): string {
  const parts = [`${month.year}年${month.month}月分`];
  parts.push(month.status === 'none' ? '未登録' : `株価 ${month.count} / ${categoryCount} 業種目`);
  const twoYear = twoYearTextOf(month);
  if (twoYear) parts.push(twoYear);
  if (!month.twoYearExpected) parts.push('前月・前々月用のため2年平均はありません');
  if (month.outOfRange) parts.push('この年分の公表レンジ外です');
  return parts.join(' / ');
}

interface Props {
  coverage: MonthlyCoverage;
  /** 選択中の年月。取込先として狙っている月を強調する。 */
  selected?: { year: number; month: number };
  /** 渡すと月をクリックで選べるようになる（取込画面は対象月の選択、一覧は表示の切替）。 */
  onSelect?: (year: number, month: number) => void;
  /** 月チップの手前に置くもの。一覧側が「基礎情報」チップを差し込むために使う。 */
  leading?: ReactNode;
}

/** 月別株価の登録状況を月ごとのチップで並べる。取込前に「次はどこか」を見るためのもの。 */
export function MonthlyCoverageBar({ coverage, selected, onSelect, leading }: Props) {
  const chip = (month: CoverageMonth) => {
    const isSelected = selected?.year === month.year && selected.month === month.month;
    const className = [
      'admin-chip',
      CHIP_STATUS_CLASS[month.status],
      month.outOfRange ? 'admin-chip-extra' : '',
      isSelected ? 'admin-chip-selected' : '',
    ].filter(Boolean).join(' ');

    const shortage = twoYearShortageOf(month);
    const body = (
      <>
        <span className="admin-chip-month">{labelOf(month, coverage.gregorianYear)}</span>
        <ChipStatusCount status={month.status} count={month.count} total={coverage.categoryCount} />
        {shortage && <span className="admin-chip-sub">{shortage}</span>}
      </>
    );
    const title = titleOf(month, coverage.categoryCount);
    const key = `${month.year}-${month.month}`;

    return onSelect
      ? (
        <button
          key={key}
          type="button"
          className={className}
          title={title}
          aria-pressed={isSelected}
          onClick={() => onSelect(month.year, month.month)}
        >
          {body}
        </button>
      )
      : <span key={key} className={className} title={title}>{body}</span>;
  };

  return (
    <div className="admin-coverage-chips">
      {/*
        年分共通の値（B・C・D・前年平均）と月別株価は別のものなのに、同じ形のチップが
        地続きに並んでいて見分けが付かなかった。見出しを付けて区画として分ける。
      */}
      {leading && (
        <div className="admin-chip-group">
          <span className="admin-chip-group-label">年分共通</span>
          <div className="admin-chip-list">{leading}</div>
        </div>
      )}
      <div className="admin-chip-group">
        <span className="admin-chip-group-label">月別株価</span>
        <div className="admin-chip-list">{coverage.months.map(chip)}</div>
      </div>
    </div>
  );
}
