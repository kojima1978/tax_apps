import RateTable from "./RateTable";
import { MINIMUM_TAX_RATE, MINIMUM_TAX_START_YEAR, MINIMUM_TAX_THRESHOLD } from "@/lib/minimum-tax";
import { BUILDING_STRUCTURES } from "@/lib/tax-rates";
import { formatYen } from "@/lib/utils";

const MINIMUM_TAX_ROWS = [
    { item: "適用年分", detail: `令和7年分（${MINIMUM_TAX_START_YEAR}年分）以後の所得税` },
    { item: "判定の基準", detail: `基準所得金額が ${formatYen(MINIMUM_TAX_THRESHOLD)} を超える場合` },
    { item: "税率", detail: `3億3,000万円を超える部分に ${MINIMUM_TAX_RATE * 100}%（別途、追加分に復興特別所得税2.1%）` },
    {
        item: "基準所得金額",
        detail: "申告不要制度を適用しないで計算した合計所得金額（特別控除後）。分離課税の譲渡所得や申告不要の配当等も含む。NISA等の非課税所得は含まない",
    },
    {
        item: "基準所得税額",
        detail: "基準所得金額に係る所得税額。復興特別所得税を含まず、外国税額控除等の適用前の金額",
    },
    { item: "住民税", detail: "影響しない（追加課税は所得税のみ）" },
];

/**
 * 居住用財産の特例の要件。チェックボックスの hint は1行しか出せないので、
 * 判定に必要な要件はここに一覧で置く（出典: 国税庁 No.3302 / No.3305）。
 */
const SPECIAL_RULE_REQUIREMENTS = [
    {
        title: "3,000万円の特別控除（措法35条）",
        items: [
            "自分が住んでいる家屋、またはその家屋とともにその敷地を売ること。住まなくなった家屋は、住まなくなった日から3年を経過する日の属する年の12月31日までに売ること",
            "家屋を取り壊した場合は、取壊しから1年以内に敷地の譲渡契約を締結し、かつ上記の期限内に売ること。取壊し後に貸駐車場などに使っていないこと",
            "売った年の前年・前々年にこの特例（またはマイホームの譲渡損失の特例）を受けていないこと",
            "売った年、その前年・前々年にマイホームの買換え・交換の特例を受けていないこと",
            "収用等の特別控除など、他の特例の適用を受けていないこと",
            "親子・夫婦・生計を一にする親族など、特別の関係がある人への譲渡でないこと",
            "特例の適用だけを目的に入居した家屋、新築中の仮住まい、別荘等は対象外",
        ],
    },
    {
        title: "軽減税率の特例（措法31条の3）",
        items: [
            "国内にあるマイホームであること（対象となる資産の範囲は3,000万円控除と同じ）",
            "売った年の1月1日時点で、家屋と敷地の所有期間がともに10年を超えていること",
            "売った年の前年・前々年にこの特例を受けていないこと",
            "マイホームの買換え特例など、他の特例を受けていないこと",
            "親子・夫婦など、特別の関係がある人への譲渡でないこと",
            "3,000万円の特別控除とは重ねて受けられる（控除後の金額に軽減税率を適用）",
        ],
    },
];

const ReferenceTables = () => (
    <section className="ref-tables">
        <h2>参考資料</h2>

        <div className="ref-block">
            <h3>税率一覧</h3>
            <RateTable />
        </div>

        <div className="ref-block">
            <h3>居住用財産の特例の主な要件</h3>
            {SPECIAL_RULE_REQUIREMENTS.map((rule) => (
                <div key={rule.title} className="requirement-group">
                    <h4>{rule.title}</h4>
                    <ul className="requirement-list">
                        {rule.items.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
            ))}
            <p className="ref-note">
                いずれも主な要件のみ。実際の適用可否は国税庁タックスアンサー No.3302・No.3305 等で確認してください。
            </p>
        </div>

        <div className="ref-block">
            <h3>非事業用建物の償却率（旧定額法・耐用年数の1.5倍）</h3>
            <div className="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">構造</th>
                            <th scope="col">法定耐用年数</th>
                            <th scope="col">非事業用の耐用年数</th>
                            <th scope="col">償却率</th>
                        </tr>
                    </thead>
                    <tbody>
                        {BUILDING_STRUCTURES.map((s) => (
                            <tr key={s.key}>
                                <th scope="row">{s.label}</th>
                                <td className="value-cell">{s.statutoryYears}年</td>
                                <td className="value-cell">{s.nonBusinessYears}年</td>
                                <td className="value-cell">{s.rate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="ref-note">
                償却費相当額 ＝ 建物の取得価額 × 0.9 × 償却率 × 経過年数（取得価額の95%が上限）
            </p>
        </div>

        <div className="ref-block">
            <h3>ミニマムタックス（極めて高い水準の所得に対する課税）</h3>
            <div className="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">項目</th>
                            <th scope="col">内容</th>
                        </tr>
                    </thead>
                    <tbody>
                        {MINIMUM_TAX_ROWS.map((row) => (
                            <tr key={row.item}>
                                <th scope="row">{row.item}</th>
                                <td>{row.detail}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="ref-note">
                追加納付額 ＝ （基準所得金額 − 3億3,000万円）× {MINIMUM_TAX_RATE * 100}% − 基準所得税額（プラスの場合）
            </p>
        </div>
    </section>
);

export default ReferenceTables;
