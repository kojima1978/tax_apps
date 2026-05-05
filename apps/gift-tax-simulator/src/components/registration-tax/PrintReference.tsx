const LAND_RATES = [
    { type: '売買', rate: '1,000分の20（2%）', note: '※R8.3.31まで軽減1,000分の15（期限切れ）' },
    { type: '相続・法人合併・共有物分割', rate: '1,000分の4（0.4%）', note: '－' },
    { type: 'その他（贈与・交換・収用等）', rate: '1,000分の20（2%）', note: '－' },
];

const BUILDING_RATES = [
    { type: '所有権の保存', rate: '1,000分の4（0.4%）', note: '住宅用は下表参照' },
    { type: '売買・競売による移転', rate: '1,000分の20（2%）', note: '住宅用は下表参照' },
    { type: '相続・法人合併による移転', rate: '1,000分の4（0.4%）', note: '－' },
    { type: 'その他（贈与・交換等）', rate: '1,000分の20（2%）', note: '－' },
];

const HOUSING_RATES = [
    { no: '①', type: '所有権の保存登記', content: '新築または建築後未使用・自己居住・R9.3.31まで', rate: '1,000分の1.5（0.15%）', law: '措法72の2' },
    { no: '②', type: '所有権の移転登記（売買・競落）', content: '住宅用家屋・自己居住・R9.3.31まで', rate: '1,000分の3（0.3%）', law: '措法73' },
    { no: '③', type: '特定認定長期優良住宅', content: '保存または移転登記・自己居住・R9.3.31まで（一戸建て移転は1,000分の2）', rate: '1,000分の1（0.1%）', law: '措法74' },
    { no: '④', type: '認定低炭素住宅', content: '保存または移転登記・自己居住・R9.3.31まで', rate: '1,000分の1（0.1%）', law: '措法74の2' },
    { no: '⑤', type: '特定の増改築等がされた住宅', content: '宅建業者による増改築・移転登記・自己居住・R9.3.31まで', rate: '1,000分の1（0.1%）', law: '措法74の3' },
    { no: '⑥', type: '住宅取得資金の抵当権設定', content: '住宅新築・取得資金の貸付に係る抵当権設定・R9.3.31まで', rate: '1,000分の1（0.1%）', law: '措法75' },
];

const PrintReference = () => (
    <div className="print-reference">

        {/* 表(1) 土地 */}
        <section className="print-ref-section">
            <h2 className="print-ref-h2">
                No.7191 登録免許税の税額表（国税庁）— （1）土地の所有権の移転登記
            </h2>
            <p className="print-ref-note">課税標準：固定資産課税台帳に登録された価格（1,000円未満切捨）。税額は100円未満切捨（最低1,000円）。</p>
            <table className="print-ref-table" style={{ marginTop: '0.3rem' }}>
                <thead>
                    <tr>
                        <th style={{ width: '30%' }}>内容</th>
                        <th style={{ width: '35%' }}>税率</th>
                        <th>備考</th>
                    </tr>
                </thead>
                <tbody>
                    {LAND_RATES.map(({ type, rate, note }) => (
                        <tr key={type}>
                            <td>{type}</td>
                            <td className="print-ref-td-right">{rate}</td>
                            <td className="print-ref-note">{note}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="print-ref-note" style={{ marginTop: '0.2rem' }}>
                ※相続による土地の所有権移転登記等の免税措置（R9.3.31まで）：①死亡した登記名義人への登記、②課税標準100万円以下の土地
            </p>
        </section>

        {/* 表(2) 建物 */}
        <section className="print-ref-section">
            <h2 className="print-ref-h2">（2）建物の登記</h2>
            <table className="print-ref-table">
                <thead>
                    <tr>
                        <th style={{ width: '40%' }}>内容</th>
                        <th style={{ width: '30%' }}>税率</th>
                        <th>備考</th>
                    </tr>
                </thead>
                <tbody>
                    {BUILDING_RATES.map(({ type, rate, note }) => (
                        <tr key={type}>
                            <td>{type}</td>
                            <td className="print-ref-td-right">{rate}</td>
                            <td className="print-ref-note">{note}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>

        {/* 表(3) 住宅用家屋の軽減税率 */}
        <section className="print-ref-section">
            <h2 className="print-ref-h2">（3）住宅用家屋の軽減税率（措法72の2〜75）</h2>
            <p className="print-ref-note">適用要件：床面積50㎡以上、新築または取得後1年以内の登記、登記申請時に市区町村の証明書添付が必要。</p>
            <table className="print-ref-table" style={{ marginTop: '0.3rem' }}>
                <thead>
                    <tr>
                        <th style={{ width: '5%' }}></th>
                        <th style={{ width: '25%' }}>登記の種類</th>
                        <th style={{ width: '40%' }}>主な要件</th>
                        <th style={{ width: '20%' }}>軽減税率</th>
                        <th style={{ width: '10%' }}>根拠法</th>
                    </tr>
                </thead>
                <tbody>
                    {HOUSING_RATES.map(({ no, type, content, rate, law }) => (
                        <tr key={no}>
                            <td style={{ textAlign: 'center' }}>{no}</td>
                            <td>{type}</td>
                            <td className="print-ref-note">{content}</td>
                            <td className="print-ref-td-right">{rate}</td>
                            <td className="print-ref-note">{law}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="print-ref-note" style={{ marginTop: '0.2rem' }}>
                ※「住宅用家屋証明書」（市区町村発行）の添付が要件。登記後の提出では軽減適用不可。
            </p>
        </section>

        {/* 端数処理 */}
        <section className="print-ref-section">
            <h2 className="print-ref-h2">端数処理（登録免許税法第14条）</h2>
            <div className="print-ref-two-col">
                <div>
                    <p><strong>課税標準（不動産の価額）</strong></p>
                    <p>1,000円未満の端数を切り捨て</p>
                </div>
                <div>
                    <p><strong>税額</strong></p>
                    <p>100円未満の端数を切り捨て（最低1,000円）</p>
                </div>
            </div>
        </section>

        <p className="print-ref-src">出典: https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7191.htm（令和7年4月1日現在法令等）</p>
    </div>
);

export default PrintReference;
