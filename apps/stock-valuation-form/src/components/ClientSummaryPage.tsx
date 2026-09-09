import type { ReactNode } from 'react';
import { RetirementSimulation } from './RetirementSimulation';
import { calcClientSummary } from '@/lib/clientSummary';
import { calcNextYearForecast, type ElementForecast } from '@/lib/nextYearForecast';
import {
  ACTION_FIELD, ACTION_FILTERS, ASSUMED_PROFIT_FIELD, ASSUMED_PROFIT_OFF_FIELD, BASIS_FIELD, BASIS_FILTERS,
  FORECAST_DETAIL_FIELD, SUMMARY_SECTIONS, ZERO_PROFIT_FIELD,
  changedOptionCount, filterActions, filterBases, formatAssumedProfit, isAssumedProfitVisible, isRowVisible,
  readSummaryOptions, resetSummaryOptionFields,
  sectionField, toStoredFlag, type RowScope, type SummaryOptions, type SummarySectionKey,
} from '@/lib/summaryOptions';
import { calcValuationReport, type ShareholderValuationRow, type ValuationBasis, type ValuationBasisKey } from '@/lib/valuationReport';
import type { TableProps } from '@/types/form';

type Props = Pick<TableProps, 'getField' | 'updateField'> & {
  onBack: () => void;
  onPrint: () => void;
};

function Icon({ name }: { name: 'print' }) {
  const paths = {
    print: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}


const yenOrDash = (value: number | null) => value === null ? '算定未完了' : `${value.toLocaleString('ja-JP')}円`;

function PriceDifference({ current, value }: { current: number | null; value: number | null }) {
  if (current === null || value === null) return <small>現在との差：比較に必要な金額が未算定です</small>;
  const diff = value - current;
  return <small className="summary-price-difference">{diff === 0 ? '現在と同額' : `現在より${Math.abs(diff).toLocaleString('ja-JP')}円${diff > 0 ? '高い' : '低い'}`}</small>;
}

function pendingPrice(key: string, basis: ValuationBasis | undefined): string {
  if (key.startsWith('companySize')) return '会社規模の判定待ち';
  if (key.startsWith('comparable')) return '第4表の入力・算定結果を確認してください';
  if (key.startsWith('netAsset')) return '第5表の入力・算定結果を確認してください';
  if (basis?.size === null) return '第1表の2で会社規模を判定してください';
  return '第3表の判定・算定結果を確認してください';
}

// 打ち手の優先度バッジ（クラス名はASCIIに寄せる）
const PRIORITY_CLASS: Record<'高' | '中' | '低', string> = { 高: 'high', 中: 'mid', 低: 'low' };

// 来期の見通し：現在との差。株価が上がる（＝不利になる）方向を赤で示す
function DiffCell({ diff, rate }: { diff: number | null; rate: number | null }) {
  if (diff === null) return <>－</>;
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '±';
  const tone = diff > 0 ? 'summary-forecast-diff-up' : diff < 0 ? 'summary-forecast-diff-down' : undefined;
  return (
    <>
      <span className={tone}>{sign}{Math.abs(diff).toLocaleString('ja-JP')}円</span>
      {rate !== null && <small>{sign}{Math.abs(rate).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}%</small>}
    </>
  );
}

const elementValueOf = (element: ElementForecast) => element.excluded
  ? '評価対象外'
  : element.current === null ? '－' : `${element.current.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}円`;

// 会社規模と、その規模で用いる類似業種比準価額の割合（小会社0.50・中会社L・大会社1.00）
const SIZE_SCALE = [
  { size: 0, name: '小会社', rate: 0.5 },
  { size: 1, name: '中会社', rate: 0.6 },
  { size: 2, name: '中会社', rate: 0.75 },
  { size: 3, name: '中会社', rate: 0.9 },
  { size: 4, name: '大会社', rate: 1 },
] as const;

/** 「利益3,000千円の場合」のように、試算に使った額を条件名にする */
const assumedProfitCase = (amount: number) => `利益${amount.toLocaleString('ja-JP')}千円の場合`;

// 株価一覧の行。ベースの違いは行のラベル側に持たせ、表は「項目｜金額」の2列で並べる。
const PRICE_ROWS: {
  key: string;
  label: string;
  note: string;
  emphasis?: boolean;
  /** 金額を読み取るベース */
  basis: ValuationBasisKey;
  /** 出力条件でどの評価ベースに絞られたときに残す行か（common は両ベース共通の情報） */
  scope: RowScope;
  /** 「利益0の場合」を出さない設定のときに落とす行 */
  zeroProfit?: boolean;
  /** 想定利益が未入力のときに落とす行 */
  assumedProfit?: boolean;
  cell: (basis: ValuationBasis) => { text: string; sub?: string };
}[] = [
  {
    key: 'comparable',
    label: '類似業種比準価額',
    note: '第4表の修正後の算定値を優先（両ベース共通）',
    basis: 'inheritance',
    scope: 'common',
    cell: (b) => ({ text: yenOrDash(b.comparablePrice) }),
  },
  {
    key: 'netAssetDeducted',
    label: '純資産価額',
    note: '評価差額に対する法人税額等相当額（38％）を控除・第5表⑪',
    basis: 'inheritance',
    scope: 'inheritance',
    cell: (b) => ({ text: yenOrDash(b.netAssetPrice) }),
  },
  {
    key: 'gensokuInheritance',
    label: '原則的評価方式による評価額',
    note: '会社規模に応じた第3表の最終価額',
    emphasis: true,
    basis: 'inheritance',
    scope: 'inheritance',
    cell: (b) => ({ text: yenOrDash(b.gensoku) }),
  },
  {
    key: 'companySize',
    label: '会社の規模',
    note: '会社規模と、類似業種比準価額を併用する場合の割合',
    basis: 'inheritance',
    scope: 'common',
    cell: (b) => {
      const size = SIZE_SCALE.find((s) => s.size === b.size);
      const rate = b.lRate ?? size?.rate;
      return { text: size?.name ?? '－', sub: rate === undefined ? undefined : `類似業種 ${(rate * 100).toLocaleString('ja-JP')}％・純資産 ${((1 - rate) * 100).toLocaleString('ja-JP', { maximumFractionDigits: 2 })}％` };
    },
  },
  {
    key: 'comparableZeroProfit',
    label: '類似業種比準価額',
    note: '直前期の年利益金額をゼロとして再計算',
    basis: 'inheritance',
    scope: 'common',
    zeroProfit: true,
    cell: (b) => ({ text: yenOrDash(b.comparablePriceZeroProfit) }),
  },
  {
    key: 'netAssetZeroProfit',
    label: '純資産価額',
    note: '現在と同額（この試算では純資産を変更しません）・38％控除あり',
    basis: 'inheritance',
    scope: 'inheritance',
    zeroProfit: true,
    cell: (b) => ({ text: yenOrDash(b.netAssetPrice) }),
  },
  {
    key: 'gensokuInheritanceZeroProfit',
    label: '原則的評価方式による評価額',
    note: '直前期の年利益金額をゼロとして再計算した場合の第3表の最終価額',
    emphasis: true,
    basis: 'inheritance',
    scope: 'inheritance',
    zeroProfit: true,
    cell: (b) => ({ text: yenOrDash(b.gensokuZeroProfit) }),
  },
  {
    key: 'comparableAssumed',
    label: '類似業種比準価額',
    note: '直前期の年利益金額を想定額に置き換えて再計算',
    basis: 'inheritance',
    scope: 'common',
    assumedProfit: true,
    cell: (b) => ({ text: yenOrDash(b.comparablePriceAssumed) }),
  },
  {
    key: 'netAssetAssumed',
    label: '純資産価額',
    note: '現在と同額（この試算では純資産を変更しません）・38％控除あり',
    basis: 'inheritance',
    scope: 'inheritance',
    assumedProfit: true,
    cell: (b) => ({ text: yenOrDash(b.netAssetPrice) }),
  },
  {
    key: 'gensokuInheritanceAssumed',
    label: '原則的評価方式による評価額',
    note: '直前期の年利益金額を想定額に置き換えて再計算した場合の第3表の最終価額',
    emphasis: true,
    basis: 'inheritance',
    scope: 'inheritance',
    assumedProfit: true,
    cell: (b) => ({ text: yenOrDash(b.gensokuAssumed) }),
  },
  {
    key: 'netAssetGross',
    label: '純資産価額',
    note: '評価差額に対する法人税額等相当額（38％）の控除なし・第5表⑪',
    basis: 'special-market-value',
    scope: 'special-market-value',
    cell: (b) => ({ text: yenOrDash(b.netAssetPrice) }),
  },
  {
    key: 'gensokuSpecial',
    label: '原則的評価方式による評価額',
    note: '所基通59－6／法基通9－1－14：小会社として評価し、法人税額等相当額を控除しない',
    emphasis: true,
    basis: 'special-market-value',
    scope: 'special-market-value',
    cell: (b) => ({ text: yenOrDash(b.gensoku) }),
  },
  {
    key: 'companySizeSpecial',
    label: '会社の規模',
    note: '所得税・法人税ベースの評価上の区分（小会社として評価）',
    basis: 'special-market-value',
    scope: 'special-market-value',
    cell: (b) => ({ text: b.sizeLabel, sub: '類似業種 50％・純資産 50％（併用する場合）' }),
  },
  {
    key: 'haito',
    label: '配当還元方式',
    note: '',
    basis: 'inheritance',
    scope: 'inheritance',
    cell: (b) => ({ text: yenOrDash(b.haitoKangen) }),
  },
];

// 基本の金額を先に読み、前提・試算へ順に進める。表示条件で空になるグループは出さない。
const PRICE_GROUPS = [
  { key: 'current', title: '現在の評価額', note: '相続税評価額ベース・1株当たり', rows: ['companySize', 'comparable', 'netAssetDeducted', 'gensokuInheritance'] },
  { key: 'zero', title: '利益0の場合', note: '直前期の年利益金額を0として試算', rows: ['companySize', 'comparableZeroProfit', 'netAssetZeroProfit', 'gensokuInheritanceZeroProfit'] },
  { key: 'assumed', title: '想定利益の場合', note: '直前期の年利益金額を想定額に置き換えて試算', rows: ['companySize', 'comparableAssumed', 'netAssetAssumed', 'gensokuInheritanceAssumed'] },
  { key: 'special', title: '所得税・法人税ベースの評価額', note: '1株当たり', rows: ['companySizeSpecial', 'comparable', 'netAssetGross', 'gensokuSpecial'] },
  { key: 'dividend', title: '配当還元方式の評価額', note: '会社への支配力が小さい株主などに用いる評価方法です。', rows: ['haito'] },
] as const;

// 株主ごとの評価の金額列。相続税評価額ベースだけは「利益0の場合」「利益〇〇〇千円の場合」を隣に並べる。
type HolderColumn = {
  key: string;
  label: string;
  /** 「利益0の場合」などの条件名。列見出しが横に伸びないよう、label の下へ改行して置く */
  caseLabel?: string;
  basis: ValuationBasisKey;
  zeroProfit?: boolean;
  assumedProfit?: boolean;
};

function holderColumnsOf(
  bases: ValuationBasis[],
  options: Pick<SummaryOptions, 'showZeroProfit' | 'showAssumedProfit' | 'assumedProfit'>,
): HolderColumn[] {
  return bases.flatMap((basis): HolderColumn[] => {
    const columns: HolderColumn[] = [{ key: basis.key, label: basis.label, basis: basis.key }];
    if (basis.key !== 'inheritance') return columns;
    if (options.showZeroProfit) {
      columns.push({ key: `${basis.key}-zero`, label: basis.label, caseLabel: '利益0の場合', basis: basis.key, zeroProfit: true });
    }
    if (isAssumedProfitVisible(options) && options.assumedProfit !== null) {
      const caseLabel = assumedProfitCase(options.assumedProfit);
      columns.push({ key: `${basis.key}-assumed`, label: basis.label, caseLabel, basis: basis.key, assumedProfit: true });
    }
    return columns;
  });
}

type SetOption = (field: string, value: string) => void;

/** 出力条件のチェックボックス1つ分。見出しの下に並べるので文字は小さめ */
function OptionCheck({ label, hint, checked, onChange }: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="summary-option">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}{hint && <small>{hint}</small>}</span>
    </label>
  );
}

/** 出力条件のラジオ1組。name は同じ条件を2箇所に出しても混ざらないよう呼び出し側で分ける */
function OptionRadios<T extends string>({ name, label, items, value, onChange }: {
  name: string;
  label: string;
  items: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <span className="summary-option-group">
      <span className="summary-option-group-label">{label}</span>
      {items.map((item) => (
        <label className="summary-option" key={item.value}>
          <input type="radio" name={name} value={item.value} checked={value === item.value} onChange={() => onChange(item.value)} />
          <span>{item.label}</span>
        </label>
      ))}
    </span>
  );
}

/**
 * 併記のチェックと金額入力を1組にした出力条件。
 * チェックを外しても打ち込んだ額は消さず、入力欄をグレーアウトして残す（戻せばそのまま復活する）。
 * id は同じ条件を2箇所に出しても label が混ざらないよう呼び出し側で分ける。
 * hint は画面には出さない。ここだけ2行になって他の条件と行がそろわないため、
 * 入力欄の説明（読み上げとホバー）へ回している。
 */
function OptionCheckNumber({ id, label, hint, unit, checked, onCheck, value, onChange }: {
  id: string;
  label: string;
  hint: string;
  unit: string;
  checked: boolean;
  onCheck: (checked: boolean) => void;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <span className="summary-option-number">
      <label className="summary-option">
        <input type="checkbox" checked={checked} onChange={(event) => onCheck(event.target.checked)} />
        <span>{label}</span>
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={value}
        placeholder="未入力"
        disabled={!checked}
        aria-label={`${label}　${hint}（${unit}）`}
        title={`${hint}（${unit}）`}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="summary-option-unit">{unit}</span>
    </span>
  );
}

/** 評価ベースの条件は株価一覧と株主ごとの評価の両方に効くので、両方の見出しに出す */
function BasisOptions({ name, options, setOption }: { name: string; options: SummaryOptions; setOption: SetOption }) {
  return (
    <>
      <OptionRadios name={name} label="評価ベース" items={BASIS_FILTERS} value={options.basis} onChange={(value) => setOption(BASIS_FIELD, value)} />
      <OptionCheck
        label="「利益0の場合」を併記"
        checked={options.showZeroProfit}
        onChange={(checked) => setOption(ZERO_PROFIT_FIELD, toStoredFlag(checked))}
      />
      <OptionCheckNumber
        id={`${name}-assumed-profit`}
        label="「利益〇〇〇千円の場合」を併記"
        hint="直前期の年利益金額"
        unit="千円"
        checked={options.showAssumedProfit}
        onCheck={(checked) => setOption(ASSUMED_PROFIT_OFF_FIELD, toStoredFlag(checked))}
        value={options.assumedProfitText}
        onChange={(value) => setOption(ASSUMED_PROFIT_FIELD, formatAssumedProfit(value))}
      />
    </>
  );
}

/** 見出しの直下に置く出力条件の行。印刷には出ない */
function SectionTools({ sectionKey, options, setOption, children }: {
  sectionKey: SummarySectionKey;
  options: SummaryOptions;
  setOption: SetOption;
  children?: ReactNode;
}) {
  return (
    <details className="summary-settings no-print">
      <summary>表示・印刷設定<span>
        {sectionKey === 'prices' || sectionKey === 'holders'
          ? [BASIS_FILTERS.find((item) => item.value === options.basis)?.label,
            options.showZeroProfit ? '利益0を併記' : null,
            isAssumedProfitVisible(options) ? `利益${options.assumedProfit!.toLocaleString('ja-JP')}千円を併記` : null].filter(Boolean).join(' ／ ')
          : sectionKey === 'actions' ? `優先度：${ACTION_FILTERS.find((item) => item.value === options.actionFilter)?.label}`
          : sectionKey === 'forecast' ? (options.showForecastDetail ? '必要水準の明細あり' : '必要水準の明細なし')
          : '出力する'}
      </span></summary>
    <div className="summary-section-tools">
      <OptionCheck
        label="出力する"
        checked={options.sections[sectionKey]}
        onChange={(checked) => setOption(sectionField(sectionKey), toStoredFlag(checked))}
      />
      {children}
    </div>
    </details>
  );
}

/** 出力しない設定にしたセクションの跡地。位置を残しておかないと戻す入口が無くなる */
function HiddenSection({ sectionKey, setOption }: { sectionKey: SummarySectionKey; setOption: SetOption }) {
  const section = SUMMARY_SECTIONS.find((item) => item.key === sectionKey);
  if (!section) return null;
  return (
    <div className="summary-section-hidden no-print">
      <OptionCheck
        label={section.label}
        hint={section.hint}
        checked={false}
        onChange={() => setOption(sectionField(sectionKey), toStoredFlag(true))}
      />
      <span>出力しません</span>
    </div>
  );
}

function ShareholderRow({ row, columns }: { row: ShareholderValuationRow; columns: HolderColumn[] }) {
  return (
    <tr>
      <th scope="row">
        {row.name || `株主${row.row}`}
        {row.relation && <small>{row.relation}</small>}
      </th>
      <td className="summary-holders-num">{row.shares === null ? '未入力' : row.shares.toLocaleString('ja-JP')}</td>
      <td className="summary-holders-num">{row.votingRatio === null ? '判定待ち' : `${row.votingRatio}%`}</td>
      <td>
        <span className={`summary-holders-method summary-holders-method-${row.method}`}>{row.methodLabel}</span>
        {row.pendingReason && <small>{row.pendingReason}</small>}
      </td>
      {columns.map((column) => {
        const amount = row.amounts.find((a) => a.basis === column.basis);
        // 配当還元方式は年利益金額の影響を受けないため、利益0・想定利益の列でも同じ金額になる。
        const gensokuTotal = (column.zeroProfit
          ? amount?.gensokuZeroProfitTotal
          : column.assumedProfit
            ? amount?.gensokuAssumedTotal
            : amount?.gensokuTotal) ?? null;
        return (
          <td className="summary-holders-num" key={column.key}>
            {row.method === 'unknown' ? (
              <>
                <span>原則 {yenOrDash(gensokuTotal)}</span>
                <small>配当還元 {yenOrDash(amount?.haitoTotal ?? null)}</small>
              </>
            ) : (
              yenOrDash(row.method === 'haito' ? amount?.haitoTotal ?? null : gensokuTotal)
            )}
          </td>
        );
      })}
    </tr>
  );
}

export function ClientSummaryPage({ getField, updateField, onBack, onPrint }: Props) {
  const summary = calcClientSummary(getField);
  const options = readSummaryOptions(getField);
  const report = calcValuationReport(getField, options.assumedProfit);
  const forecast = calcNextYearForecast(getField);
  const note = getField('table1_1', '_summary_advisor_note');
  const setOption = (field: string, value: string) => updateField('table1_1', field, value);
  const bases = filterBases(report.bases, options.basis);
  const showAssumedProfit = isAssumedProfitVisible(options);
  const holderColumns = holderColumnsOf(bases, options);
  const priceRows = PRICE_ROWS.filter((row) => isRowVisible(row, options));
  const actions = filterActions(summary.actions, options.actionFilter);
  const availableSensitivity = summary.sensitivity.items.filter((item) => item.value !== null);
  const changedCount = changedOptionCount(options);

  const renderPriceGroup = (group: typeof PRICE_GROUPS[number]) => {
            if (group.key === 'zero' && !options.showZeroProfit) return null;
            if (group.key === 'assumed' && !showAssumedProfit) return null;
            if (group.key === 'special' && options.basis === 'inheritance') return null;
            const rows = group.rows.flatMap((key) => {
              const row = priceRows.find((item) => item.key === key);
              return row ? [row] : [];
            });
            if (!rows.length) return null;
            return (
          <div className="summary-price-group" key={group.key}>
          <h3 className="summary-forecast-subhead" id={`summary-price-${group.key}`}>
            {group.key === 'assumed' && options.assumedProfit !== null ? assumedProfitCase(options.assumedProfit) : group.title}
          </h3>
          <p className="summary-price-group-note">
            {group.key === 'current' && options.basis === 'special-market-value' ? '類似業種比準価額は両ベース共通・1株当たり' : group.note}
          </p>
          <div className="summary-table-scroll">
            <table className="summary-table" aria-labelledby={`summary-price-${group.key}`}>
              <thead>
                <tr>
                  <th scope="col">評価項目</th>
                  <th scope="col" className="summary-holders-num">{group.key !== 'dividend' ? '金額・内容' : '金額'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((priceRow) => {
                  const basis = report.bases.find((b) => b.key === priceRow.basis);
                  const { text, sub } = basis ? priceRow.cell(basis) : { text: '－', sub: undefined };
                  const pending = text === '算定未完了' || text === '－' || text === '判定未完了';
                  const sizeRow = priceRow.key.startsWith('companySize');
                  const trialValue = group.key === 'zero' ? basis?.gensokuZeroProfit : basis?.gensokuAssumed;
                  return (
                    <tr key={priceRow.key} className={priceRow.emphasis ? 'summary-table-emphasis' : sizeRow ? 'summary-company-size' : undefined}>
                      <th scope="row">{priceRow.label}{priceRow.note && <small>{priceRow.note}</small>}</th>
                      <td className="summary-holders-num">
                        {pending ? (sizeRow || basis?.size === null && priceRow.emphasis ? '判定待ち' : '算定未完了') : text}
                        {pending ? <small>{pendingPrice(priceRow.key, basis)}</small> : sub && <small>{sub}</small>}
                        {priceRow.emphasis && (group.key === 'zero' || group.key === 'assumed') && (
                          <PriceDifference current={basis?.gensoku ?? null} value={trialValue ?? null} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {group.key === 'current' && (
            <p className="summary-price-group-note">{summary.classificationLabel}。株主に適用する評価方式は「株主ごとの評価」に表示します。</p>
          )}
          </div>
    );
  };

  return (
    <div className="client-summary-wrap">
      <div className="client-summary-actions no-print">
        <button type="button" onClick={onBack} className="summary-back-button">帳票入力へ戻る</button>
        {changedCount > 0 && (
          <span className="summary-options-reset">
            <span className="summary-options-badge">{changedCount}件を既定から変更</span>
            <button
              type="button"
              onClick={() => resetSummaryOptionFields().forEach(({ field, value }) => setOption(field, value))}
            >
              すべて出力に戻す
            </button>
          </span>
        )}
        <button type="button" onClick={onPrint} className="summary-print-button"><Icon name="print" />このサマリーを印刷</button>
      </div>

      {/* 出力条件は各見出しの下に置く。設定は案件データ（第1表の1）に保存されるので、保存/読込・翌年度更新にも引き継がれる */}
      <p className="summary-options-hint no-print">
        各項目の「表示・印刷設定」を開くと、出力内容を変更できます。設定は案件データに保存されます。
      </p>

      <nav className="summary-jump-nav no-print" aria-label="サマリー内の移動">
        {([
          ['prices', 'summary-prices-title', '現在の評価額'],
          ['holders', 'summary-holders-title', '株主ごとの評価'],
          ['prices', 'summary-scenarios-title', '条件別の試算'],
          ['retirement', 'summary-retirement-title', '退職金の試算'],
          ['sensitivity', 'summary-sensitivity-title', '比準要素の影響'],
          ['sizes', 'summary-sizes-title', '会社規模別'],
          ['forecast', 'summary-forecast-title', '来期の見通し'],
          ['actions', 'summary-actions-title', '次の一手'],
          ['note', 'summary-note-title', 'コメント'],
        ] as const).filter(([key]) => options.sections[key]).map(([, id, label]) => (
          <button type="button" key={id} onClick={() => {
            const target = document.getElementById(id);
            if (!target) return;
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
            target.scrollIntoView({ block: 'start', behavior: 'auto' });
          }}>{label}</button>
        ))}
      </nav>

      <article className="client-summary-page" aria-labelledby="client-summary-title">
        <header className="summary-hero">
          <div className="summary-kicker">STOCK VALUATION REPORT</div>
          <div className="summary-hero-main">
            <div>
              <p className="summary-eyebrow">非上場株式評価｜お客様向けサマリー</p>
              <h1 id="client-summary-title">{summary.companyName}<span>御中</span></h1>
              <p className="summary-lead">入力いただいた情報をもとに、現在の評価上の特徴と今後検討したい打ち手を整理しました。</p>
            </div>
            <div className="summary-date-block">
              <span>評価基準日</span><strong>{summary.valuationDate}</strong>
              <span>代表者</span><strong>{summary.representative}</strong>
            </div>
          </div>
          <div className="summary-meta"><span>{summary.purposeLabel}</span><span>{summary.sizeLabel}</span><span>{summary.classificationLabel}</span></div>
        </header>

        {options.sections.prices ? (
        <section className="summary-prices" aria-labelledby="summary-prices-title">
          <div className="summary-sensitivity-heading">
            <div>
              <small>SHARE PRICE BY BASIS</small>
              <h2 id="summary-prices-title">株価一覧</h2>
            </div>
            <span>1株当たり</span>
          </div>
          <SectionTools sectionKey="prices" options={options} setOption={setOption}>
            <BasisOptions name="summary-basis-prices" options={options} setOption={setOption} />
            <small>評価ベース・「利益0の場合」・想定利益は株主ごとの評価にも反映されます。</small>
          </SectionTools>
          {PRICE_GROUPS.filter((group) => group.key === 'current').map(renderPriceGroup)}
        </section>
        ) : <HiddenSection sectionKey="prices" setOption={setOption} />}

        {options.sections.holders ? (
        <section className="summary-holders" aria-labelledby="summary-holders-title">
          <div className="summary-sensitivity-heading">
            <div>
              <small>VALUATION BY SHAREHOLDER</small>
              <h2 id="summary-holders-title">株主ごとの評価</h2>
            </div>
            <span>株式数×1株当たりの価額</span>
          </div>
          <SectionTools sectionKey="holders" options={options} setOption={setOption}>
            <BasisOptions name="summary-basis-holders" options={options} setOption={setOption} />
            <small>評価ベース・「利益0の場合」・想定利益は株価一覧にも反映されます。</small>
          </SectionTools>
          {report.shareholders.length ? (
            <div className="summary-table-scroll">
              <table className="summary-table">
                <colgroup>
                  <col className="summary-holder-name-col" />
                  <col className="summary-holder-shares-col" />
                  <col className="summary-holder-votes-col" />
                  <col className="summary-holder-method-col" />
                  {holderColumns.map((column) => <col key={column.key} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">株主</th>
                    <th scope="col" className="summary-holders-num">株式数</th>
                    <th scope="col" className="summary-holders-num">議決権割合</th>
                    <th scope="col">評価方式</th>
                    {holderColumns.map((column) => (
                      <th scope="col" className="summary-holders-num" key={column.key}>
                        <span className="summary-holder-basis">{column.basis === 'inheritance' ? '相続税評価額' : '所得税・法人税'}</span>
                        <small className="summary-th-case">{column.caseLabel?.replace(/の場合$/, '') ?? '現在'}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.shareholders.map((row) => <ShareholderRow key={row.row} row={row} columns={holderColumns} />)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="summary-sensitivity-empty" role="note">第1表の1に株主を入力すると表示されます。</div>
          )}
          <p className="summary-sensitivity-disclaimer">
            各行の株主を納税義務者とみなして株主判定をやり直した結果です。議決権割合5％未満の株主は、役員該当性や中心的な同族株主の有無により方式が変わるため「要確認」として両方の金額を表示しています。
          </p>
        </section>
        ) : <HiddenSection sectionKey="holders" setOption={setOption} />}

        {options.sections.prices && (
          <section className="summary-prices" aria-labelledby="summary-scenarios-title">
            <div className="summary-sensitivity-heading">
              <h2 id="summary-scenarios-title">条件を変えた評価額</h2>
              <span>1株当たり</span>
            </div>
            {PRICE_GROUPS.filter((group) => group.key !== 'current').map(renderPriceGroup)}
          </section>
        )}
        {options.sections.retirement ? (
          <RetirementSimulation getField={getField} updateField={updateField} basis={options.basis} before={report.bases}
            onHide={() => setOption(sectionField('retirement'), toStoredFlag(false))} />
        ) : <HiddenSection sectionKey="retirement" setOption={setOption} />}

        {options.sections.sensitivity ? (
        <section className="summary-sensitivity" aria-labelledby="summary-sensitivity-title">
          <div className="summary-sensitivity-heading">
            <h2 id="summary-sensitivity-title">類似業種比準要素｜1円当たりの影響度</h2>
            <span>{summary.sensitivity.adoptedBlock}を基準</span>
          </div>
          <SectionTools sectionKey="sensitivity" options={options} setOption={setOption} />
          {availableSensitivity.length ? (
            <div className="summary-table-scroll">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th scope="col">比準要素</th>
                    <th scope="col" className="summary-holders-num">1円増加あたりの影響</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.sensitivity.items.map((item) => (
                    <tr key={item.key}>
                      <th scope="row">{item.label}</th>
                      <td className="summary-holders-num">
                        {item.excluded ? '評価対象外' : item.value === null ? '算定不可' : `+${item.value.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}円`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="summary-sensitivity-empty" role="note">類似業種株価、斟酌率、1株当たり資本金等の額、または比準要素の基準値を入力すると表示されます。</div>
          )}
          <p className="summary-sensitivity-disclaimer">各要素が1円増加したときの、1株当たりの類似業種比準価額への概算影響です（端数処理・最低価額判定を固定した線形近似）。</p>
        </section>
        ) : <HiddenSection sectionKey="sensitivity" setOption={setOption} />}

        {options.sections.sizes ? (
        <section className="summary-sizes" aria-labelledby="summary-sizes-title">
          <div className="summary-sensitivity-heading">
            <div>
              <small>SHARE PRICE BY COMPANY SIZE</small>
              <h2 id="summary-sizes-title">会社規模別の株価｜規模が変わった場合</h2>
            </div>
            <span>相続税評価額ベース・1株当たり</span>
          </div>
          <SectionTools sectionKey="sizes" options={options} setOption={setOption} />
          <div className="summary-table-scroll">
            <table className="summary-table">
              <thead>
                <tr>
                  <th scope="col">会社の規模</th>
                  <th scope="col" className="summary-holders-num">類似業種比準価額の割合</th>
                  <th scope="col" className="summary-holders-num">類似業種比準価額</th>
                  <th scope="col" className="summary-holders-num">純資産価額</th>
                  <th scope="col" className="summary-holders-num">原則的評価額</th>
                </tr>
              </thead>
              <tbody>
                {report.sizeScenarios.map((scenario) => {
                  const scale = SIZE_SCALE.find((item) => item.size === scenario.size);
                  return (
                    <tr key={scenario.size} className={scenario.current ? 'summary-table-emphasis' : undefined}>
                      <th scope="row">
                        {scenario.sizeLabel}
                        {scenario.current && <span className="summary-size-current">現在の判定</span>}
                      </th>
                      <td className="summary-holders-num">{scale ? scale.rate.toFixed(2) : '－'}</td>
                      <td className="summary-holders-num">{yenOrDash(scenario.comparablePrice)}</td>
                      <td className="summary-holders-num">{yenOrDash(report.bases.find((basis) => basis.key === 'inheritance')?.netAssetPrice ?? null)}</td>
                      <td className="summary-holders-num">{yenOrDash(scenario.gensoku)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="summary-sensitivity-disclaimer">
            会社規模が変わると、第4表の斟酌率（大会社0.7／中会社0.6／小会社0.5）と、第3表で純資産価額と併用する割合が変わります。
            1株当たり純資産価額そのものは規模では変わりません。所得税・法人税ベースは所基通59－6(2)により常に小会社として評価するため、この表の対象外です。
            実際の規模は直前期末の総資産価額・取引金額・従業員数（第1表の2）で決まります。
          </p>
        </section>
        ) : <HiddenSection sectionKey="sizes" setOption={setOption} />}

        {options.sections.forecast ? (
        <section className="summary-forecast" aria-labelledby="summary-forecast-title">
          <div className="summary-sensitivity-heading">
            <div>
              <small>NEXT YEAR OUTLOOK</small>
              <h2 id="summary-forecast-title">来期の見通し｜比準要素数1・比準要素数0への該当リスク</h2>
            </div>
            <span>現在の判定：{forecast.currentResultLabel}</span>
          </div>
          <SectionTools sectionKey="forecast" options={options} setOption={setOption}>
            <OptionCheck
              label="回避するために必要な水準"
              hint="来期の判定要素の明細表"
              checked={options.showForecastDetail}
              onChange={(checked) => setOption(FORECAST_DETAIL_FIELD, toStoredFlag(checked))}
            />
          </SectionTools>
          {!forecast.known ? (
            <div className="summary-sensitivity-empty" role="note">第4表の①資本金等の額と判定要素（Ⓑ₁・Ⓒ₁・Ⓓ₁）を入力すると表示されます。</div>
          ) : (
            <>
              <p className="summary-forecast-lead">
                今期の判定要素（⑴）は、来期には「直前々期末を基準とした判定要素（⑵）」へそのまま繰り上がります。
                {forecast.zeroLabels.length
                  ? <>現在ゼロの要素は <span className="summary-forecast-zero">{forecast.zeroLabels.join('、')}</span> の{forecast.zerosNow}個です。</>
                  : '現在ゼロの要素はありません。'}
                {forecast.carryOverMet
                  ? `来期の⑵側の条件は既に成立が確定しているため、来期の⑴でゼロが${forecast.zerosNeededFor1}個になった時点で比準要素数1の会社に該当します。`
                  : `来期の⑵側の条件（ゼロが${forecast.zerosNeededFor1}個以上）を満たさないため、来期に比準要素数1の会社となることはありません。`}
              </p>
              <div className="summary-table-scroll">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th scope="col">来期のシナリオ</th>
                      <th scope="col">評価区分</th>
                      <th scope="col" className="summary-holders-num">1株当たりの価額</th>
                      <th scope="col" className="summary-holders-num">現在との差</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="summary-table-emphasis">
                      <th scope="row">現在の判定<small>今期の課税時期</small></th>
                      <td>{forecast.currentResultLabel}</td>
                      <td className="summary-holders-num">{yenOrDash(forecast.currentPrice)}</td>
                      <td className="summary-holders-num">－</td>
                    </tr>
                    {forecast.scenarios.map((scenario) => (
                      <tr key={scenario.key} className={scenario.possible ? undefined : 'summary-forecast-off'}>
                        <th scope="row">{scenario.label}<small>来期の⑴でゼロが{scenario.zerosNeeded}個になった場合</small></th>
                        <td>
                          {scenario.possible ? scenario.resultLabel : '該当しません'}
                          {scenario.impossibleReason && <small>{scenario.impossibleReason}</small>}
                          {scenario.possible && scenario.noEffect && <small>現在と同じ評価区分のため、株価の算定方法は変わりません。</small>}
                        </td>
                        <td className="summary-holders-num">{scenario.possible ? yenOrDash(scenario.price) : '－'}</td>
                        <td className="summary-holders-num">
                          {scenario.possible ? <DiffCell diff={scenario.diff} rate={scenario.diffRate} /> : '－'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {options.showForecastDetail && (<>
              <h3 className="summary-forecast-subhead">回避するために必要な水準（来期の判定要素）</h3>
              <div className="summary-table-scroll">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th scope="col">判定要素</th>
                      <th scope="col" className="summary-holders-num">今期の⑴</th>
                      <th scope="col">来期にゼロにしないための条件</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.elements.map((element) => (
                      <tr key={element.key}>
                        <th scope="row">{element.label}</th>
                        <td className="summary-holders-num">
                          {elementValueOf(element)}
                          {element.isZeroNow === true && <small>ゼロ</small>}
                        </td>
                        <td className="summary-forecast-note">{element.requiredNote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>)}
              <p className="summary-sensitivity-disclaimer">
                「来期」は次の決算を経過した後の課税時期を指します。金額はいずれも現在の入力値をそのまま用いた試算で、第3表・第6表の修正欄、資本金等の額の変動、来期の類似業種の株価改定は反映していません。
                配当・利益の水準を調整する場合は、事業実態と整合していることが前提です。
              </p>
            </>
          )}
        </section>
        ) : <HiddenSection sectionKey="forecast" setOption={setOption} />}

        {options.sections.actions ? (
        <section className="summary-actions" aria-labelledby="summary-actions-title">
          <div className="summary-sensitivity-heading">
            <div>
              <small>NEXT ACTIONS</small>
              <h2 id="summary-actions-title">次の一手</h2>
            </div>
            <span>{actions.length}件</span>
          </div>
          <SectionTools sectionKey="actions" options={options} setOption={setOption}>
            <OptionRadios
              name="summary-action-filter"
              label="優先度"
              items={ACTION_FILTERS}
              value={options.actionFilter}
              onChange={(value) => setOption(ACTION_FIELD, value)}
            />
          </SectionTools>
          {actions.length ? (
            <ol className="summary-action-list">
              {actions.map((action) => (
                <li key={action.title} className={`summary-action-${PRIORITY_CLASS[action.priority]}`}>
                  <span className="summary-action-priority">優先度{action.priority}</span>
                  <div><strong>{action.title}</strong><p>{action.description}</p></div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="summary-sensitivity-empty" role="note">選択した優先度に該当する打ち手はありません。</div>
          )}
        </section>
        ) : <HiddenSection sectionKey="actions" setOption={setOption} />}

        {options.sections.note ? (
        <section className="summary-advisor-note" aria-labelledby="summary-note-title">
          <div>
            <small>ADVISOR'S NOTE</small>
            <h2 id="summary-note-title">担当者コメント</h2>
            <SectionTools sectionKey="note" options={options} setOption={setOption} />
          </div>
          <textarea
            aria-label="担当者コメント"
            value={note}
            onChange={(event) => updateField('table1_1', '_summary_advisor_note', event.target.value)}
            placeholder="お客様への補足説明、次回までの確認事項などを入力してください。"
          />
        </section>
        ) : <HiddenSection sectionKey="note" setOption={setOption} />}

        <footer className="summary-footer">
          <p>本資料は入力情報に基づく概算・検討用資料です。実行に際しては、最新の法令・通達および個別事情を確認してください。</p>
          <span>{summary.companyName}｜株式評価サマリー</span>
        </footer>
      </article>
    </div>
  );
}
