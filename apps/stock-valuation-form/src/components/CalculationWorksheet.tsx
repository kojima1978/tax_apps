import { useMemo } from 'react';
import { Icon } from './ClientSummaryPage';
import { buildCalculationWorksheet, type WorksheetScenario, type WorksheetSection } from '@/lib/calculationWorksheet';
import type { TableProps } from '@/types/form';

type Props = Pick<TableProps, 'getField'> & {
  /** 画面表示のときだけ渡す。全表印刷に差し込むときは操作帯を出さない */
  onBack?: () => void;
  onPrint?: () => void;
};

const yen = (value: number | null) => value === null ? '算定未完了' : `${value.toLocaleString('ja-JP')}円`;

function difference(scenario: WorksheetScenario): string {
  const { currentPrice, trialPrice } = scenario;
  if (currentPrice === null || trialPrice === null) return '－';
  const diff = trialPrice - currentPrice;
  return diff === 0 ? '±0円' : `${diff > 0 ? '＋' : '－'}${Math.abs(diff).toLocaleString('ja-JP')}円`;
}

const WORKSHEET_COLUMNS = [
  { label: '項目', className: 'calc-worksheet-label-col' },
  { label: '現在', className: 'calc-worksheet-num-col' },
  { label: '試算', className: 'calc-worksheet-num-col' },
  { label: '試算の計算過程', className: 'calc-worksheet-process-col' },
] as const;

function SectionTable({ section }: { section: WorksheetSection }) {
  return (
    <section className="calc-worksheet-section">
      <h3>{section.title}</h3>
      {section.note && <p className="calc-worksheet-note">{section.note}</p>}
      <table className="calc-worksheet-table">
        <colgroup>
          {WORKSHEET_COLUMNS.map((col) => <col key={col.label} className={col.className} />)}
        </colgroup>
        <thead>
          <tr>{WORKSHEET_COLUMNS.map((col) => <th key={col.label} scope="col">{col.label}</th>)}</tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr key={row.label} className={row.changed ? 'calc-worksheet-changed' : undefined}>
              <th scope="row">{row.label}</th>
              <td className="calc-worksheet-num">{row.current}</td>
              <td className="calc-worksheet-num calc-worksheet-trial">{row.trial}</td>
              <td className="calc-worksheet-process">{row.process}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** サマリーの試算（利益0・想定利益・退職金）を、明細書の欄番号に沿って検算できるようにした別紙 */
export function CalculationWorksheet({ getField, onBack, onPrint }: Props) {
  const worksheet = useMemo(() => buildCalculationWorksheet(getField), [getField]);
  const computed = worksheet.scenarios.filter((s) => s.skipped === null);
  const meta = `${worksheet.companyName}　課税時期 ${worksheet.valuationDate}`;

  return (
    <div className="client-summary-wrap calc-worksheet-wrap">
      {(onBack || onPrint) && (
        <div className="client-summary-bar no-print">
          <div className="client-summary-actions">
            {onBack && <button type="button" onClick={onBack} className="summary-back-button">サマリーへ戻る</button>}
            {onPrint && <button type="button" onClick={onPrint} className="summary-print-button"><Icon name="print" />計算過程を印刷</button>}
          </div>
        </div>
      )}
      <article className="calc-worksheet">
        <header className="calc-worksheet-header">
          <p className="calc-worksheet-kicker">お客様サマリー 別紙</p>
          <h1>試算の計算過程</h1>
          <p className="calc-worksheet-meta">{meta}</p>
          <p className="calc-worksheet-lead">
            サマリーの「利益0の場合」「想定利益の場合」「退職金の試算」の価額を、明細書の欄番号に沿って再計算した過程です。
            差し替えた入力のほかは現在の入力値のまま計算しています。黄色の行は現在から値が変わった欄です。
          </p>
        </header>

        <section className="calc-worksheet-section">
          <h3>試算の一覧（原則的評価方式による価額・1株当たり）</h3>
          <table className="calc-worksheet-table calc-worksheet-overview">
            <thead>
              <tr>
                <th scope="col">試算</th>
                <th scope="col">評価ベース</th>
                <th scope="col" className="calc-worksheet-num">現在</th>
                <th scope="col" className="calc-worksheet-num">試算</th>
                <th scope="col" className="calc-worksheet-num">差額</th>
              </tr>
            </thead>
            <tbody>
              {worksheet.scenarios.map((s) => (
                <tr key={s.id}>
                  <th scope="row">{s.title}</th>
                  <td>{s.skipped === null ? s.basisLabel : '－'}</td>
                  {s.skipped === null ? (
                    <>
                      <td className="calc-worksheet-num">{yen(s.currentPrice)}</td>
                      <td className="calc-worksheet-num calc-worksheet-trial">{yen(s.trialPrice)}</td>
                      <td className="calc-worksheet-num">{difference(s)}</td>
                    </>
                  ) : (
                    <td colSpan={3} className="calc-worksheet-skipped">{s.skipped}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {computed.map((s) => (
          <section key={s.id} className="calc-worksheet-sheet" aria-labelledby={`calc-worksheet-${s.id}`}>
            <header className="calc-worksheet-sheet-head">
              <h2 id={`calc-worksheet-${s.id}`}>{s.title}<span>{s.basisLabel}</span></h2>
              <p>{s.description}</p>
              <p className="calc-worksheet-meta">{meta}</p>
            </header>
            {s.sections.map((section) => <SectionTable key={section.title} section={section} />)}
            <p className="calc-worksheet-result">
              原則的評価方式による価額　現在 {yen(s.currentPrice)} → 試算 <strong>{yen(s.trialPrice)}</strong>（{difference(s)}）
            </p>
          </section>
        ))}
      </article>
    </div>
  );
}
