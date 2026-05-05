const DEDUCTION_TABLE = [
    { period: '平成9年4月1日以降', amount: '1,200万円' },
    { period: '平成元年4月1日〜平成9年3月31日', amount: '1,000万円' },
    { period: '昭和60年7月1日〜平成元年3月31日', amount: '450万円' },
    { period: '昭和56年7月1日〜昭和60年6月30日', amount: '420万円' },
    { period: '昭和51年1月1日〜昭和56年6月30日', amount: '350万円' },
    { period: '昭和48年1月1日〜昭和50年12月31日', amount: '230万円' },
    { period: '昭和39年1月1日〜昭和47年12月31日', amount: '150万円' },
    { period: '昭和29年7月1日〜昭和38年12月31日', amount: '100万円' },
];

const PrintReference = () => (
    <div className="print-reference">

        {/* Q14 */}
        <section className="print-ref-section">
            <h2 className="print-ref-h2">
                Q14　住宅用の土地を取得したときの不動産取得税の軽減制度
            </h2>

            <p>住宅用の土地を取得し一定の要件を満たす場合、土地の税額から次のア・イのうち高い方の額が控除されます。</p>

            <h3 className="print-ref-h3">【軽減の計算方法】</h3>
            <div className="print-ref-formula-block">
                <div><strong>ア</strong>　45,000円</div>
                <div><strong>イ</strong>　土地1㎡当たりの価格（宅地は評価額×1/2÷地積）×　住宅の床面積の2倍（1戸200㎡限度）×　住宅の取得持分　×　3%</div>
                <div className="print-ref-note">適用額: ア・イのうち大きい方を土地の税額から減額（税額が減額額未満の場合はその額が限度）</div>
            </div>

            <div className="print-ref-two-col">
                <div>
                    <h3 className="print-ref-h3">【適用要件】（1）新築住宅用の土地</h3>
                    <ul className="print-ref-ul">
                        <li><strong>ア 土地を先に取得した場合：</strong>取得後3年以内に当該土地上に住宅が新築されていること（土地を引き続き所有、または譲渡先が新築）</li>
                        <li><strong>イ 新築住宅を先に取得した場合：</strong>新築後1年以内に敷地取得 または 新築未使用の住宅と敷地を新築後1年以内に同一人が取得</li>
                    </ul>
                    <p className="print-ref-note">※当該住宅がQ12の軽減要件を満たす場合に限る　（地方税法第73条の24第1項）</p>
                </div>
                <div>
                    <h3 className="print-ref-h3">【適用要件】（2）中古住宅用の土地</h3>
                    <ul className="print-ref-ul">
                        <li><strong>ア 土地を先に取得した場合：</strong>取得日から1年以内（同時取得含む）に当該土地上の中古住宅を取得</li>
                        <li><strong>イ 中古住宅を先に取得した場合：</strong>住宅取得後1年以内に敷地取得</li>
                    </ul>
                    <p className="print-ref-note">※当該住宅がQ13の軽減要件を満たす場合に限る　（地方税法第73条の24第2項・第3項）</p>
                </div>
            </div>

            <p className="print-ref-src">出典: https://www.tax.metro.tokyo.lg.jp/shitsumon/real_estate/f#q14</p>
        </section>

        {/* Q13 */}
        <section className="print-ref-section">
            <h2 className="print-ref-h2">
                Q13　居住用の中古住宅を取得したときの不動産取得税の軽減制度
            </h2>

            <div className="print-ref-two-col">
                <div>
                    <h3 className="print-ref-h3">【適用要件】次のア〜ウすべてを満たすこと</h3>
                    <ul className="print-ref-ul">
                        <li><strong>ア 居住要件：</strong>個人が自己の居住用に取得した住宅</li>
                        <li><strong>イ 床面積要件：</strong>令和8年3月31日以前取得: 50㎡以上240㎡以下　／　令和8年4月1日以降取得: 40㎡以上240㎡以下</li>
                        <li>
                            <strong>ウ 耐震基準要件（いずれか）：</strong>
                            <ul className="print-ref-ul">
                                <li>① 昭和57年1月1日以降に新築されたもの</li>
                                <li>② 建築士等による耐震診断で新耐震基準に適合と証明（取得日前2年以内に調査完了）</li>
                            </ul>
                        </li>
                    </ul>
                    <p className="print-ref-note">※昭和29年6月30日以前新築の住宅は要件を満たしても控除なし</p>
                    <p className="print-ref-note">（法第73条の14第3項）</p>

                    <h3 className="print-ref-h3" style={{ marginTop: '0.5rem' }}>【計算式】</h3>
                    <p>（固定資産評価額 − 控除額）× 3% ＝ 税額</p>
                    <p className="print-ref-note">※持分取得の場合は評価額・控除額に持分を乗じた額</p>
                </div>

                <div>
                    <h3 className="print-ref-h3">【控除額テーブル】</h3>
                    <table className="print-ref-table">
                        <thead>
                            <tr>
                                <th>新築された日</th>
                                <th>控除額</th>
                            </tr>
                        </thead>
                        <tbody>
                            {DEDUCTION_TABLE.map(({ period, amount }) => (
                                <tr key={period}>
                                    <td>{period}</td>
                                    <td className="print-ref-td-right">{amount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="print-ref-note" style={{ marginTop: '0.25rem' }}>
                        ※昭和56年12月31日以前新築はウ②の要件も必要<br />
                        ※住宅価格が控除額未満の場合はその額が限度
                    </p>
                </div>
            </div>

            <p className="print-ref-src">出典: https://www.tax.metro.tokyo.lg.jp/shitsumon/real_estate/f#q13</p>
        </section>
    </div>
);

export default PrintReference;
