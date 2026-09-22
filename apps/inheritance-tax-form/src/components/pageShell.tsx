import type { ReactNode } from 'react';
import { GridForm, type GridCell } from './ui/GridForm';
import { ROW_SORTS } from '../forms/registry';
import { EDITION } from '../forms/table1';
import { TABLE1CONT_CONFIRM_BOXES } from '../forms/table1cont';

/**
 * 用紙の入れ物とページ操作。
 * 様式ごとの中身（どのセルを並べるか）は forms/*.ts と components/formPages.tsx が持ち、
 * ここには「どの様式でも同じ部分」だけを置く。
 */

/** 様式の枠外に印字されている注記と適用年分 */
export function Footnote({ notes, edition = EDITION }: { notes: string; edition?: string }) {
  const rows = notes.split('\n').map((line) => line.match(/^(?:（注）)?[\u3000 ]*(\d+)[\u3000 ]+(.*)$/));
  const numbered = rows.every((row) => row !== null);
  const symbolNote = notes.match(/^([※＊])[\u3000 ]*(.*)$/s);
  return (
    <div className="gov-footnote">
      <span className="gov-footnote__notes">
        {numbered ? rows.map((row, index) => (
          <span className="gov-footnote__note-row" key={`${row![1]}-${index}`}>
            <span className="gov-footnote__note-prefix">{index === 0 ? '（注）' : ''}</span>
            <span className="gov-footnote__note-number">{row![1]}</span>
            <span className="gov-footnote__note-body">{row![2]}</span>
          </span>
        )) : symbolNote ? (
          <span className="gov-footnote__symbol-row">
            <span className="gov-footnote__symbol">{symbolNote[1]}</span>
            <span className="gov-footnote__note-body">{symbolNote[2]}</span>
          </span>
        ) : notes}
      </span>
      <span style={{ whiteSpace: 'nowrap' }}>{edition}</span>
    </div>
  );
}

/** 第1表（続）の罫線表の下に並ぶ「※確認」欄 */
export function ConfirmBoxes() {
  return (
    <div style={{ position: 'relative', height: 13, marginTop: 2 }}>
      {TABLE1CONT_CONFIRM_BOXES.map((box) => (
        <div
          key={box.left}
          style={{
            position: 'absolute', top: 0, bottom: 0, left: `${box.left}%`, width: `${box.width}%`,
            border: '0.5px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: box.code ? 6 : 7, lineHeight: 1,
          }}
        >
          {box.text ?? box.code ?? ''}
        </div>
      ))}
    </div>
  );
}

interface FormPageProps {
  cells: GridCell[];
  g: (field: string) => string;
  u: (field: string, value: string) => void;
  formCode: string;
  title: string;
  subtitle?: string;
  aspectRatio?: string;
  /** input/select の id・name に使う表識別子（用紙ごとに違う） */
  formId: string;
  /** 転記欄（被相続人の氏名など）のクリックで入力元の様式へ移る */
  onNavigate?: (formId: string) => void;
  /** `action` を持つセル（人物ブロック・明細）のクリック */
  onAction?: (action: string) => void;
  /** 枠外の注記（省略すると適用年分だけになる） */
  notes?: string;
  edition?: string;
  /** 注記の前に入る様式ごとの付き物（第1表（続）の※確認欄、第2表の共同提出の注記） */
  beforeFootnote?: ReactNode;
}

/**
 * 用紙1枚。どの様式も「A4の枠 → 罫線表 → 枠外の注記」の順で同じなので、
 * 様式ごとの違いはセルと表題・注記だけに絞る。
 */
export function FormPage({
  cells, g, u, formCode, title, subtitle, aspectRatio, formId,
  onNavigate, onAction, notes = '', edition, beforeFootnote,
}: FormPageProps) {
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={formCode}
        title={title}
        subtitle={subtitle}
        aspectRatio={aspectRatio}
        formId={formId}
        onNavigate={onNavigate}
        onAction={onAction}
        footer={<>{beforeFootnote}<Footnote notes={notes} edition={edition} /></>}
      />
    </div>
  );
}

/** 用紙の上の説明と並べ替えボタン（明細は用紙の上では動かせないので別画面へ送る） */
export function PageDetail({ text, forms, onSort }: {
  text: string;
  forms: readonly string[];
  onSort: (form: string) => void;
}) {
  return (
    <>
      {text}
      {forms.map((form) => (
        <button key={form} type="button" className="app-btn" onClick={() => onSort(form)}>
          {ROW_SORTS[form]!.button}
        </button>
      ))}
    </>
  );
}

export interface PageControlProps {
  page: number;
  total: number;
  /** 増減の操作。省略すると枚数の表示だけになる（枚数が別の場所で決まる用紙） */
  onDecrease?: () => void;
  onIncrease?: () => void;
  decreaseDisabled?: boolean;
  increaseDisabled?: boolean;
  detail?: ReactNode;
}

/** 画面上だけに表示するページ増減操作。各用紙の左上に置く。 */
export function PageControl({
  page, total, onDecrease, onIncrease, decreaseDisabled, increaseDisabled, detail,
}: PageControlProps) {
  return (
    <div className="app-pagectl no-print">
      <span>ページ</span>
      {onDecrease && <button type="button" className="app-btn" onClick={onDecrease} disabled={decreaseDisabled} aria-label="ページを減らす">−</button>}
      {onIncrease && <button type="button" className="app-btn" onClick={onIncrease} disabled={increaseDisabled} aria-label="ページを増やす">＋</button>}
      <span>{page}/{total}ページ</span>
      {detail && <span className="app-pagectl__detail">{detail}</span>}
    </div>
  );
}

interface PageListProps extends Omit<PageControlProps, 'page' | 'total'> {
  /** 並べる用紙の枚数 */
  count: number;
  /** 表示上の総枚数（（続）は本表を含めて数えるので count と違う）。省略すると count */
  total?: number;
  /** 1枚目に振るページ番号（（続）は本表の次から数える） */
  firstPage?: number;
  /** 用紙1枚（0 起点の通し番号を受け取る） */
  children: (page: number) => ReactNode;
}

/**
 * 同じ様式の用紙を枚数ぶん並べ、1枚ごとに左上へページ操作を付ける。
 * ページ操作の中身（± が枚数を動かすのか明細の件数を動かすのか）は様式によって違うので、
 * PageControl の引数をそのまま受け取る。
 */
export function PageList({ count, total, firstPage = 1, children, ...control }: PageListProps) {
  return (
    <>
      {Array.from({ length: count }, (_, page) => (
        <div key={page} className="app-page-with-control">
          <PageControl page={firstPage + page} total={total ?? count} {...control} />
          {children(page)}
        </div>
      ))}
    </>
  );
}
