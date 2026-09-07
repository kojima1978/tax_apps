import { calcClientSummary } from '@/lib/clientSummary';
import { calcNextYearForecast, type ElementForecast } from '@/lib/nextYearForecast';
import {
  ACTION_FIELD, ACTION_FILTERS, BASIS_FIELD, BASIS_FILTERS, FORECAST_DETAIL_FIELD, SUMMARY_SECTIONS, ZERO_PROFIT_FIELD,
  changedOptionCount, filterActions, filterBases, isRowVisible, readSummaryOptions, resetSummaryOptionFields,
  sectionField, toStoredFlag, type RowScope,
} from '@/lib/summaryOptions';
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

// 打ち手の優先度バッジ（クラス名はASCIIに寄せる）
const PRIORITY_CLASS: Record<'高' | '中' | '低', string> = { 高: 'high', 中: 'mid', 低: 'low' };

// 来期の見通し：現在との差。株価が上がる（＝不利になる）方向を赤で示す
function DiffCell({ diff, rate }: { diff: number | null; rate: number | null }) {
  if (diff === null) return <>－</>;
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '±';
  const tone = diff > 0 ? 'summary-forecast-diff-up' : diff < 0 ? 'summary-forecast-diff-down' : undefined;
  return (
    <>
      <span className={tone}>{sign}{Math.abs(diff).toLocaleString('ja-JP')}円</span>
      {rate !== null && <small>{sign}{Math.abs(rate).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}%</small>}
    </>
  );
}

const elementValueOf = (element: ElementForecast) => element.excluded
  ? '評価対象外'
  : element.current === null ? '－' : `${element.current.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}円`;

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
  /** 金額を読み取るベース */
  basis: ValuationBasisKey;
  /** 出力条件でどの評価ベースに絞られたときに残す行か（common は両ベース共通の情報） */
  scope: RowScope;
  /** 「利益0の場合」を出さない設定のときに落とす行 */
  zeroProfit?: boolean;
  cell: (basis: ValuationBasis) => { text: string; sub?: string };
}[] = [
  {
    key: 'comparable',
    label: '類似業種比準価額',
    note: '第4表の修正後の算定値を優先（両ベース共通）',
    basis: 'inheritance',
    scope: 'common',
    cell: (b) => ({ text: yenOrDash(b.comparablePrice) }),
  },
  {
    key: 'comparableZeroProfit',
    label: '類似業種比準価額（利益0の場合）',
    note: '第4表の年利益金額をゼロとして再計算（Ⓒ＝0）',
    basis: 'inheritance',
    scope: 'common',
    zeroProfit: true,
    cell: (b) => ({ text: yenOrDash(b.comparablePriceZeroProfit) }),
  },
  {
    key: 'netAssetDeducted',
    label: '1株当たり純資産価額（38％控除あり）',
    note: '第5表⑪（評価差額に対する法人税額等相当額を控除）',
    basis: 'inheritance',
    scope: 'inheritance',
    cell: (b) => ({ text: yenOrDash(b.netAssetPrice) }),
  },
  {
    key: 'netAssetGross',
    label: '1株当たり純資産価額（38％控除なし）',
    note: '第5表⑪（評価差額に対する法人税額等相当額を控除なし）',
    basis: 'special-market-value',
    scope: 'special-market-value',
    cell: (b) => ({ text: yenOrDash(b.netAssetPrice) }),
  },
  {
    key: 'companySize',
    label: '会社の規模',
    note: '小会社 0.50／中会社 0.60・0.75・0.90／大会社 1.00',
    basis: 'inheritance',
    scope: 'common',
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
    scope: 'inheritance',
    cell: (b) => ({ text: yenOrDash(b.gensoku) }),
  },
  {
    key: 'gensokuInheritanceZeroProfit',
    label: '原則的評価額（相続税評価額ベース・利益0の場合）',
    note: '第4表の年利益金額をゼロとして再計算した場合の第3表の最終価額',
    emphasis: true,
    basis: 'inheritance',
    scope: 'inheritance',
    zeroProfit: true,
    cell: (b) => ({ text: yenOrDash(b.gensokuZeroProfit) }),
  },
  {
    key: 'gensokuSpecial',
    label: '原則的評価額（所得税・法人税ベース）',
    note: '所基通59－6／法基通9－1－14：小会社として評価し、法人税額等相当額を控除しない',
    emphasis: true,
    basis: 'special-market-value',
    scope: 'special-market-value',
    cell: (b) => ({ text: yenOrDash(b.gensoku) }),
  },
  {
    key: 'haito',
    label: '配当還元方式',
    note: '原則的評価額を上回る場合は原則的評価額',
    basis: 'inheritance',
    scope: 'inheritance',
    cell: (b) => ({ text: yenOrDash(b.haitoKangen) }),
  },
];

// 株主ごとの評価の金額列。相続税評価額ベースだけは「利益0の場合」を隣に並べる。
type HolderColumn = { key: string; label: string; basis: ValuationBasisKey; zeroProfit?: boolean };

function holderColumnsOf(bases: ValuationBasis[], showZeroProfit: boolean): HolderColumn[] {
  return bases.flatMap((basis): HolderColumn[] => (
    basis.key === 'inheritance' && showZeroProfit
      ? [
          { key: basis.key, label: basis.label, basis: basis.key },
          { key: `${basis.key}-zero`, label: `${basis.label}（利益0の場合）`, basis: basis.key, zeroProfit: true },
        ]
      : [{ key: basis.key, label: basis.label, basis: basis.key }]
  ));
}

function ShareholderRow({ row, columns }: { row: ShareholderValuationRow; columns: HolderColumn[] }) {
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
      {columns.map((column) => {
        const amount = row.amounts.find((a) => a.basis === column.basis);
        // 配当還元方式は年利益金額の影響を受けないため、利益0の列でも同じ金額になる。
        const gensokuTotal = (column.zeroProfit ? amount?.gensokuZeroProfitTotal : amount?.gensokuTotal) ?? null;
        return (
          <td className="summary-holders-num" key={column.key}>
            {row.method === 'unknown' ? (
              <>
                <span>原則 {yenOrDash(gensokuTotal)}</span>
                <small>配当還元 {yenOrDash(amount?.haitoTotal ?? null)}</small>
              </>
            ) : (
              yenOrDash(row.method === 'haito' ? amount?.haitoTotal ?? null : gensokuTotal)
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
  const forecast = calcNextYearForecast(getField);
  const note = getField('table1_1', '_summary_advisor_note');
  const options = readSummaryOptions(getField);
  const setOption = (field: string, value: string) => updateField('table1_1', field, value);
  const bases = filterBases(report.bases, options.basis);
  const holderColumns = holderColumnsOf(bases, options.showZeroProfit);
  const priceRows = PRICE_ROWS.filter((row) => isRowVisible(row, options));
  const actions = filterActions(summary.actions, options.actionFilter);
  const availableSensitivity = summary.sensitivity.items.filter((item) => item.value !== null);
  const changedCount = changedOptionCount(options);

  return (
    <div className="client-summary-wrap">
      <div className="client-summary-actions no-print">
        <button type="button" onClick={onBack} className="summary-back-button">帳票入力へ戻る</button>
        <button type="button" onClick={onPrint} className="summary-print-button"><Icon name="print" />このサマリーを印刷</button>
      </div>

      {/* 出力条件。設定は案件データ（第1表の1）に保存されるので、保存/読込・翌年度更新にも引き継がれる */}
      <details className="summary-options no-print">
        <summary>
          出力する内容を選ぶ
          {changedCount > 0 && <span className="summary-options-badge">{changedCount}件を既定から変更</span>}
        </summary>
        <div className="summary-options-body">
          <fieldset>
            <legend>表示するセクション</legend>
            <div className="summary-options-grid">
              {SUMMARY_SECTIONS.map((section) => (
                <label key={section.key}>
                  <input
                    type="checkbox"
                    checked={options.sections[section.key]}
                    onChange={(event) => setOption(sectionField(section.key), toStoredFlag(event.target.checked))}
                  />
                  <span>{section.label}<small>{section.hint}</small></span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>評価ベース</legend>
            <div className="summary-options-grid">
              {BASIS_FILTERS.map((filter) => (
                <label key={filter.value}>
                  <input
                    type="radio"
                    name="summary-basis"
                    checked={options.basis === filter.value}
                    onChange={() => setOption(BASIS_FIELD, filter.value)}
                  />
                  <span>{filter.label}</span>
                </label>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={options.showZeroProfit}
                  onChange={(event) => setOption(ZERO_PROFIT_FIELD, toStoredFlag(event.target.checked))}
                />
                <span>「利益0の場合」を併記<small>株価一覧の行と株主ごとの列</small></span>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>次の一手・来期の見通し</legend>
            <div className="summary-options-grid">
              {ACTION_FILTERS.map((filter) => (
                <label key={filter.value}>
                  <input
                    type="radio"
                    name="summary-action-filter"
                    checked={options.actionFilter === filter.value}
                    onChange={() => setOption(ACTION_FIELD, filter.value)}
                  />
                  <span>次の一手：{filter.label}</span>
                </label>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={options.showForecastDetail}
                  onChange={(event) => setOption(FORECAST_DETAIL_FIELD, toStoredFlag(event.target.checked))}
                />
                <span>回避するために必要な水準<small>来期の見通しの明細表</small></span>
              </label>
            </div>
          </fieldset>

          <div className="summary-options-foot">
            <button
              type="button"
              onClick={() => resetSummaryOptionFields().forEach(({ field, value }) => setOption(field, value))}
              disabled={changedCount === 0}
            >
              すべて表示に戻す
            </button>
            <small>設定は案件データに保存され、印刷にも反映されます（この欄自体は印刷されません）。</small>
          </div>
        </div>
      </details>

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

        {options.sections.prices && (
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
                  <th scope="col" className="summary-holders-num">金額</th>
                </tr>
              </thead>
              <tbody>
                {priceRows.map((priceRow) => {
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
          {options.basis !== 'inheritance' && (
            <p className="summary-sensitivity-disclaimer">
              所得税・法人税ベースは、所基通59－6／法基通9－1－14による時価です。中心的な同族株主に該当するものとして小会社の評価方法（同(2)）を適用し、
              評価差額に対する法人税額等相当額を控除していません（同(4)）。中心的な同族株主に該当しない場合は相続税評価額ベースの金額になります。
            </p>
          )}
        </section>
        )}

        {options.sections.holders && (
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
                    <th scope="col" className="summary-holders-num">株式数</th>
                    <th scope="col" className="summary-holders-num">議決権割合</th>
                    <th scope="col">評価方式</th>
                    {holderColumns.map((column) => <th scope="col" className="summary-holders-num" key={column.key}>{column.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {report.shareholders.map((row) => <ShareholderRow key={row.row} row={row} columns={holderColumns} />)}
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
        )}

        {options.sections.sensitivity && (
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
                    <th scope="col" className="summary-holders-num">1円増加あたりの影響</th>
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
        )}

        {options.sections.forecast && (
        <section className="summary-forecast" aria-labelledby="summary-forecast-title">
          <div className="summary-sensitivity-heading">
            <div>
              <small>NEXT YEAR OUTLOOK</small>
              <h2 id="summary-forecast-title">来期の見通し｜比準要素数1・比準要素数0への該当リスク</h2>
            </div>
            <span>現在の判定：{forecast.currentResultLabel}</span>
          </div>
          {!forecast.known ? (
            <div className="summary-sensitivity-empty" role="note">第4表の①資本金等の額と比準要素（Ⓑ・Ⓒ・Ⓓ）を入力すると表示されます。</div>
          ) : (
            <>
              <p className="summary-forecast-lead">
                今期の判定要素（⑴）は、来期には「直前々期末を基準とした判定要素（⑵）」へそのまま繰り上がります。
                {forecast.zeroLabels.length
                  ? <>現在ゼロの要素は <span className="summary-forecast-zero">{forecast.zeroLabels.join('、')}</span> の{forecast.zerosNow}個です。</>
                  : '現在ゼロの要素はありません。'}
                {forecast.carryOverMet
                  ? `来期の⑵側の条件は既に成立が確定しているため、来期の⑴でゼロが${forecast.zerosNeededFor1}個になった時点で比準要素数1の会社に該当します。`
                  : `来期の⑵側の条件（ゼロが${forecast.zerosNeededFor1}個以上）を満たさないため、来期に比準要素数1の会社となることはありません。`}
              </p>
              <div className="summary-table-scroll">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th scope="col">来期のシナリオ</th>
                      <th scope="col">評価区分</th>
                      <th scope="col" className="summary-holders-num">1株当たりの価額</th>
                      <th scope="col" className="summary-holders-num">現在との差</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="summary-table-emphasis">
                      <th scope="row">現在の判定<small>今期の課税時期</small></th>
                      <td>{forecast.currentResultLabel}</td>
                      <td className="summary-holders-num">{yenOrDash(forecast.currentPrice)}</td>
                      <td className="summary-holders-num">－</td>
                    </tr>
                    {forecast.scenarios.map((scenario) => (
                      <tr key={scenario.key} className={scenario.possible ? undefined : 'summary-forecast-off'}>
                        <th scope="row">{scenario.label}<small>来期の⑴でゼロが{scenario.zerosNeeded}個になった場合</small></th>
                        <td>
                          {scenario.possible ? scenario.resultLabel : '該当しません'}
                          {scenario.impossibleReason && <small>{scenario.impossibleReason}</small>}
                          {scenario.possible && scenario.noEffect && <small>現在と同じ評価区分のため、株価の算定方法は変わりません。</small>}
                        </td>
                        <td className="summary-holders-num">{scenario.possible ? yenOrDash(scenario.price) : '－'}</td>
                        <td className="summary-holders-num">
                          {scenario.possible ? <DiffCell diff={scenario.diff} rate={scenario.diffRate} /> : '－'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {options.showForecastDetail && (<>
              <h3 className="summary-forecast-subhead">回避するために必要な水準（来期の判定要素）</h3>
              <div className="summary-table-scroll">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th scope="col">判定要素</th>
                      <th scope="col" className="summary-holders-num">今期の⑴</th>
                      <th scope="col">来期にゼロにしないための条件</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.elements.map((element) => (
                      <tr key={element.key}>
                        <th scope="row">{element.label}</th>
                        <td className="summary-holders-num">
                          {elementValueOf(element)}
                          {element.isZeroNow === true && <small>ゼロ</small>}
                        </td>
                        <td className="summary-forecast-note">{element.requiredNote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>)}
              <p className="summary-sensitivity-disclaimer">
                「来期」は次の決算を経過した後の課税時期を指します。金額はいずれも現在の入力値をそのまま用いた試算で、第3表・第6表の修正欄、資本金等の額の変動、来期の類似業種の株価改定は反映していません。
                配当・利益の水準を調整する場合は、事業実態と整合していることが前提です。
              </p>
            </>
          )}
        </section>
        )}

        {options.sections.actions && (
        <section className="summary-actions" aria-labelledby="summary-actions-title">
          <div className="summary-sensitivity-heading">
            <div>
              <small>NEXT ACTIONS</small>
              <h2 id="summary-actions-title">次の一手</h2>
            </div>
            <span>{actions.length}件</span>
          </div>
          {actions.length ? (
            <ol className="summary-action-list">
              {actions.map((action) => (
                <li key={action.title} className={`summary-action-${PRIORITY_CLASS[action.priority]}`}>
                  <span className="summary-action-priority">優先度{action.priority}</span>
                  <div><strong>{action.title}</strong><p>{action.description}</p></div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="summary-sensitivity-empty" role="note">選択した優先度に該当する打ち手はありません。</div>
          )}
        </section>
        )}

        {options.sections.note && (
        <section className="summary-advisor-note" aria-labelledby="summary-note-title">
          <div><small>ADVISOR'S NOTE</small><h2 id="summary-note-title">担当者コメント</h2></div>
          <textarea
            aria-label="担当者コメント"
            value={note}
            onChange={(event) => updateField('table1_1', '_summary_advisor_note', event.target.value)}
            placeholder="お客様への補足説明、次回までの確認事項などを入力してください。"
          />
        </section>
        )}

        <footer className="summary-footer">
          <p>本資料は入力情報に基づく概算・検討用資料です。実行に際しては、最新の法令・通達および個別事情を確認してください。</p>
          <span>{summary.companyName}｜株式評価サマリー</span>
        </footer>
      </article>
    </div>
  );
}
