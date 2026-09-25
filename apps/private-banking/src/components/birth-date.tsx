import { dateJaWithWareki } from "@/lib/format";

/**
 * 生年月日の表示。「1978（昭和53）年12月22日」の1行で、`age` を渡すと年齢を下段に添える。
 * 画面・印刷ともここを通す（欄幅は場所ごとに違うので、折り返しは禁止しない）。
 */
export function BirthDate({ value, age = null }: { value: string | null; age?: number | null }) {
  if (!value) return <>－</>;
  return <span className="birth-date">
    <span className="birth-date-full">{dateJaWithWareki(value)}</span>
    {age === null ? null : <small className="birth-date-age">{age}歳</small>}
  </span>;
}
