import type { GridCell } from '@/components/ui/GridForm';

/* ================================================
 * 適用方式の選択（第3表・第6表で共通）
 * ================================================ */

/**
 * 適用方式を様式の区分見出しそのものでクリックして選ばせるためのセル属性。
 *
 * 第3表（原則的評価方式／配当還元方式）と第6表（純資産価額方式等／配当還元方式）は
 * 同じ構造を持ち、どちらも既定は第1表の株主判定に連動する自動選択。区分見出しを押すと
 * その方式に固定し、もう一度押すと自動へ戻る（selectValue が持つトグル）。
 *
 * 採用中の着色は様式にない表示なので画面限定にし、自動で選ばれた区分は橙、
 * 手で固定した区分は青の枠で見分けられるようにする。
 */
export function methodPickCell(opts: {
  /** 方式を保存するフィールド（第3表・第6表とも 'hoshiki'） */
  field: string;
  /** この見出しが表す方式の保存値 */
  value: string;
  /** 表示名（原則的評価方式・純資産価額方式等・配当還元方式） */
  name: string;
  /** 手で固定されている方式。空文字なら自動 */
  pinned: string;
  /** いま計算に採用されている方式か */
  applied: boolean;
  /** 選べない理由。あるとクリック不可になり、ホバーで理由を出す */
  blockedReason?: string;
}): Partial<GridCell> {
  const isPinned = opts.pinned === opts.value;
  const blocked = opts.blockedReason !== undefined;
  return {
    selectValue: blocked ? undefined : { field: opts.field, value: opts.value },
    highlightWhen: () => opts.applied,
    highlightScreenOnly: true,
    pinnedWhen: () => isPinned,
    ariaLabel: blocked
      ? `${opts.name}（適用しません）`
      : `${opts.name}を適用${isPinned ? '（固定中）' : opts.applied ? '（第１表の判定により適用中）' : ''}`,
    hoverHint: opts.blockedReason
      ?? (isPinned
        ? `${opts.name}に固定中。クリックで自動（第１表の株主判定に連動）に戻す`
        : `クリックで${opts.name}に固定`),
  };
}
