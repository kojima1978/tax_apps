import type { CoverageMonth, MonthlyCoverage } from './monthlyCoverage';

const STATUS_CLASS = {
  none: 'admin-chip-none',
  partial: 'admin-chip-partial',
  full: 'admin-chip-full',
} as const;

const LEGEND = [
  { status: 'full', label: '全業種目そろっている' },
  { status: 'partial', label: '一部だけ（取込漏れ）' },
  { status: 'none', label: '未登録' },
] as const;

/** 当年は「5月」、前年11・12月分は年を付けて区別する。 */
function labelOf(month: CoverageMonth, gregorianYear: number): string {
  return month.year === gregorianYear ? `${month.month}月` : `${month.year}年${month.month}月`;
}

function countTextOf(month: CoverageMonth, categoryCount: number): string {
  if (month.status === 'none') return '未登録';
  return month.status === 'full' ? `${month.count}件` : `${month.count}/${categoryCount}`;
}

/**
 * 2年平均株価の入り具合。株価と件数が食い違うときだけ数を出す。
 * 前年11・12月分にはそもそも付かないので何も出さない。
 */
function twoYearTextOf(month: CoverageMonth): string | null {
  if (!month.twoYearExpected || month.status === 'none') return null;
  return month.twoYearCount >= month.count ? '2年平均あり' : `2年平均 ${month.twoYearCount}`;
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
  /** 渡すと月をクリックで選べるようになる（一覧側は読み取り専用なので渡さない）。 */
  onSelect?: (year: number, month: number) => void;
}

/** 月別株価の登録状況を月ごとのチップで並べる。取込前に「次はどこか」を見るためのもの。 */
export function MonthlyCoverageBar({ coverage, selected, onSelect }: Props) {
  const chip = (month: CoverageMonth) => {
    const isSelected = selected?.year === month.year && selected.month === month.month;
    const className = [
      'admin-chip',
      STATUS_CLASS[month.status],
      month.outOfRange ? 'admin-chip-extra' : '',
      isSelected ? 'admin-chip-selected' : '',
    ].filter(Boolean).join(' ');

    const body = (
      <>
        <span className="admin-chip-month">{labelOf(month, coverage.gregorianYear)}</span>
        <span className="admin-chip-count">{countTextOf(month, coverage.categoryCount)}</span>
        <span className="admin-chip-sub">{twoYearTextOf(month) ?? '　'}</span>
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
    <div className="admin-coverage">
      <div className="admin-coverage-chips">{coverage.months.map(chip)}</div>
      <div className="admin-coverage-legend">
        {LEGEND.map((item) => (
          <span key={item.status} className="admin-legend-item">
            <span className={`admin-legend-swatch ${STATUS_CLASS[item.status]}`} />
            {item.label}
          </span>
        ))}
        <span>業種目 {coverage.categoryCount} 件</span>
      </div>
    </div>
  );
}
