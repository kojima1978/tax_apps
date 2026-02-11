import { CalculationResult } from '@/lib/types';
import { DetailTable, DetailRow, ResultBox } from './helpers';

interface PerShareDetailsProps {
  result: CalculationResult;
}

export default function PerShareDetails({ result }: PerShareDetailsProps) {
  const S = result.perShareSimilarIndustryValue;
  const N = result.perShareNetAssetValue;
  const L = result.lRatio;
  const perShareValue = result.perShareValue;
  const evaluationMethod = result.evaluationMethod;

  const methods = [
    {
      match: evaluationMethod === '類似業種比準方式',
      formula: '1口あたりの評価額 = 類似業種比準価額',
      rows: [{ label: '類似業種比準価額 (S)', value: `${S.toLocaleString()}円` }],
      resultText: `1口あたりの評価額 = `,
    },
    {
      match: evaluationMethod === '純資産価額方式',
      formula: '1口あたりの評価額 = 純資産価額',
      rows: [{ label: '純資産価額 (N)', value: `${N.toLocaleString()}円` }],
      resultText: `1口あたりの評価額 = `,
    },
    {
      match: evaluationMethod.includes('併用方式'),
      formula: '1口あたりの評価額 = S × L + N × (1 - L)',
      rows: [
        { label: 'S：類似業種比準価額', value: `${S.toLocaleString()}円` },
        { label: 'N：純資産価額', value: `${N.toLocaleString()}円` },
        { label: 'L：L値（併用割合）', value: L.toFixed(2) },
      ],
      resultText: `${S.toLocaleString()} × ${L.toFixed(2)} + ${N.toLocaleString()} × ${(1 - L).toFixed(2)} = `,
    },
  ];

  const active = methods.find((m) => m.match);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold border-b-2 border-gray-300 pb-2">
        1口あたりの評価額の計算過程
      </h3>

      {active && (
        <div>
          <h4 className="font-bold mb-2">【計算式】</h4>
          <p className="font-mono text-sm mb-4">{active.formula}</p>
          <DetailTable>
            {active.rows.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </DetailTable>
          <ResultBox>
            <p className="font-mono text-lg">
              {active.resultText}<span className="font-bold">{perShareValue.toLocaleString()}円</span>
            </p>
          </ResultBox>
        </div>
      )}
    </div>
  );
}
