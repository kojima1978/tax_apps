/**
 * 縦一列の並びをドラッグで入れ替えるリスト。
 *
 * 行に固有のIDは持たせず、添字だけで扱う。並べ替えの対象（付表の明細・明細の中の取得者）は
 * どちらも配列の順そのものが出力順で、IDが要るのはドラッグしている間だけのため。
 * とくに明細へIDを足すと、まったくの空欄の明細に値が1つ入ることになり、
 * 「空の明細には項番を振らない」判定（`isEmptyDetail`）がすべて崩れる。
 *
 * ドラッグできるのはつまみだけにしてある。行の中に入力欄があるので、
 * 行ぜんたいを draggable にすると文字を選ぼうとしただけでドラッグが始まってしまう。
 * つまみを掴めない場合のために ▲▼ も並べる。
 */

import { useState, type ReactNode } from 'react';

export interface SortableListProps {
  /** 行の中身（並び順のまま） */
  items: readonly ReactNode[];
  /** 行の呼び名（ボタンのアクセシブル名に使う） */
  labelOf: (index: number) => string;
  /** `from` 番目を `to` 番目の位置へ移す */
  onMove: (from: number, to: number) => void;
  className?: string;
}

export function SortableList({ items, labelOf, onMove, className }: SortableListProps) {
  /** 掴んでいる行 */
  const [from, setFrom] = useState<number | null>(null);
  /** 落とし先として指している行 */
  const [over, setOver] = useState<number | null>(null);

  const finish = () => { setFrom(null); setOver(null); };
  const drop = (to: number) => {
    if (from !== null && from !== to) onMove(from, to);
    finish();
  };
  const step = (index: number, by: number) => {
    const to = index + by;
    if (to >= 0 && to < items.length) onMove(index, to);
  };

  return (
    <ul className={['sortlist', className].filter((name) => name !== undefined).join(' ')}>
      {items.map((item, index) => (
        <li
          // 並べ替えでは中身がそのまま動くので、添字をそのまま key にしてよい
          key={index}
          className={[
            'sortlist__row',
            from === index ? 'sortlist__row--from' : '',
            over === index && from !== null && from !== index ? 'sortlist__row--over' : '',
          ].filter((name) => name !== '').join(' ')}
          onDragOver={(event) => { event.preventDefault(); setOver(index); }}
          onDrop={(event) => { event.preventDefault(); drop(index); }}
        >
          <span
            className="sortlist__grip"
            draggable
            aria-hidden="true"
            onDragStart={(event) => {
              // Firefox はデータを載せないとドラッグを始めない
              event.dataTransfer.setData('text/plain', String(index));
              event.dataTransfer.effectAllowed = 'move';
              setFrom(index);
            }}
            onDragEnd={finish}
          >
            ⣿
          </span>
          <span className="sortlist__body">{item}</span>
          <span className="sortlist__moves">
            <button
              type="button" className="app-btn" aria-label={`${labelOf(index)}を上へ`}
              disabled={index <= 0} onClick={() => step(index, -1)}
            >
              ▲
            </button>
            <button
              type="button" className="app-btn" aria-label={`${labelOf(index)}を下へ`}
              disabled={index >= items.length - 1} onClick={() => step(index, 1)}
            >
              ▼
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
