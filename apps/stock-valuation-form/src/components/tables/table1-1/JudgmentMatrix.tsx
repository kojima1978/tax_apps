import { CircledNumber } from '@/components/ui/CircledNumber';
import { hl } from '../shared';

const MATRIX_ROWS = [
  { key: 'over50' as const, label: '50%超', values: ['50%超', '30%以上', '15%以上'], category: '同族株主', categoryStyle: {} as React.CSSProperties },
  { key: 'under50' as const, label: '50%未満', values: ['50%未満', '30%未満', '15%未満'], category: <>同族株主等<br />以外の株主</>, categoryStyle: { fontSize: 7.5 } as React.CSSProperties },
];

interface Props {
  matrixRow: 'over50' | 'under50' | null;
  matrixCol: 0 | 1 | 2 | null;
  autoClass: '同族株主等' | '同族株主等以外' | null;
}

export function JudgmentMatrix({ matrixRow, matrixCol, autoClass }: Props) {
  return (
    <table className="gov-table" style={{ fontSize: 8, flex: 1 }}>
      <thead>
        {/* 判定基準ヘッダー */}
        <tr>
          <th colSpan={5} style={{ fontWeight: 400, textAlign: 'left', padding: '2px 4px' }}>
            納税義務者の属する同族関係者グループの議決権割合
            （<CircledNumber n={5} />の割合）を基として、区分します。
          </th>
        </tr>
        {/* マトリクスヘッダー */}
        <tr>
          <th rowSpan={2} style={{ width: '15%', fontSize: 7.5, lineHeight: 1.3 }}>
            同族関係者<br />グループの<br />議決権割合<br />（<CircledNumber n={5} />の割合）
          </th>
          <th colSpan={3} style={{ fontSize: 7.5 }}>
            筆頭株主グループの議決権割合（<CircledNumber n={6} />の割合）
          </th>
          <th rowSpan={2} style={{ width: '18%', fontSize: 7.5 }}>株主の区分</th>
        </tr>
        <tr>
          <th style={{ fontSize: 7.5, width: '22%' }}>50%超の<br />場合</th>
          <th style={{ fontSize: 7.5, width: '22%' }}>30%以上50%<br />以下の場合</th>
          <th style={{ fontSize: 7.5, width: '22%' }}>30%未満の<br />場合</th>
        </tr>
      </thead>
      <tbody>
        {/* マトリクスデータ */}
        {MATRIX_ROWS.map(({ key, label, values, category, categoryStyle }) => (
          <tr key={key}>
            <td className="gov-header" style={matrixRow === key ? hl : undefined}>{label}</td>
            {values.map((v, col) => (
              <td key={col} style={matrixRow === key && matrixCol === col ? hl : undefined}>{v}</td>
            ))}
            <td className="gov-header" style={{ ...categoryStyle, ...(matrixRow === key ? hl : {}) }}>{category}</td>
          </tr>
        ))}
        {/* 同族/配当還元 分類 */}
        <tr>
          <td colSpan={3} style={{ textAlign: 'center', padding: '3px 2px', fontSize: 8.5, ...(autoClass === '同族株主等' ? hl : {}) }}>
            <div>同 族 株 主 等</div>
            <div>（原則的評価方式等）</div>
          </td>
          <td colSpan={2} style={{ textAlign: 'center', padding: '3px 2px', fontSize: 8.5, ...(autoClass === '同族株主等以外' ? hl : {}) }}>
            <div>同族株主等以外の株主</div>
            <div>（配 当 還 元 方 式）</div>
          </td>
        </tr>
        {/* 注意文 */}
        <tr>
          <td colSpan={5} style={{ padding: '2px 4px', fontSize: 7.5, lineHeight: 1.25, textAlign: 'left' }}>
            「同族株主等」に該当する納税義務者のうち、議決権割合（<CircledNumber n={5} />
            の割合）が５％未満の者の評価方式は、「２．少数株式所有者の評価
            方式の判定」欄により判定します。
          </td>
        </tr>
      </tbody>
    </table>
  );
}
