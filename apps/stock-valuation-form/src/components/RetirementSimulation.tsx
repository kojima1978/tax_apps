import { useMemo, useState } from 'react';
import type { TableProps } from '@/types/form';
import type { ValuationBasis } from '@/lib/valuationReport';
import { filterBases, formatAssumedProfit, type BasisFilter } from '@/lib/summaryOptions';
import { calcRetirementSimulation, RETIREMENT_AMOUNT_FIELD } from '@/lib/retirementSimulation';

type Props = Pick<TableProps, 'getField' | 'updateField'> & {
  basis: BasisFilter;
  before: ValuationBasis[];
  onHide: () => void;
};
const money = (n: number | null) => n === null ? '算定未完了' : `${n.toLocaleString('ja-JP')}円`;
const difference = (now: number | null, after: number | null) => {
  if (now === null || after === null) return '比較に必要な金額が未算定です';
  const diff = after - now;
  return diff === 0 ? '現在と同額' : `現在より${Math.abs(diff).toLocaleString('ja-JP')}円${diff > 0 ? '高い' : '低い'}`;
};

export function RetirementSimulation({ getField, updateField, basis, before, onHide }: Props) {
  const amountText = getField('table1_1', RETIREMENT_AMOUNT_FIELD);
  const [settingsOpen, setSettingsOpen] = useState(() => !amountText);
  const result = useMemo(() => calcRetirementSimulation(getField), [getField]);
  const ready = result.bases.length > 0;
  const set = (field: string, value: string) => updateField('table1_1', field, value);
  return (
    <section className={`summary-retirement summary-prices${ready ? '' : ' no-print'}`} aria-labelledby="summary-retirement-title">
      <div className="summary-sensitivity-heading">
        <h2 id="summary-retirement-title">退職金支給後のシミュレーション</h2>
        <span>1株当たり</span>
      </div>
      <details className="summary-settings no-print" open={settingsOpen} onToggle={(event) => setSettingsOpen(event.currentTarget.open)}>
        <summary>表示・印刷設定<span>{ready ? '試算を出力します' : '退職金額を入力してください'}</span></summary>
        <div className="summary-section-tools">
          <label className="summary-option"><input type="checkbox" checked onChange={onHide} />出力する</label>
          <label className="summary-retirement-field">退職金支給額（千円）
            <input aria-label="退職金支給額（千円）" inputMode="numeric" value={amountText}
              onChange={(event) => set(RETIREMENT_AMOUNT_FIELD, formatAssumedProfit(event.target.value))}
              aria-invalid={!!result.error} placeholder="例：5,000" />
          </label>
          <small>帳票にまだ反映していない追加支給額を入力してください。支払原資・現預金残高は考慮しません。</small>
        </div>
      </details>
      {result.error && <p className="summary-retirement-error no-print" role="alert">{result.error}</p>}
      {!amountText && <p className="summary-price-group-note no-print">支給額を入力すると、支給後の評価額を表示します。</p>}
      {ready && <>
        <p className="summary-price-group-note">退職金 {result.amount!.toLocaleString('ja-JP')}千円を支給した場合（支払原資は考慮しない）</p>
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
      </>}
    </section>
  );
}
