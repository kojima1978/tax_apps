/**
 * 明細の並べ替え画面（明細を持つ様式で共通）。
 *
 * 用紙の上で直接動かせないのは、1件が複数行にまたがっていたり、枚数で切れ目が入ったりして、
 * 「掴んで下へ」が用紙の形と噛み合わないため。ここでは1件を1行にたたんで縦一列に並べ、順だけを扱う。
 *
 * 項番は「空でない明細の並び順」で決まるので、並べ替えれば番号も自動で振り直される。
 * 空欄の明細（まだ何も書いていない枠）は人が見ても区別が付かないので一覧には出さず、
 * 実配列の添字へ読み替えて動かす。
 */

import { isEmptyDetail, num, type Values } from '../lib/calc';
import { SortableList } from './ui/SortableList';

/** 一覧の見出しに拾う欄（様式の欄の並び順に並べる） */
export interface RowSortColumn {
  /** 明細の中でのフィールド名 */
  field: string;
  /** 値に添える欄の名前 */
  name: string;
}

export interface RowSortPanelProps {
  /** 画面の見出し（「財産の並べ替え」「保険金の並べ替え」など） */
  heading: string;
  /** 見出しに添える、どの様式のどの明細かの説明 */
  subtitle: string;
  columns: readonly RowSortColumn[];
  /** 右端に出す金額。合計が要る様式（付表）もあるので値そのものではなく関数で受ける */
  amountOf: (item: Values) => string;
  /** 明細の全件（空欄を含む、保存されている並びのまま） */
  items: readonly Values[];
  /** 実配列の添字で入れ替える */
  onMove: (from: number, to: number) => void;
  onClose: () => void;
}

/**
 * 一覧に出す1行分の見出し。様式の欄の並び順に、値の入っている欄を先頭から拾う。
 * 値だけを並べると数字の羅列になって見分けが付かないので、欄の名前を添える。
 * 幅からあふれた分は省略されるが、先頭の欄ほど財産を見分けやすいので順はそのままでよい。
 */
function summary(columns: readonly RowSortColumn[], item: Values): string {
  const text = columns
    .map(({ field, name }) => {
      const value = (item[field] ?? '').trim();
      return value === '' ? '' : `${name}：${value}`;
    })
    .filter((part) => part !== '')
    .join('／');
  return text === '' ? '（内容未入力）' : text;
}

export function RowSortPanel({
  heading, subtitle, columns, amountOf, items, onMove, onClose,
}: RowSortPanelProps) {
  /** 一覧に出す明細（空欄は出さない）。実配列の添字を持ち歩く */
  const rows = items.map((item, index) => ({ item, index })).filter(({ item }) => !isEmptyDetail(item));

  return (
    <div className="dpanel no-print" role="dialog" aria-modal="true" aria-label={`${subtitle} ${heading}`}>
      <div className="dpanel__box">
        <div className="dpanel__head">
          <strong>{heading}</strong>
          <span className="dpanel__sub">{subtitle}</span>
          <button type="button" className="app-btn" onClick={onClose} aria-label="閉じる">×</button>
        </div>

        <div className="dpanel__body">
          {rows.length === 0 ? (
            <p className="dpanel__note">並べ替える明細がありません。</p>
          ) : (
            <>
              <SortableList
                items={rows.map(({ item }, order) => (
                  <div className="dsort__row">
                    <span className="dsort__no">{order + 1}</span>
                    <span className="dsort__text">{summary(columns, item)}</span>
                    <span className="dsort__value">{num(amountOf(item)).toLocaleString()} 円</span>
                  </div>
                ))}
                labelOf={(order) => `${order + 1}番目の明細`}
                onMove={(from, to) => onMove(rows[from]!.index, rows[to]!.index)}
              />
              <p className="dpanel__note">
                つまみ（⣿）を掴むか▲▼で動かします。番号は並び順そのままなので、動かせば項番も振り直されます。
              </p>
            </>
          )}
        </div>

        <div className="dpanel__foot">
          <span className="dpanel__spacer" />
          <button type="button" className="app-btn app-btn--primary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
