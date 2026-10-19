import { calcGeneralCompanySimulation } from '@/lib/generalCompanySimulation';
import { SIZE_NAMES } from '@/lib/clientSummary';
import { formatAmount } from '@/lib/numberFormat';
import type { ValuationBasis } from '@/lib/valuationReport';
import type { TableProps } from '@/types/form';

const price = (value: number | null) => value === null ? '算定未完了' : `${formatAmount(value)}円`;

export function GeneralCompanySimulation({ getField, bases }: Pick<TableProps, 'getField'> & { bases: ValuationBasis[] }) {
  const rows = bases.flatMap((basis) => {
    const trial = calcGeneralCompanySimulation(getField, basis.key);
    return trial ? [{ basis, trial }] : [];
  });
  if (!rows.length) return null;

  return (
    <div className="summary-price-group">
      <h3 className="summary-forecast-subhead" id="summary-general-company-title">比準0・比準1から一般の評価会社になった場合</h3>
      <p className="summary-price-group-note">
        配当・利益・純資産を現在の入力値に据え置き、一般会社の原則的評価方式を適用した場合の参考比較です。1株当たり・修正前の価額で比較します。
      </p>
      <div className="summary-table-scroll">
        <table className="summary-table" aria-labelledby="summary-general-company-title">
          <thead><tr>
            <th scope="col">評価ベース・現在の区分</th>
            <th scope="col" className="summary-holders-num">現在の方式</th>
            <th scope="col" className="summary-holders-num">一般会社の原則評価</th>
            <th scope="col" className="summary-holders-num">差額・増減率</th>
          </tr></thead>
          <tbody>{rows.map(({ basis, trial }) => (
            <tr key={basis.key}>
              <th scope="row">{basis.label}<small>{trial.source} → 一般の評価会社</small></th>
              <td className="summary-holders-num">{trial.blockers.length ? '他の特定会社区分に該当' : price(trial.currentPrice)}</td>
              <td className="summary-holders-num">{price(trial.generalPrice)}<small>{trial.size === null ? '会社規模の判定待ち' : SIZE_NAMES[trial.size]}</small></td>
              <td className="summary-holders-num">{trial.diff === null ? '比較未完了' : trial.diff === 0 ? '現在と同額' : `${trial.diff > 0 ? '+' : '△'}${formatAmount(Math.abs(trial.diff))}円`}
                {trial.diffRate !== null && <small>{trial.diffRate > 0 ? '+' : trial.diffRate < 0 ? '△' : ''}{Math.abs(trial.diffRate).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}%</small>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {rows.map(({ basis, trial }) => (
        <p className="summary-price-group-note" key={basis.key}>
          {basis.label}：類似業種比準価額 {price(trial.comparable)} ／ 純資産価額（80％調整があれば調整後） {price(trial.netAsset)}。
          {trial.blockers.length > 0 && ` ${trial.blockers.join('・')}にも該当しているため、比準要素の回復だけでは一般会社になりません。`}
          {trial.pending.length > 0 && ` ${trial.pending.join('・')}は判定未完了です。`}
        </p>
      ))}
      <p className="summary-sensitivity-disclaimer">
        区分の変更のみを仮定した参考値です。比準要素が回復した後の予測株価ではありません。実際に移行する場合は、回復後の配当・利益・純資産と他の特定会社区分を再判定します。現在の要素がすべて0なら一般会社の参考値も0になります。配当還元方式による株主別評価とは異なります。
      </p>
    </div>
  );
}
