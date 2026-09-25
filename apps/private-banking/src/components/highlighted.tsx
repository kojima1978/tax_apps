"use client";

import { useMemo } from "react";
import { highlightRanges } from "@/lib/clients";

/** 検索語に一致した部分を <mark> で強調する。顧客一覧と不動産一覧で共用。 */
export function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  const ranges = useMemo(() => highlightRanges(text, terms), [text, terms]);
  if (ranges.length === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], index) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(<mark key={index}>{text.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}
