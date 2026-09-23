import type { GridCell } from '@/components/ui/GridForm';
import { formatAmount, formatSenPart, formatYenPart } from '@/lib/numberFormat';

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

/* ================================================
 * 株式に関する権利の評価額の合計（第3表㉞・第6表㊱で共通）
 * ================================================ */

/** 合計に入れる権利1件 */
export interface RightItem {
  /** 発生しているかを保存するフィールド（right_haito 等） */
  key: string;
  /** 様式の丸数字（何が足りないかを伝えるのに使う） */
  mark: string;
  /** 権利の名称 */
  name: string;
  /** 1株当たりの価額 */
  value: number | null;
}

export interface RightsTotal {
  /** ㉞（㊱）の［円］欄に入れる文字列 */
  yen: string;
  /** ㉞（㊱）の［銭］欄に入れる文字列 */
  sen: string;
  /** 合計額（選択なし・値が揃わないときは null） */
  total: number | null;
  /** 発生しているとされた権利 */
  selected: RightItem[];
  /** 値が出ていないため合計できなかった権利 */
  missing: RightItem[];
}

/**
 * 株式に関する権利の評価額を合計する。
 *
 * 記載方法等（第3表 5⑵・第6表 5⑵）は「株式に関する権利が複数発生している場合には、
 * それぞれの金額を**合計した金額**を記載します（合計した金額に表示単位未満の端数が
 * ある場合であっても、切り捨てずにそのまま記載します。）」とする。
 * 以前は権利ごとに1行ずつ並べて書いていたが、様式の欄は1つの金額欄なので合計に直した。
 *
 * 1件でも価額が出ていない権利があるときは合計しない（0として足すと、
 * 実際より小さい金額を様式へ印字してしまう）。
 */
export function rightsTotal(items: RightItem[], isSelected: (key: string) => boolean): RightsTotal {
  const selected = items.filter((r) => isSelected(r.key));
  const missing = selected.filter((r) => r.value === null);
  if (selected.length === 0 || missing.length > 0) {
    return { yen: '', sen: '', total: null, selected, missing };
  }
  const total = selected.reduce((sum, r) => sum + (r.value ?? 0), 0);
  // 端数は切り捨てない。銭で書ける端数は［銭］欄へ、分数等で1銭に満たない端数まで
  // 出たときは［円］欄へそのまま書く（切り捨てると様式の指示に反する）。
  const sen100 = total * 100;
  if (Math.abs(sen100 - Math.round(sen100)) > 1e-9) {
    return { yen: formatAmount(total), sen: '', total, selected, missing };
  }
  return {
    yen: formatYenPart(total),
    sen: formatSenPart(total),
    total, selected, missing,
  };
}
