import { calcClientSummary, type ActionItem, type SummaryItem } from '@/lib/clientSummary';
import { calcValuationReport, type ShareholderValuationRow, type ValuationBasis } from '@/lib/valuationReport';
import type { TableProps } from '@/types/form';

type Props = Pick<TableProps, 'getField' | 'updateField'> & {
  onBack: () => void;
  onPrint: () => void;
};

function Icon({ name }: { name: 'building' | 'chart' | 'compass' | 'check' | 'alert' | 'arrow' | 'print' }) {
  const paths = {
    building: <><path d="M3 21h18"/><path d="M6 21V4h9v17"/><path d="M15 9h3v12"/><path d="M9 8h2M9 12h2M9 16h2"/></>,
    chart: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-4 3 2 5-7"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4 4-2Z"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    alert: <><path d="M12 3 2.7 20h18.6L12 3Z"/><path d="M12 9v4M12 17h.01"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    print: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const yen = (value: number | null) => value === null ? '未算定' : `${value.toLocaleString('ja-JP')}円`;
const ratio = (value: number | null) => value === null ? '未判定' : `${value}%`;

function CurrentItem({ item }: { item: SummaryItem }) {
  return (
    <li className={`summary-finding summary-finding-${item.tone}`}>
      <span className="summary-finding-icon"><Icon name={item.tone === 'attention' ? 'alert' : 'check'} /></span>
      <div><h3>{item.title}</h3><p>{item.description}</p></div>
    </li>
  );
}

function ActionRow({ item, index }: { item: ActionItem; index: number }) {
  return (
    <li className="summary-action-row">
      <span className={`summary-priority summary-priority-${item.priority}`}>優先度 {item.priority}</span>
      <span className="summary-action-number">{String(index + 1).padStart(2, '0')}</span>
      <div><h3>{item.title}</h3><p>{item.description}</p></div>
      <span className="summary-action-arrow"><Icon name="arrow" /></span>
    </li>
  );
}

const yenOrDash = (value: number | null) => value === null ? '－' : `${value.toLocaleString('ja-JP')}円`;

// 株価一覧の行（行＝価額の種類、列＝評価ベース）
const PRICE_ROWS: {
  key: string;
  label: string;
  note: string;
  emphasis?: boolean;
  cell: (basis: ValuationBasis) => { text: string; sub?: string };
}[] = [
  {
    key: 'comparable',
    label: '類似業種比準価額',
    note: '第4表の修正後の算定値を優先',
    cell: (b) => ({ text: yenOrDash(b.comparablePrice) }),
  },
  {
    key: 'netAsset',
    label: '1株当たり純資産価額',
    note: '第5表⑪',
    cell: (b) => ({
      text: yenOrDash(b.netAssetPrice),
      sub: b.key === 'inheritance' ? '38％控除あり' : '38％控除なし',
    }),
  },
  {
    key: 'lRate',
    label: 'Lの割合',
    note: '中会社のみ（大会社・小会社は適用なし）',
    cell: (b) => ({ text: b.lRate === null ? '－' : b.lRate.toFixed(2), sub: b.sizeLabel }),
  },
  {
    key: 'gensoku',
    label: '原則的評価額',
    note: '会社規模に応じた第3表の最終価額',
    emphasis: true,
    cell: (b) => ({ text: yenOrDash(b.gensoku) }),
  },
  {
    key: 'haito',
    label: '配当還元方式',
    note: '原則的評価額を上回る場合は原則的評価額',
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
  const maxSensitivity = Math.max(0, ...availableSensitivity.map((item) => item.value ?? 0));

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

        <section className="summary-metrics" aria-label="主要指標">
          <div className="summary-metric summary-metric-primary"><span className="summary-metric-icon"><Icon name="chart" /></span><div><small>1株当たり純資産価額</small><strong>{yen(summary.netAssetPrice)}</strong><p>第5表の算定値</p></div></div>
          <div className="summary-metric"><small>類似業種比準価額</small><strong>{yen(summary.comparablePrice)}</strong><p>修正後の算定値を優先</p></div>
          <div className="summary-metric"><small>株式等保有割合</small><strong>{ratio(summary.stockRatio)}</strong><p>総資産に占める割合</p></div>
          <div className="summary-metric"><small>土地等保有割合</small><strong>{ratio(summary.landRatio)}</strong><p>総資産に占める割合</p></div>
        </section>

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
                  {report.bases.map((basis) => (
                    <th scope="col" key={basis.key}>
                      {basis.label}
                      <small>{basis.note}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRICE_ROWS.map((priceRow) => (
                  <tr key={priceRow.key} className={priceRow.emphasis ? 'summary-table-emphasis' : undefined}>
                    <th scope="row">{priceRow.label}<small>{priceRow.note}</small></th>
                    {report.bases.map((basis) => {
                      const { text, sub } = priceRow.cell(basis);
                      return <td className="summary-holders-num" key={basis.key}>{text}{sub && <small>{sub}</small>}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="summary-sensitivity-disclaimer">
            所得税・法人税ベースは、所基通59－6(4)／法基通9－1－14(3)により評価差額に対する法人税額等相当額を控除せずに計算しています。
            {report.specialCentralHolderUnset && '「中心的な同族株主に該当する」を選択すると、小会社としての評価（同(2)）も反映されます。'}
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
            <div>
              <small>SIMILAR INDUSTRY SENSITIVITY</small>
              <h2 id="summary-sensitivity-title">類似業種比準要素｜1円当たりの影響度</h2>
            </div>
            <span>{summary.sensitivity.adoptedBlock}を基準</span>
          </div>
          {availableSensitivity.length ? (
            <div className="summary-sensitivity-content">
              <div className="summary-sensitivity-bars" role="img" aria-label="配当、利益、純資産がそれぞれ1円増加した場合の1株評価額への概算影響">
                {summary.sensitivity.items.map((item) => {
                  const width = item.value !== null && maxSensitivity > 0 ? Math.max(4, (item.value / maxSensitivity) * 100) : 0;
                  return (
                    <div className="summary-sensitivity-row" key={item.key}>
                      <strong>{item.label}</strong>
                      <div className="summary-sensitivity-track">
                        {item.value !== null && <span className={`summary-sensitivity-fill summary-sensitivity-${item.key}`} style={{ width: `${width}%` }} />}
                      </div>
                      <span className="summary-sensitivity-value">
                        {item.excluded ? '評価対象外' : item.value === null ? '算定不可' : `+${item.value.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}円`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="summary-sensitivity-note">
                <strong>見方</strong>
                <p>各要素が1円増加したときの、評価会社1株当たりの類似業種比準価額への影響を示します。棒が長い要素ほど株価が反応しやすい状態です。</p>
              </div>
            </div>
          ) : (
            <div className="summary-sensitivity-empty" role="note">類似業種株価、斟酌率、1株当たり資本金等の額、または比準要素の基準値を入力すると表示されます。</div>
          )}
          <p className="summary-sensitivity-disclaimer">端数処理、複数業種目の最低価額判定、評価方式の選択を固定した線形感応度の概算です。実際の評価額は帳票全体の再計算により確認してください。</p>
        </section>

        <div className="summary-two-columns">
          <section className="summary-section" aria-labelledby="summary-current-title">
            <div className="summary-section-heading"><span><Icon name="building" /></span><div><small>01 / CURRENT STATE</small><h2 id="summary-current-title">現状</h2></div></div>
            <ul className="summary-findings">{summary.current.map((item) => <CurrentItem key={item.title} item={item} />)}</ul>
          </section>

          <section className="summary-section" aria-labelledby="summary-actions-title">
            <div className="summary-section-heading summary-section-heading-green"><span><Icon name="compass" /></span><div><small>02 / NEXT ACTIONS</small><h2 id="summary-actions-title">打ち手</h2></div></div>
            <ol className="summary-action-list">{summary.actions.map((item, index) => <ActionRow key={`${item.title}-${index}`} item={item} index={index} />)}</ol>
          </section>
        </div>

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
