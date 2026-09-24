import { dateJa, dateWareki } from "@/lib/format";

/**
 * 生年月日の表示。西暦を主、和暦を下段に小さく添える。
 * 1行の「西暦（和暦）」は欄幅が足りないと和暦の途中で折り返すため（印刷の本人情報で発生）、
 * 画面・印刷ともここを通して必ず2段で出す。`age` を渡すと西暦の後ろに「（68歳）」を足す。
 */
export function BirthDate({ value, age = null }: { value: string | null; age?: number | null }) {
  if (!value) return <>－</>;
  return <span className="birth-date">
    <span className="birth-date-gregorian">{dateJa(value)}{age === null ? "" : `（${age}歳）`}</span>
    <small className="birth-date-wareki">{dateWareki(value)}</small>
  </span>;
}
