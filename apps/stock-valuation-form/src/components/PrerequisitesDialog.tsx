import { useEffect } from 'react';
import type { TableProps } from '@/types/form';
import {
  getValuationPurpose,
  SPECIAL_CENTRAL_HOLDER_FIELD,
  VALUATION_PURPOSE_FIELD,
  type ValuationPurpose,
} from '@/lib/valuationPurpose';

type Props = Pick<TableProps, 'getField' | 'updateField'>;

const MEDICAL_FIELD = 'medical';

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

/** 前提条件（評価目的・会社の種類）の現在値。チップの表示とダイアログで共有する。 */
function readPrerequisites(getField: TableProps['getField']) {
  const purpose = getValuationPurpose(getField);
  return {
    purpose,
    special: purpose !== 'inheritance',
    centralHolder: getField('table1_1', SPECIAL_CENTRAL_HOLDER_FIELD) === '1',
    medical: getField('table1_1', MEDICAL_FIELD) === '1',
  };
}

/**
 * 前提条件チップ（常時表示）。
 * 評価目的は帳票の紙面に現れないまま計算根拠を変えるため、設定画面へ隠さず現在値を出し続ける。
 */
export function PrerequisitesChip({ getField, onClick }: Pick<Props, 'getField'> & { onClick: () => void }) {
  const { special, centralHolder, medical } = readPrerequisites(getField);
  const tags = [
    special ? '所得税・法人税ベース' : '相続税・贈与税ベース',
    ...(centralHolder ? ['常に小会社'] : []),
    ...(medical ? ['医療法人'] : []),
  ];
  return (
    <button
      type="button"
      className={`app-tool-btn app-prereq-chip${special ? ' is-special' : ''}`}
      onClick={onClick}
      title="評価目的（適用する通達）と会社の種類を設定します。会社規模の判定・純資産価額・類似業種比準の計算が切り替わります"
    >
      <span className="app-prereq-chip-label">前提条件</span>
      {tags.join('／')}
    </button>
  );
}

/** 前提条件ダイアログ。計算の土台になる選択をここ1か所に集約する。 */
export function PrerequisitesDialog({ getField, updateField, onClose }: Props & { onClose: () => void }) {
  const { purpose, special, centralHolder, medical } = readPrerequisites(getField);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const updatePurpose = (value: ValuationPurpose) => {
    updateField('table1_1', VALUATION_PURPOSE_FIELD, value === 'inheritance' ? '' : value);
    if (value === 'inheritance') updateField('table1_1', SPECIAL_CENTRAL_HOLDER_FIELD, '');
  };

  return (
    <div className="no-print prereq-backdrop" onClick={onClose}>
      <div
        className="prereq-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prereq-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="valuation-purpose-heading">
          <div>
            <h2 id="prereq-title">前提条件</h2>
            <p>この評価の土台になる選択です。会社規模の判定・純資産価額・類似業種比準の計算が切り替わります。</p>
          </div>
          {special && <span className="valuation-purpose-badge">特例計算中</span>}
        </div>

        <h3 className="prereq-section-title">評価目的（適用する通達）</h3>
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

        <h3 className="prereq-section-title">会社の種類</h3>
        <label className={`valuation-purpose-option prereq-medical${medical ? ' is-selected' : ''}`}>
          <input
            id="table1_1-medical"
            name="table1_1.medical"
            type="checkbox"
            checked={medical}
            onChange={(e) => updateField('table1_1', MEDICAL_FIELD, e.target.checked ? '1' : '')}
          />
          <span>
            <strong>医療法人（持分あり）</strong>
            <small>評価通達194－2</small>
            <span>持分の定めのある医療法人の出資を評価する場合にチェックします。類似業種比準価額は配当要素を除いた（Ⓒ/C＋Ⓓ/D）÷2で計算し、配当還元方式は適用しません。</span>
          </span>
        </label>

        <div className="prereq-actions">
          <button type="button" className="app-tool-btn" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
