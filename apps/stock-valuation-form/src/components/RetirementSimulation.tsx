import { useId, useMemo, useState } from 'react';
import type { TableProps } from '@/types/form';
import type { ValuationBasis } from '@/lib/valuationReport';
import { filterBases, formatAssumedProfit, type BasisFilter } from '@/lib/summaryOptions';
import { calcRetirementSimulation, RETIREMENT_AMOUNT_FIELD, RETIREMENT_INSURANCE_FIELD } from '@/lib/retirementSimulation';

type Props = Pick<TableProps, 'getField' | 'updateField'> & {
  basis: BasisFilter;
  before: ValuationBasis[];
  onHide: () => void;
};
const money = (n: number | null) => n === null ? '算定未完了' : `${n.toLocaleString('ja-JP')}円`;
const sen = (n: number | null) => `${(n ?? 0).toLocaleString('ja-JP')}千円`;
const difference = (now: number | null, after: number | null) => {
  if (now === null || after === null) return '比較に必要な金額が未算定です';
  const diff = after - now;
  return diff === 0 ? '現在と同額' : `現在より${Math.abs(diff).toLocaleString('ja-JP')}円${diff > 0 ? '高い' : '低い'}`;
};
// 2つの入力欄は「0以上の整数・千円」で挙動が同じなので、違うところだけ表に持つ。
const AMOUNT_FIELDS: { field: string; label: string; placeholder: string }[] = [
  { field: RETIREMENT_AMOUNT_FIELD, label: '退職金支給額（千円）', placeholder: '例：5,000' },
  { field: RETIREMENT_INSURANCE_FIELD, label: '保険の解約益（千円）', placeholder: '例：3,000' },
];

export function RetirementSimulation({ getField, updateField, basis, before, onHide }: Props) {
  const texts = AMOUNT_FIELDS.map((item) => getField('table1_1', item.field));
  const [settingsOpen, setSettingsOpen] = useState(() => texts.every((text) => !text));
  const errorId = useId();
  const result = useMemo(() => calcRetirementSimulation(getField), [getField]);
  const ready = result.bases.length > 0;
  const set = (field: string, value: string) => updateField('table1_1', field, value);
  const headline = ready
    ? [`支給額 ${sen(result.amount)}`, ...(result.proceeds ? [`解約益 ${sen(result.proceeds)}`] : []), '税軽減なし'].join(' ／ ')
    : '退職金額・解約益を入力してください';
  return (
    <section className={`summary-retirement summary-prices${ready ? '' : ' no-print'}`} aria-labelledby="summary-retirement-title">
      <div className="summary-sensitivity-heading">
        <h2 id="summary-retirement-title">退職金支給後のシミュレーション</h2>
        <span>1株当たり</span>
      </div>
      <details className="summary-settings no-print" open={settingsOpen} onToggle={(event) => setSettingsOpen(event.currentTarget.open)}>
        <summary>表示・印刷設定<span>{headline}</span></summary>
        <div className="summary-section-tools">
          <label className="summary-option"><input type="checkbox" checked onChange={onHide} />出力する</label>
          {AMOUNT_FIELDS.map((item, index) => {
            const invalid = result.errorField === item.field;
            return (
              <label className="summary-retirement-field" key={item.field}>{item.label}
                <input aria-label={item.label} inputMode="numeric" value={texts[index]}
                  onChange={(event) => set(item.field, formatAssumedProfit(event.target.value))}
                  aria-invalid={invalid} aria-describedby={invalid ? errorId : undefined} placeholder={item.placeholder} />
              </label>
            );
          })}
          <small>帳票にまだ反映していない金額を入力してください。解約益は解約返戻金から資産計上額（保険積立金）を差し引いた雑収入で、全額損金型なら返戻金の全額です。支払原資・現預金残高は考慮しません。</small>
        </div>
      </details>
      {result.error && <p id={errorId} className="summary-retirement-error no-print" role="alert">{result.error}</p>}
      {texts.every((text) => !text) && <p className="summary-price-group-note no-print">支給額を入力すると、支給後の評価額を表示します。</p>}
      {ready && <>
        <p className="summary-price-group-note">退職金 {sen(result.amount)}を支給{result.proceeds ? `し、保険の解約益 ${sen(result.proceeds)}を同じ期に計上` : ''}した場合（支払原資は考慮しない）</p>
        {filterBases(result.bases, basis).map((after) => {
          const current = before.find((item) => item.key === after.key);
          const rate = after.size === null ? null : after.size === 4 ? 1 : after.size === 0 ? 0.5 : after.lRate;
          return <div className="summary-price-group" key={after.key}>
            <h3 className="summary-forecast-subhead" id={`retirement-${after.key}`}>{after.label}</h3>
            <div className="summary-table-scroll">
              <table className="summary-table" aria-labelledby={`retirement-${after.key}`}>
                <thead><tr><th scope="col">評価項目</th><th scope="col" className="summary-holders-num">金額・内容</th></tr></thead>
                <tbody>
                  <tr className="summary-company-size"><th scope="row">会社の規模</th><td className="summary-holders-num">{after.sizeLabel}{rate !== null && <small>類似業種 {(rate * 100).toLocaleString('ja-JP')}％・純資産 {((1 - rate) * 100).toLocaleString('ja-JP', { maximumFractionDigits: 2 })}％（併用する場合）</small>}</td></tr>
                  <tr><th scope="row">類似業種比準価額</th><td className="summary-holders-num">{money(after.comparablePrice)}</td></tr>
                  <tr><th scope="row">純資産価額</th><td className="summary-holders-num">{money(after.netAssetPrice)}</td></tr>
                  <tr className="summary-table-emphasis"><th scope="row">原則的評価方式による評価額</th><td className="summary-holders-num">{money(after.gensoku)}<small className="summary-price-difference">{difference(current?.gensoku ?? null, after.gensoku)}</small></td></tr>
                </tbody>
              </table>
            </div>
          </div>;
        })}
        <p className="summary-price-group-note">直前期に全額を損金算入する前提で、会社規模・資産構成は現状固定です。法人税の減額効果・受給者の税金・退任による株主区分の変化は含めません。帳票の手動判定・修正欄は引き継ぎます。</p>
        {!!result.proceeds && <p className="summary-price-group-note">解約益は非経常的な利益として第4表の⑫にも計上するため、類似業種比準の年利益金額（Ⓒ）には乗らず、利益積立金額を通じてⒹにだけ効きます。保険は第5表に解約返戻金相当額で計上済みとみなし、純資産価額は動かしていません。</p>}
      </>}
    </section>
  );
}
