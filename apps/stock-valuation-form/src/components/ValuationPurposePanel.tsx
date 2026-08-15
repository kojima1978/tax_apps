import type { TableProps } from '@/types/form';
import {
  getValuationPurpose,
  SPECIAL_CENTRAL_HOLDER_FIELD,
  VALUATION_PURPOSE_FIELD,
  type ValuationPurpose,
} from '@/lib/valuationPurpose';

type Props = Pick<TableProps, 'getField' | 'updateField'>;

const OPTIONS: ReadonlyArray<{
  value: ValuationPurpose;
  title: string;
  citation: string;
  description: string;
}> = [
  {
    value: 'inheritance',
    title: '相続税・贈与税の評価',
    citation: '財産評価基本通達178～189－7',
    description: '通常の取引相場のない株式の評価明細書として計算します。',
  },
  {
    value: 'special-market-value',
    title: '所得税・法人税の時価評価',
    citation: '所得税基本通達59－6／法人税基本通達9－1－14',
    description: '両通達に共通する取扱いにより、取引相場のない株式の時価を算定します。',
  },
];

export function ValuationPurposePanel({ getField, updateField }: Props) {
  const purpose = getValuationPurpose(getField);
  const special = purpose !== 'inheritance';
  const centralHolder = getField('table1_1', SPECIAL_CENTRAL_HOLDER_FIELD) === '1';

  const updatePurpose = (value: ValuationPurpose) => {
    updateField('table1_1', VALUATION_PURPOSE_FIELD, value === 'inheritance' ? '' : value);
    if (value === 'inheritance') updateField('table1_1', SPECIAL_CENTRAL_HOLDER_FIELD, '');
  };

  return (
    <section className="valuation-purpose no-print" aria-labelledby="valuation-purpose-title">
      <div className="valuation-purpose-heading">
        <div>
          <h2 id="valuation-purpose-title">評価目的</h2>
          <p>適用する通達を選択すると、会社規模と純資産価額の計算を切り替えます。</p>
        </div>
        {special && <span className="valuation-purpose-badge">特例計算中</span>}
      </div>

      <div className="valuation-purpose-options" role="radiogroup" aria-label="評価目的">
        {OPTIONS.map((option) => (
          <label key={option.value} className={`valuation-purpose-option${purpose === option.value ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name="valuation-purpose"
              value={option.value}
              checked={purpose === option.value}
              onChange={() => updatePurpose(option.value)}
            />
            <span>
              <strong>{option.title}</strong>
              <small>{option.citation}</small>
              <span>{option.description}</span>
            </span>
          </label>
        ))}
      </div>

      {special && (
        <div className="valuation-purpose-guidance" role="note">
          <label className="valuation-purpose-central">
            <input
              type="checkbox"
              checked={centralHolder}
              onChange={(event) => updateField('table1_1', SPECIAL_CENTRAL_HOLDER_FIELD, event.target.checked ? '1' : '')}
            />
            <span>
              <strong>譲渡・贈与した個人または株式を保有する法人が「中心的な同族株主」に該当する</strong>
              <small>該当する場合は、評価通達179の計算上、発行会社を常に小会社として扱います。</small>
            </span>
          </label>
          <ul>
            <li>第5表の評価差額に対する法人税額等相当額は控除しません。</li>
            <li>発行会社が保有する土地・上場有価証券は、評価基準時点の価額を第5表へ入力してください。</li>
            <li>59－6を適用する場合、株主・議決権数は譲渡・贈与直前の状態で入力してください。</li>
          </ul>
        </div>
      )}
    </section>
  );
}
