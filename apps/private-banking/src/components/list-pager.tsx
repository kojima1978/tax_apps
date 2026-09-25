import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZES } from "@/lib/pagination";

/** 1ページの表示件数を選ぶ欄。顧客一覧・不動産一覧で同じ選択肢を出す。 */
export function PageSizeSelect({ value, onChange }: { value: number; onChange: (size: number) => void }) {
  return <label>
    <span>表示件数</span>
    <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
      {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}件</option>)}
    </select>
  </label>;
}

/** ページ切り替え。何件目を見ているかを左に、送りのボタンを右に出す。 */
export function ListPager({ label, total, from, shown, current, last, onChange }: {
  label: string;
  total: number;
  from: number;
  shown: number;
  current: number;
  last: number;
  onChange: (page: number) => void;
}) {
  return <nav className="list-pager" aria-label={label}>
    <p>{total}件中 {from + 1}〜{from + shown}件目</p>
    <div>
      <button type="button" className="button secondary" onClick={() => onChange(current - 1)} disabled={current <= 1}>
        <ChevronLeft />前へ
      </button>
      <span aria-live="polite">{current} / {last}ページ</span>
      <button type="button" className="button secondary" onClick={() => onChange(current + 1)} disabled={current >= last}>
        次へ<ChevronRight />
      </button>
    </div>
  </nav>;
}
