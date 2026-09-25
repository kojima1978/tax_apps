"use client";

import { useEffect, useRef, useState } from "react";
import { dateJa } from "@/lib/format";
import { type EraCode, eraMaxYear, eraOf, eras, isoToWareki, warekiToIso } from "@/lib/wareki";

type Mode = "SEIREKI" | "WAREKI";

type Parts = { code: EraCode; eraYear: string; month: string; day: string };

const partsOf = (iso: string, fallbackEra: EraCode): Parts => {
  const wareki = isoToWareki(iso);
  return wareki
    ? { code: wareki.code, eraYear: String(wareki.eraYear), month: String(wareki.month), day: String(wareki.day) }
    : { code: fallbackEra, eraYear: "", month: "", day: "" };
};

/** 年度欄が未入力のまま組み立てられた `-01-01` のような値を範囲判定に使わないための番人。 */
const isoOrUndefined = (value: string | undefined) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;

const composeIso = (parts: Parts) => parts.eraYear && parts.month && parts.day
  ? warekiToIso(parts.code, Number(parts.eraYear), Number(parts.month), Number(parts.day))
  : null;

/**
 * 西暦と和暦を切り替えられる日付欄。
 *
 * ブラウザ標準のカレンダー（`input[type="date"]` のポップアップ）は年の一覧が西暦だけで、
 * こちらから和暦を併記できない。生年月日は和暦で聞かれることが多いため、
 * 元号・年・月・日を直接入力する経路を用意して、変換をアプリ側に寄せる。
 *
 * 値は常に `YYYY-MM-DD`（未入力・組み立て途中は空文字）。`name` を渡すと隠し欄で送信するので、
 * 素の form + FormData の画面でもそのまま使える。表示欄側に `name` は付けない（二重送信になる）。
 *
 * 入力の妥当性はブラウザの検証に乗せる:
 * - 西暦モードは `type="date"` の `required` / `min` / `max` がそのまま効く
 * - 和暦モードは年月日欄に `required` を置き、実在しない日付と `min`/`max` 超過は
 *   `setCustomValidity` で日欄に載せる（送信時に標準の吹き出しが出て止まる）
 */
export function DateInput({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  min,
  max,
  required,
  disabled,
  describedBy,
  label,
  defaultMode = "SEIREKI",
}: {
  id?: string;
  name?: string;
  /** 制御する場合の値。省略すると `defaultValue` を初期値に自分で保持する。 */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  describedBy?: string;
  /** 年・月・日の各欄の読み上げに付ける項目名（「生年月日の年」など）。 */
  label: string;
  defaultMode?: Mode;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const current = value ?? internalValue;
  const [mode, setMode] = useState<Mode>(defaultMode);
  // 和暦既定の欄は生年月日なので、空のときの元号は昭和から始めるのが打ち始めやすい。
  const [parts, setParts] = useState<Parts>(() => partsOf(current, defaultMode === "WAREKI" ? "SHOWA" : "REIWA"));
  // 自分が出した値は取り込み直さない。入力途中（年だけ入れた時点）は値が空になるため、
  // 外からの変更と区別しないと打ち込んだ月日が消える。
  const [emittedValue, setEmittedValue] = useState(current);
  const dayRef = useRef<HTMLInputElement>(null);

  if (current !== emittedValue) {
    setEmittedValue(current);
    setParts(partsOf(current, parts.code));
  }

  const commit = (next: string) => {
    setEmittedValue(next);
    if (value === undefined) setInternalValue(next);
    onChange?.(next);
  };

  const changeParts = (patch: Partial<Parts>) => {
    const next = { ...parts, ...patch };
    setParts(next);
    commit(composeIso(next) ?? "");
  };

  const lowerLimit = isoOrUndefined(min);
  const upperLimit = isoOrUndefined(max);
  const filled = Boolean(parts.eraYear && parts.month && parts.day);
  const composed = filled ? composeIso(parts) : null;
  const validationMessage = !filled ? ""
    : composed === null ? `${eraOf(parts.code).label}${parts.eraYear}年${parts.month}月${parts.day}日 は存在しません。元号と年月日を確認してください。`
      : lowerLimit && composed < lowerLimit ? `${dateJa(lowerLimit)} 以降で入力してください。`
        : upperLimit && composed > upperLimit ? `${dateJa(upperLimit)} 以前で入力してください。`
          : "";

  useEffect(() => {
    dayRef.current?.setCustomValidity(validationMessage);
  }, [validationMessage]);

  const numberField = (
    part: "eraYear" | "month" | "day",
    unit: string,
    maxValue: number,
    ref?: typeof dayRef,
  ) => <span key={part} className="date-input-unit">
    <input
      ref={ref}
      className="date-input-number"
      type="number"
      inputMode="numeric"
      min={1}
      max={maxValue}
      step={1}
      value={parts[part]}
      required={required}
      disabled={disabled}
      aria-label={`${label}の${unit}`}
      aria-describedby={describedBy}
      onChange={(event) => changeParts({ [part]: event.target.value })}
    />
    <span aria-hidden="true">{unit}</span>
  </span>;

  return <div className="date-input">
    {mode === "WAREKI"
      ? <>
        <select
          id={id}
          className="date-input-era"
          value={parts.code}
          disabled={disabled}
          aria-label={`${label}の元号`}
          aria-describedby={describedBy}
          onChange={(event) => changeParts({ code: event.target.value as EraCode })}
        >
          {eras.map((era) => <option key={era.code} value={era.code}>{era.label}</option>)}
        </select>
        {numberField("eraYear", "年", eraMaxYear(parts.code))}
        {numberField("month", "月", 12)}
        {numberField("day", "日", 31, dayRef)}
      </>
      : <input
        id={id}
        className="date-input-date"
        type="date"
        value={current}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        aria-label={label}
        aria-describedby={describedBy}
        onChange={(event) => commit(event.target.value)}
      />}
    {name ? <input type="hidden" name={name} value={current} /> : null}
    <button
      type="button"
      className="date-input-mode"
      disabled={disabled}
      aria-label={mode === "WAREKI" ? `${label}を西暦で入力する` : `${label}を和暦で入力する`}
      title={mode === "WAREKI" ? "西暦で入力に切り替え" : "和暦で入力に切り替え"}
      onClick={() => setMode(mode === "WAREKI" ? "SEIREKI" : "WAREKI")}
    >{mode === "WAREKI" ? "西暦" : "和暦"}</button>
  </div>;
}
