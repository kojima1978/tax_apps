import React from 'react';
import type { DetailedTaxCalculationResult, HeirTaxBreakdown } from '../../types';
import { formatCurrency, formatFraction, formatPercent } from '../../utils';
import { BASIC_DEDUCTION, TAX_BRACKETS } from '../../constants';
import { CARD } from '../tableStyles';

interface CalculationStepsProps {
  result: DetailedTaxCalculationResult;
}

interface Step {
  title: string;
  /** 見出し直下に置く補足説明（顧客が誤解しやすい前提を補う） */
  notes?: string[];
  content: React.ReactNode;
}

/** 印刷では「相続人別 税額内訳」表と重複するため、画面でだけ出す明細 */
const ScreenOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="no-print">{children}</div>
);

/**
 * 計算1行を「演算子 / 項目・式 / 金額」の3列で表示する会計帳票調の行。
 * 金額を等幅数字で右揃えにし、行間に細い罫線を入れて桁を追いやすくする。
 */
const FormulaRow: React.FC<{
  /** 行頭の演算子（−, ＝ など） */
  op?: string;
  label: React.ReactNode;
  /** 項目名の後ろに小さく添える式や内訳 */
  detail?: React.ReactNode;
  value: string;
  /** total は上罫線付きの締め行 */
  variant?: 'normal' | 'total';
}> = ({ op, label, detail, value, variant = 'normal' }) => {
  const isTotal = variant === 'total';
  return (
    <div
      className={`calc-formula-row grid grid-cols-[0.75rem_minmax(0,1fr)_auto] items-baseline gap-x-2 py-1 ${
        isTotal ? 'mt-1 border-t-2 border-slate-300' : 'border-b border-slate-100'
      }`}
    >
      <span className="text-xs text-slate-400">{op}</span>
      <span className={`text-sm ${isTotal ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
        {label}
        {detail && (
          <span className="calc-formula-detail ml-1.5 text-xs font-normal text-slate-400">{detail}</span>
        )}
      </span>
      <span
        className={`text-right text-sm tabular-nums tracking-tight ${
          isTotal ? 'font-bold text-green-800' : 'font-semibold text-slate-800'
        }`}
      >
        {value}
      </span>
    </div>
  );
};

// ── ステップ生成関数 ──

/** ① 課税される財産 */
function buildTaxableStep(result: DetailedTaxCalculationResult): Step {
  const heirCount = result.heirBreakdowns.length;

  return {
    title: '課税される財産を計算する',
    content: (
      <div>
        <FormulaRow label="遺産総額" value={formatCurrency(result.estateValue)} />
        <FormulaRow
          op="−"
          label="基礎控除"
          detail={`${BASIC_DEDUCTION.BASE.toLocaleString()}万円 + ${BASIC_DEDUCTION.PER_HEIR.toLocaleString()}万円 × ${heirCount}人`}
          value={formatCurrency(result.basicDeduction)}
        />
        <FormulaRow op="＝" label="課税遺産総額" value={formatCurrency(result.taxableAmount)} variant="total" />
      </div>
    ),
  };
}

/** 法定相続分が同額の相続人（子1・子2…）は1組にまとめる */
function groupByLegalShare(breakdowns: HeirTaxBreakdown[]): HeirTaxBreakdown[][] {
  const groups = new Map<number, HeirTaxBreakdown[]>();
  for (const b of breakdowns) {
    const members = groups.get(b.legalShareAmount);
    if (members) members.push(b);
    else groups.set(b.legalShareAmount, [b]);
  }
  return [...groups.values()];
}

const groupLabel = (members: HeirTaxBreakdown[]) => {
  if (members.length <= 3) return members.map(m => m.label).join('・');

  // 「兄弟姉妹1〜兄弟姉妹9」は冗長なので、共通の呼称を省いて「兄弟姉妹1〜9」にまとめる
  const first = members[0].label;
  const last = members[members.length - 1].label;
  const base = first.replace(/\d+$/, '');
  return base && last.startsWith(base) ? `${first}〜${last.slice(base.length)}` : `${first}〜${last}`;
};

/** ② 相続税の総額 */
function buildTotalTaxStep(result: DetailedTaxCalculationResult): Step {
  const groups = groupByLegalShare(result.heirBreakdowns);

  // 「340万円 ＋ 145万円 × 2人」のように、総額がどう積み上がったかを示す
  const isSingleHeir = groups.length === 1 && groups[0].length === 1;
  const totalDetail = isSingleHeir
    ? undefined
    : groups
        .map(members =>
          members.length > 1
            ? `${formatCurrency(members[0].taxOnShare)} × ${members.length}人`
            : formatCurrency(members[0].taxOnShare),
        )
        .join(' ＋ ');

  return {
    title: '相続税の総額を計算する',
    notes: [
      '実際の分け方に関わらず、いったん法定相続分で分けたものとして総額を計算します。',
      '税率と控除額は法定取得額の大きさで決まります（速算表）。',
    ],
    content: (
      <div>
        {groups.map((members) => {
          const b = members[0];
          const bracket = TAX_BRACKETS.find(br => b.legalShareAmount <= br.threshold)
            || TAX_BRACKETS[TAX_BRACKETS.length - 1];
          return (
            <React.Fragment key={groupLabel(members)}>
              <p className="calc-group-label pt-2 pb-0.5 text-xs font-semibold tracking-wide text-slate-500">
                {groupLabel(members)}
                <span className="ml-1.5 font-normal text-slate-400">
                  法定相続分 {formatFraction(b.legalShareRatio)}
                  {members.length > 1 && '・1人あたり'}
                </span>
              </p>
              <FormulaRow
                label="法定取得額"
                detail={`${formatCurrency(result.taxableAmount)} × ${formatFraction(b.legalShareRatio)}`}
                value={formatCurrency(b.legalShareAmount)}
              />
              <FormulaRow
                label="税額"
                detail={`${formatCurrency(b.legalShareAmount)} × ${bracket.rate}%${
                  bracket.deduction > 0 ? ` − ${formatCurrency(bracket.deduction)}` : ''
                }`}
                value={formatCurrency(b.taxOnShare)}
              />
            </React.Fragment>
          );
        })}
        <FormulaRow
          label="相続税の総額"
          detail={totalDetail}
          value={formatCurrency(result.totalTax)}
          variant="total"
        />
      </div>
    ),
  };
}

/** ③ 実効税率で各相続人に割り振る（軽減・加算が無い場合はここで納付税額まで確定） */
function buildApportionStep(result: DetailedTaxCalculationResult, isFinal: boolean): Step {
  const rate = formatPercent(result.effectiveTaxRate);

  return {
    title: isFinal
      ? '実際の取得割合で各相続人に割り振る（＝納付税額）'
      : '実際の取得割合で各相続人に割り振る',
    notes: ['相続税の総額を遺産総額で割った「実効税率」を、各相続人の取得額に掛けて求めます。'],
    content: (
      <div>
        <div className="calc-rate-strip mb-1 flex items-baseline justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1">
          <span className="text-xs text-slate-600">
            実効税率
            <span className="ml-1.5 text-slate-400">
              {formatCurrency(result.totalTax)} ÷ {formatCurrency(result.estateValue)}
            </span>
          </span>
          <span className="text-sm font-bold tabular-nums text-green-800">{rate}</span>
        </div>

        <ScreenOnly>
          {result.heirBreakdowns.map((b) => (
            <FormulaRow
              key={b.label}
              label={b.label}
              detail={`${formatCurrency(b.acquisitionAmount)} × ${rate}`}
              value={formatCurrency(b.proportionalTax)}
            />
          ))}
        </ScreenOnly>

        <p className="calc-step-note pt-1 text-xs text-slate-400">
          ※端数調整により1万円単位の差が生じる場合があります。
        </p>
      </div>
    ),
  };
}

/** ④ 税額の軽減・加算（該当が無ければ null） */
function buildAdjustmentStep(result: DetailedTaxCalculationResult): Step | null {
  const spouse = result.spouseDeductionDetail;
  const surcharged = result.heirBreakdowns.filter(b => b.surchargeAmount > 0);
  if (!spouse && surcharged.length === 0) return null;

  const titleParts = [
    spouse ? '配偶者の税額軽減' : null,
    surcharged.length > 0 ? '2割加算' : null,
  ].filter(Boolean);

  const totalSurcharge = surcharged.reduce((sum, b) => sum + b.surchargeAmount, 0);

  return {
    title: `${titleParts.join('・')}を反映する`,
    content: (
      <div className="calc-adjust-boxes space-y-2">
        {spouse && (
          <p className="calc-adjust-box rounded border-l-4 border-green-600 bg-green-50 px-2.5 py-2 text-sm text-slate-700">
            配偶者は <span className="font-medium">{formatCurrency(spouse.deductionLimit)}</span> まで相続税がかかりません。
            取得額 {formatCurrency(spouse.acquisitionAmount)} は
            {spouse.acquisitionAmount <= spouse.deductionLimit ? 'その範囲内' : 'これを超える'}のため、
            <span className="font-bold text-green-800">{formatCurrency(spouse.actualDeduction)}</span> が軽減されます。
          </p>
        )}
        {surcharged.length > 0 && (
          <p className="calc-adjust-box rounded border-l-4 border-orange-500 bg-orange-50 px-2.5 py-2 text-sm text-slate-700">
            兄弟姉妹・甥姪は税額が2割増しになります。
            {/* 人数が増えても印刷の高さが変わらないよう、印刷では合計額だけを出す */}
            <span className="no-print">
              {surcharged.map((b) => (
                <span key={b.label} className="ml-2">
                  {b.label}: <span className="font-bold text-orange-700">+{formatCurrency(b.surchargeAmount)}</span>
                </span>
              ))}
            </span>
            <span className="print-only-inline">
              加算額 合計 <span className="font-bold text-orange-700">+{formatCurrency(totalSurcharge)}</span>
            </span>
          </p>
        )}
      </div>
    ),
  };
}

function buildSteps(result: DetailedTaxCalculationResult): Step[] {
  const adjustmentStep = buildAdjustmentStep(result);

  return [
    buildTaxableStep(result),
    buildTotalTaxStep(result),
    buildApportionStep(result, adjustmentStep === null),
    ...(adjustmentStep ? [adjustmentStep] : []),
  ];
}

export const CalculationSteps: React.FC<CalculationStepsProps> = ({ result }) => {
  const steps = buildSteps(result);

  return (
    <div className={`${CARD} calc-steps-card`}>
      <h3 className="calc-steps-title mb-4 text-base md:mb-6 md:text-lg font-bold text-slate-800">
        どのように計算したか
        <span className="ml-2 text-xs font-normal text-slate-500">計算の流れ</span>
      </h3>
      <div className="calc-steps-grid space-y-4 md:space-y-5">
        {steps.map((step, index) => (
          <div key={step.title} className="calc-step-item">
            <div className="calc-step-head mb-1.5 flex items-baseline gap-2 border-b border-slate-300 pb-1">
              <span className="flex-shrink-0 text-[10px] font-bold tracking-[0.15em] text-slate-400">
                STEP {index + 1}
              </span>
              <h4 className="text-sm font-bold text-slate-800">{step.title}</h4>
            </div>
            {step.notes?.map((note) => (
              <p key={note} className="calc-step-note mb-1 text-xs leading-relaxed text-slate-500">{note}</p>
            ))}
            {step.content}
          </div>
        ))}
      </div>
    </div>
  );
};
