import { FormHeader } from '@/components/FormHeader';
import { FormField } from '@/components/ui/FormField';
import { NumberField } from '@/components/ui/NumberField';
import { CircledNumber } from '@/components/ui/CircledNumber';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table1_1';

export function Table1_1({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form">
      {/* ヘッダー */}
      <FormHeader
        title="第１表の１　評価上の株主の判定及び会社規模の判定の明細書"
        getField={(f) => g(f)}
        updateField={(f, v) => u(f, v)}
      />

      {/* ==================== 1. 株主及び評価方式の判定 ==================== */}
      <div className="gov-cell-b" style={{ minHeight: 18, padding: '2px 4px' }}>
        <span className="font-bold">１．株主及び評価方式の判定</span>
      </div>

      {/* 株主一覧テーブル */}
      <table className="gov-table">
        <thead>
          <tr>
            <th style={{ width: 30 }}>項 目</th>
            <th style={{ width: 100 }}>氏名又は名称</th>
            <th style={{ width: 50 }}>続 柄</th>
            <th style={{ width: 30 }}>区 分</th>
            <th>
              <div>イ　株 式 数</div>
              <div className="text-[8px]">（株式の種類）</div>
            </th>
            <th>ロ　議 決 権 数</th>
            <th>
              <div>ハ　議決権割合</div>
              <div className="text-[8px]">( ロ /<CircledNumber n={4} />)</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {/* 納税義務者 */}
          <tr>
            <td className="gov-header text-[8px]">納 税<br />義務者</td>
            <td>
              <FormField value={g('sh_name_0')} onChange={(v) => u('sh_name_0', v)} />
            </td>
            <td>
              <FormField value={g('sh_rel_0')} onChange={(v) => u('sh_rel_0', v)} textAlign="center" />
            </td>
            <td>
              <FormField value={g('sh_role_0')} onChange={(v) => u('sh_role_0', v)} textAlign="center" />
            </td>
            <td>
              <NumberField value={g('sh_shares_0')} onChange={(v) => u('sh_shares_0', v)} unit="株" />
            </td>
            <td>
              <NumberField value={g('sh_votes_0')} onChange={(v) => u('sh_votes_0', v)} unit="個" />
            </td>
            <td>
              <NumberField value={g('sh_ratio_0')} onChange={(v) => u('sh_ratio_0', v)} unit="％" />
            </td>
          </tr>
          {/* 同族関係者 (6行) */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <tr key={i}>
              <td className="gov-header text-[8px]">
                {i === 1 && (
                  <div>同族<br />関係者</div>
                )}
              </td>
              <td>
                <FormField value={g(`sh_name_${i}`)} onChange={(v) => u(`sh_name_${i}`, v)} />
              </td>
              <td>
                <FormField value={g(`sh_rel_${i}`)} onChange={(v) => u(`sh_rel_${i}`, v)} textAlign="center" />
              </td>
              <td>
                <FormField value={g(`sh_role_${i}`)} onChange={(v) => u(`sh_role_${i}`, v)} textAlign="center" />
              </td>
              <td>
                <NumberField value={g(`sh_shares_${i}`)} onChange={(v) => u(`sh_shares_${i}`, v)} unit="株" />
              </td>
              <td>
                <NumberField value={g(`sh_votes_${i}`)} onChange={(v) => u(`sh_votes_${i}`, v)} unit="個" />
              </td>
              <td>
                <NumberField value={g(`sh_ratio_${i}`)} onChange={(v) => u(`sh_ratio_${i}`, v)} unit="％" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 議決権合計 */}
      <div className="gov-section">
        <table className="gov-table">
          <tbody>
            <tr>
              <td className="gov-header text-left" style={{ width: '40%' }}>
                <CircledNumber n={1} /> 納税義務者の属する同族関係者グループの議決権の合計数
              </td>
              <td>
                <NumberField value={g('total_group_votes')} onChange={(v) => u('total_group_votes', v)} unit="個" />
              </td>
              <td className="gov-header text-left" style={{ width: '25%' }}>
                <CircledNumber n={4} /> 評価会社の発行済株式又は議決権の総数
              </td>
              <td>
                <NumberField value={g('total_company_votes')} onChange={(v) => u('total_company_votes', v)} unit="個" />
              </td>
            </tr>
            <tr>
              <td className="gov-header text-left">
                <CircledNumber n={2} /> <CircledNumber n={5} />（<CircledNumber n={2} />/<CircledNumber n={4} />）
              </td>
              <td>
                <NumberField value={g('ratio_2_4')} onChange={(v) => u('ratio_2_4', v)} unit="％" />
              </td>
              <td className="gov-header text-left">
                <CircledNumber n={3} /> 筆頭株主グループの議決権の合計数
              </td>
              <td>
                <NumberField value={g('top_group_votes')} onChange={(v) => u('top_group_votes', v)} unit="個" />
              </td>
            </tr>
            <tr>
              <td className="gov-header text-left">
                <CircledNumber n={3} /> <CircledNumber n={6} />（<CircledNumber n={3} />/<CircledNumber n={4} />）
              </td>
              <td>
                <NumberField value={g('ratio_3_4')} onChange={(v) => u('ratio_3_4', v)} unit="％" />
              </td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 判定フロー */}
      <div className="gov-section">
        <div className="gov-header gov-cell-b px-1 py-0.5 font-bold text-center">
          株主の区分の判定
        </div>

        {/* 判定基準：筆頭株主グループの議決権割合（⑥の割合） */}
        <div className="px-1 py-0.5 gov-cell-b text-[9px]">
          納税義務者の属する同族関係者グループの議決権割合（<CircledNumber n={5} />の割合）を基として、区分します。
        </div>

        <table className="gov-table text-[9px]">
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: '18%' }}>
                <CircledNumber n={5} />の割合
              </th>
              <th colSpan={2}>
                筆頭株主グループの議決権割合（<CircledNumber n={6} />の割合）
              </th>
              <th rowSpan={2} style={{ width: '18%' }}>株主の区分</th>
            </tr>
            <tr>
              <th>３０％以上の場合</th>
              <th>３０％未満の場合</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="gov-header">５０％超</td>
              <td colSpan={2} className="text-center">同族株主等</td>
              <td>
                <span className="gov-choice" onClick={() => u('sh_class', '原則的評価方式等')}>
                  原則的評価方式等
                </span>
              </td>
            </tr>
            <tr>
              <td className="gov-header">
                ３０%以上５０%以下の場合
              </td>
              <td>同族株主等</td>
              <td>
                <div><CircledNumber n={5} /> ３０％以上 → 同族株主等</div>
                <div><CircledNumber n={5} /> １５％以上 → 同族株主等</div>
                <div><CircledNumber n={5} /> １５％未満 → 同族株主等以外の株主</div>
              </td>
              <td>
                <div>
                  <span className="gov-choice" onClick={() => u('sh_class', '原則的')}>
                    原則的評価方式等
                  </span>
                </div>
                <div>
                  <span className="gov-choice" onClick={() => u('sh_class', '配当還元')}>
                    配当還元方式
                  </span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="gov-header">３０％未満</td>
              <td colSpan={2}>同族株主等以外の株主</td>
              <td>
                <span className="gov-choice" onClick={() => u('sh_class', '配当還元方式')}>
                  配当還元方式
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="px-1 py-0.5 text-[8px] gov-cell-b">
          「同族株主等」に該当する納税義務者のうち、議決権割合（ ハ の割合）が５％未満の者の評価方式は、「２．少数株式所有者の評価方式の判定」欄により判定します。
        </div>
      </div>

      {/* ==================== 2. 少数株式所有者の評価方式の判定 ==================== */}
      <div className="gov-section">
        <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
          ２．少数株式所有者の評価方式の判定
        </div>

        <table className="gov-table text-[9px]">
          <thead>
            <tr>
              <th style={{ width: '50%' }}>判 定 内 容</th>
              <th>判 定</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-left px-2">
                会社におけ る 役 職 名
              </td>
              <td>
                <FormField value={g('position')} onChange={(v) => u('position', v)} textAlign="center" />
              </td>
            </tr>
            <tr>
              <td className="text-left px-2">
                <div>ニ　役 員</div>
                <div className="ml-4">がいる（配当還元方式）　・　がいない</div>
              </td>
              <td>
                <div className="flex gap-2 justify-center">
                  <span className="gov-choice" onClick={() => u('minority_ni', 'いる')}>
                    である
                  </span>
                  <span>・</span>
                  <span className="gov-choice" onClick={() => u('minority_ni', 'いない')}>
                    でない（次のホへ)
                  </span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="text-left px-2">
                <div>ホ　納税義務者が</div>
                <div className="ml-4">中心的な同族株主　である　・　でない</div>
              </td>
              <td>
                <div className="flex gap-2 justify-center">
                  <span>原則的評価方式等</span>
                  <span>・</span>
                  <span className="gov-choice" onClick={() => u('minority_ho', 'でない')}>
                    でない（次のヘへ)
                  </span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="text-left px-2">
                <div>ヘ　納税義務者以外に中心的な同族株主（又は株主）</div>
              </td>
              <td>
                <div className="flex gap-2 justify-center">
                  <span>原則的評価方式等</span>
                  <span>・</span>
                  <span>配当還元方式</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 現在の株式等の所有状況 */}
      <div className="gov-section">
        <div className="gov-header gov-cell-b px-1 py-0.5 text-[9px]">
          現在の株式等の所有状況
        </div>
        <table className="gov-table text-[9px]">
          <tbody>
            <tr>
              <td className="gov-header text-left" style={{ width: '50%' }}>
                <CircledNumber n={1} /> 納税義務者の属する同族関係者グループの議決権の合計数
              </td>
              <td>
                <NumberField value={g('cur_group_votes')} onChange={(v) => u('cur_group_votes', v)} unit="個" />
              </td>
            </tr>
            <tr>
              <td className="gov-header text-left">
                <CircledNumber n={4} /> 評価会社の発行済株式又は議決権の総数
              </td>
              <td>
                <NumberField value={g('cur_total_votes')} onChange={(v) => u('cur_total_votes', v)} unit="個" />
              </td>
            </tr>
            <tr>
              <td className="gov-header text-left">
                自己株式
              </td>
              <td>
                <NumberField value={g('treasury_shares')} onChange={(v) => u('treasury_shares', v)} unit="株" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 判定結果 */}
      <div className="gov-section">
        <div className="flex items-center justify-center py-1 text-[9px] gap-4">
          <span className="font-bold">判 定</span>
          <span className="gov-choice" onClick={() => u('result', '原則的評価方式等')}>
            原則的評価方式等
          </span>
          <span>・</span>
          <span className="gov-choice" onClick={() => u('result', '配当還元方式')}>
            配当還元方式
          </span>
        </div>
      </div>
    </div>
  );
}
