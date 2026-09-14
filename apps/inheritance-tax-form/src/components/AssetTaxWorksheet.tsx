import { useMemo } from 'react';
import type { AssetTaxPersonSummary, AssetTaxRow, AssetTaxWorksheetData } from '../lib/assetTaxWorksheet';
import { formatCommaInteger } from '../lib/format';

const TITLE = '資産別税負担一覧';
const ASSET_ROWS_PER_PAGE = 19;
const PEOPLE_PER_PAGE = 14;

function yen(value: number): string {
  return formatCommaInteger(String(Math.trunc(value)));
}

function percent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function SheetHead({ page, total }: { page: number; total: number }) {
  return (
    <>
      <div className="worksheet__head">
        <div>
          <span className="asset-tax__kicker">第11表・第13表 補助資料</span>
          <h2 className="worksheet__title">{TITLE}</h2>
        </div>
        <span className="worksheet__page">{page}／{total}</span>
      </div>
      <div className="asset-tax__notice" role="note">
        <strong>内部検討用（税務署提出様式ではありません）</strong>
        <span>第1表⑲の税負担額を、各人の取得資産等の価額で按分した参考値です。資産ごとに法定された税額ではありません。</span>
      </div>
    </>
  );
}

function AssetTable({
  rows, people, first,
}: { rows: readonly AssetTaxRow[]; people: readonly AssetTaxPersonSummary[]; first: number }) {
  return (
    <table className="worksheet__table asset-tax__table">
      <caption className="asset-tax__caption">資産等ごとの按分結果</caption>
      <colgroup>
        <col style={{ width: '5%' }} /><col style={{ width: '14%' }} /><col style={{ width: '23%' }} />
        <col style={{ width: '11%' }} /><col style={{ width: '13%' }} /><col style={{ width: '13%' }} />
        <col style={{ width: '10%' }} /><col style={{ width: '11%' }} />
      </colgroup>
      <thead><tr>
        <th scope="col">No.</th><th scope="col">取得者氏名</th><th scope="col">資産等</th><th scope="col">区分</th>
        <th scope="col">取得価額（円）</th><th scope="col">対応税額（参考）</th><th scope="col">実効税率</th><th scope="col">うち納付額（円）</th>
      </tr></thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.id} className={row.synthetic ? 'asset-tax__synthetic' : undefined}>
            <td className="worksheet__num">{first + index + 1}</td>
            <td>{people[row.personIndex]?.name || '（氏名未入力）'}</td>
            <td>{row.description}</td>
            <td>{row.category}</td>
            <td className="worksheet__num">{yen(row.amount)}</td>
            <td className="worksheet__num">{yen(row.allocatedTax)}</td>
            <td className="worksheet__num">{row.amount > 0 ? percent(row.allocatedTax / row.amount, 2) : '—'}</td>
            <td className="worksheet__num">{yen(row.allocatedPayable)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PersonTable({ people }: { people: readonly AssetTaxPersonSummary[] }) {
  return (
    <table className="worksheet__table asset-tax__table asset-tax__people">
      <caption className="asset-tax__caption">取得者別の集計・調整</caption>
      <colgroup>
        <col style={{ width: '6%' }} /><col style={{ width: '15%' }} /><col style={{ width: '14%' }} />
        <col style={{ width: '14%' }} /><col style={{ width: '14%' }} /><col style={{ width: '13%' }} />
        <col style={{ width: '12%' }} /><col style={{ width: '12%' }} />
      </colgroup>
      <thead><tr>
        <th scope="col">番号</th><th scope="col">氏名</th><th scope="col">第11表①（円）</th><th scope="col">付表明細計（円）</th>
        <th scope="col">第1表②・⑤（円）</th><th scope="col">債務・葬式費用（円）</th><th scope="col">税負担額⑲（円）</th><th scope="col">納付額㉑（円）</th>
      </tr></thead>
      <tbody>
        {people.map((person) => (
          <tr key={person.index}>
            <td className="worksheet__num">{person.index + 1}</td>
            <td>{person.name || '（氏名未入力）'}</td>
            <td className="worksheet__num">{yen(person.declaredAssets)}</td>
            <td className="worksheet__num">{yen(person.detailedAssets)}</td>
            <td className="worksheet__num">{yen(person.otherTaxBase)}</td>
            <td className="worksheet__num">{yen(person.debtAndFuneral)}</td>
            <td className="worksheet__num">{yen(person.taxBurden)}</td>
            <td className="worksheet__num">{yen(person.payable)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AssetTaxWorksheet({ rows, people }: AssetTaxWorksheetData) {
  const pages = useMemo(() => {
    const assetPages = Array.from(
      { length: Math.max(1, Math.ceil(rows.length / ASSET_ROWS_PER_PAGE)) },
      (_, page) => ({ kind: 'assets' as const, rows: rows.slice(page * ASSET_ROWS_PER_PAGE, (page + 1) * ASSET_ROWS_PER_PAGE), first: page * ASSET_ROWS_PER_PAGE }),
    );
    const personPages = Array.from(
      { length: Math.max(1, Math.ceil(people.length / PEOPLE_PER_PAGE)) },
      (_, page) => ({ kind: 'people' as const, people: people.slice(page * PEOPLE_PER_PAGE, (page + 1) * PEOPLE_PER_PAGE) }),
    );
    return [...assetPages, ...personPages];
  }, [rows, people]);

  return <>{pages.map((page, index) => (
    <div className="gov-page worksheet asset-tax" key={`${page.kind}-${index}`}>
      <SheetHead page={index + 1} total={pages.length} />
      {page.kind === 'assets' ? (
        <>
          <AssetTable rows={page.rows} people={people} first={page.first} />
          {rows.length === 0 && <p className="worksheet__empty">第11表の付表に、取得者と取得価額が入力された資産がありません。</p>}
          <p className="asset-tax__footnote">※ 対応税額は第1表⑲、納付額は第1表㉑を基礎にしています。実効税率は「対応税額÷取得価額」で、相続税の法定税率ではありません。付表明細との差額と第1表②・⑤は独立行で表示します。</p>
        </>
      ) : (
        <>
          <PersonTable people={page.people} />
          <div className="asset-tax__explain">
            <h3>読み方</h3>
            <p>第13表の債務・葬式費用は特定の資産の税額とはせず、取得者単位の調整として表示しています。控除・加算・納税猶予も取得者単位で計算された後の税額を按分しています。</p>
            <p>「付表明細との差額・未入力明細」がある場合は、第11表①と資産付表の取得価額合計が一致していません。資産の入力内容を確認してください。</p>
          </div>
        </>
      )}
    </div>
  ))}</>;
}
