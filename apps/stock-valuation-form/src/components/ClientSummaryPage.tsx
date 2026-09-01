import { calcClientSummary } from '@/lib/clientSummary';
import { calcValuationReport, type ShareholderValuationRow, type ValuationBasis, type ValuationBasisKey } from '@/lib/valuationReport';
import type { TableProps } from '@/types/form';

type Props = Pick<TableProps, 'getField' | 'updateField'> & {
  onBack: () => void;
  onPrint: () => void;
};

function Icon({ name }: { name: 'print' }) {
  const paths = {
    print: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}


const yenOrDash = (value: number | null) => value === null ? '－' : `${value.toLocaleString('ja-JP')}円`;

// 会社規模と、その規模で用いる類似業種比準価額の割合（小会社0.50・中会社L・大会社1.00）
const SIZE_SCALE = [
  { size: 0, name: '小会社', rate: 0.5 },
  { size: 1, name: '中会社', rate: 0.6 },
  { size: 2, name: '中会社', rate: 0.75 },
  { size: 3, name: '中会社', rate: 0.9 },
  { size: 4, name: '大会社', rate: 1 },
] as const;

// 株価一覧の行。ベースの違いは行のラベル側に持たせ、表は「項目｜金額」の2列で並べる。
const PRICE_ROWS: {
  key: string;
  label: string;
  note: string;
  emphasis?: boolean;
  basis: ValuationBasisKey;
  cell: (basis: ValuationBasis) => { text: string; sub?: string };
}[] = [
  {
    key: 'comparable',
    label: '類似業種比準価額',
    note: '第4表の修正後の算定値を優先（両ベース共通）',
    basis: 'inheritance',
    cell: (b) => ({ text: yenOrDash(b.comparablePrice) }),
  },
  {
    key: 'netAssetDeducted',
    label: '1株当たり純資産価額（38％控除あり）',
    note: '第5表⑪（評価差額に対する法人税額等相当額を控除）',
    basis: 'inheritance',
    cell: (b) => ({ text: yenOrDash(b.netAssetPrice) }),
  },
  {
    key: 'netAssetGross',
    label: '1株当たり純資産価額（38％控除なし）',
    note: '第5表⑪（評価差額に対する法人税額等相当額を控除なし）',
    basis: 'special-market-value',
    cell: (b) => ({ text: yenOrDash(b.netAssetPrice) }),
  },
  {
    key: 'companySize',
    label: '会社の規模',
    note: '小会社 0.50／中会社 0.60・0.75・0.90／大会社 1.00',
    basis: 'inheritance',
    cell: (b) => {
      const size = SIZE_SCALE.find((s) => s.size === b.size);
      return { text: size ? `${size.name}　${size.rate.toFixed(2)}` : '－' };
    },
  },
  {
    key: 'gensokuInheritance',
    label: '原則的評価額（相続税評価額ベース）',
    note: '会社規模に応じた第3表の最終価額',
    emphasis: true,
    basis: 'inheritance',
    cell: (b) => ({ text: yenOrDash(b.gensoku) }),
  },
  {
    key: 'gensokuSpecial',
    label: '原則的評価額（所得税・法人税ベース）',
    note: '所基通59－6：小会社として評価し、法人税額等相当額を控除しない',
    emphasis: true,
    basis: 'special-market-value',
    cell: (b) => ({ text: yenOrDash(b.gensoku) }),
  },
  {
    key: 'haito',
    label: '配当還元方式',
    note: '原則的評価額を上回る場合は原則的評価額',
    basis: 'inheritance',
    cell: (b) => ({ text: yenOrDash(b.haitoKangen) }),
  },
];

function ShareholderRow({ row, bases }: { row: ShareholderValuationRow; bases: ValuationBasis[] }) {
  return (
    <tr>
      <th scope="row">
        {row.name || `株主${row.row}`}
        {row.relation && <small>{row.relation}</small>}
      </th>
      <td className="summary-holders-num">{row.shares === null ? '－' : row.shares.toLocaleString('ja-JP')}</td>
      <td className="summary-holders-num">{row.votingRatio === null ? '－' : `${row.votingRatio}%`}</td>
      <td>
        <span className={`summary-holders-method summary-holders-method-${row.method}`}>{row.methodLabel}</span>
        {row.pendingReason && <small>{row.pendingReason}</small>}
      </td>
      {bases.map((basis) => {
        const amount = row.amounts.find((a) => a.basis === basis.key);
        return (
          <td className="summary-holders-num" key={basis.key}>
            {row.method === 'unknown' ? (
              <>
                <span>原則 {yenOrDash(amount?.gensokuTotal ?? null)}</span>
                <small>配当還元 {yenOrDash(amount?.haitoTotal ?? null)}</small>
              </>
            ) : (
              yenOrDash(row.method === 'haito' ? amount?.haitoTotal ?? null : amount?.gensokuTotal ?? null)
            )}
          </td>
        );
      })}
    </tr>
  );
}

export function ClientSummaryPage({ getField, updateField, onBack, onPrint }: Props) {
  const summary = calcClientSummary(getField);
  const report = calcValuationReport(getField);
  const note = getField('table1_1', '_summary_advisor_note');
  const availableSensitivity = summary.sensitivity.items.filter((item) => item.value !== null);

  return (
    <div className="client-summary-wrap">
      <div className="client-summary-actions no-print">
        <button type="button" onClick={onBack} className="summary-back-button">帳票入力へ戻る</button>
        <button type="button" onClick={onPrint} className="summary-print-button"><Icon name="print" />このサマリーを印刷</button>
      </div>

      <article className="client-summary-page" aria-labelledby="client-summary-title">
        <header className="summary-hero">
          <div className="summary-kicker">STOCK VALUATION REPORT</div>
          <div className="summary-hero-main">
            <div>
              <p className="summary-eyebrow">非上場株式評価｜お客様向けサマリー</p>
              <h1 id="client-summary-title">{summary.companyName}<span>御中</span></h1>
              <p className="summary-lead">入力いただいた情報をもとに、現在の評価上の特徴と今後検討したい打ち手を整理しました。</p>
            </div>
            <div className="summary-date-block">
              <span>評価基準日</span><strong>{summary.valuationDate}</strong>
              <span>代表者</span><strong>{summary.representative}</strong>
            </div>
          </div>
          <div className="summary-meta"><span>{summary.purposeLabel}</span><span>{summary.sizeLabel}</span><span>{summary.classificationLabel}</span></div>
        </header>

        <section className="summary-prices" aria-labelledby="summary-prices-title">
          <div className="summary-sensitivity-heading">
            <div>
              <small>SHARE PRICE BY BASIS</small>
              <h2 id="summary-prices-title">株価一覧｜相続税評価額ベースと所得税・法人税ベース</h2>
            </div>
            <span>1株当たり</span>
          </div>
          <div className="summary-table-scroll">
            <table className="summary-table">
              <thead>
                <tr>
                  <th scope="col">評価方式</th>
                  <th scope="col">金額</th>
                </tr>
              </thead>
              <tbody>
                {PRICE_ROWS.map((priceRow) => {
                  const basis = report.bases.find((b) => b.key === priceRow.basis);
                  const { text, sub } = basis ? priceRow.cell(basis) : { text: '－', sub: undefined };
                  return (
                    <tr key={priceRow.key} className={priceRow.emphasis ? 'summary-table-emphasis' : undefined}>
                      <th scope="row">{priceRow.label}<small>{priceRow.note}</small></th>
                      <td className="summary-holders-num">{text}{sub && <small>{sub}</small>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="summary-sensitivity-disclaimer">
            所得税・法人税ベースは、所基通59－6／法基通9－1－14による時価です。中心的な同族株主に該当するものとして小会社の評価方法（同(2)）を適用し、
            評価差額に対する法人税額等相当額を控除していません（同(4)）。中心的な同族株主に該当しない場合は相続税評価額ベースの金額になります。
          </p>
        </section>

        <section className="summary-holders" aria-labelledby="summary-holders-title">
          <div className="summary-sensitivity-heading">
            <div>
              <small>VALUATION BY SHAREHOLDER</small>
              <h2 id="summary-holders-title">株主ごとの評価</h2>
            </div>
            <span>株式数×1株当たりの価額</span>
          </div>
          {report.shareholders.length ? (
            <div className="summary-table-scroll">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th scope="col">株主</th>
                    <th scope="col">株式数</th>
                    <th scope="col">議決権割合</th>
                    <th scope="col">評価方式</th>
                    {report.bases.map((basis) => <th scope="col" key={basis.key}>{basis.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {report.shareholders.map((row) => <ShareholderRow key={row.row} row={row} bases={report.bases} />)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="summary-sensitivity-empty" role="note">第1表の1に株主を入力すると表示されます。</div>
          )}
          <p className="summary-sensitivity-disclaimer">
            各行の株主を納税義務者とみなして株主判定をやり直した結果です。議決権割合5％未満の株主は、役員該当性や中心的な同族株主の有無により方式が変わるため「要確認」として両方の金額を表示しています。
          </p>
        </section>

        <section className="summary-sensitivity" aria-labelledby="summary-sensitivity-title">
          <div className="summary-sensitivity-heading">
            <h2 id="summary-sensitivity-title">類似業種比準要素｜1円当たりの影響度</h2>
            <span>{summary.sensitivity.adoptedBlock}を基準</span>
          </div>
          {availableSensitivity.length ? (
            <div className="summary-table-scroll">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th scope="col">比準要素</th>
                    <th scope="col">1円増加あたりの影響</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.sensitivity.items.map((item) => (
                    <tr key={item.key}>
                      <th scope="row">{item.label}</th>
                      <td className="summary-holders-num">
                        {item.excluded ? '評価対象外' : item.value === null ? '算定不可' : `+${item.value.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}円`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="summary-sensitivity-empty" role="note">類似業種株価、斟酌率、1株当たり資本金等の額、または比準要素の基準値を入力すると表示されます。</div>
          )}
          <p className="summary-sensitivity-disclaimer">各要素が1円増加したときの、1株当たりの類似業種比準価額への概算影響です（端数処理・最低価額判定を固定した線形近似）。</p>
        </section>

        <section className="summary-advisor-note" aria-labelledby="summary-note-title">
          <div><small>ADVISOR'S NOTE</small><h2 id="summary-note-title">担当者コメント</h2></div>
          <textarea
            aria-label="担当者コメント"
            value={note}
            onChange={(event) => updateField('table1_1', '_summary_advisor_note', event.target.value)}
            placeholder="お客様への補足説明、次回までの確認事項などを入力してください。"
          />
        </section>

        <footer className="summary-footer">
          <p>本資料は入力情報に基づく概算・検討用資料です。実行に際しては、最新の法令・通達および個別事情を確認してください。</p>
          <span>{summary.companyName}｜株式評価サマリー</span>
        </footer>
      </article>
    </div>
  );
}
