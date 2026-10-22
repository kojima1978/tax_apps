"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { matchesSearchTerms, searchTerms } from "@/lib/clients";
import { ambiguousStaffNames, groupStaffByDepartment, type Staff, staffOptionLabel } from "@/lib/staff";

export function StaffCombobox({ id, staff, value, onChange, name, ariaLabel = "担当者", placeholder = "氏名・部署で検索", disabled = false }: {
  id: string;
  staff: Staff[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  // コードは同姓同名のときだけ併記する（この事務所は62人全員が自動生成の `SD-<台帳ID>`）。
  const ambiguous = ambiguousStaffNames(staff);
  const labelOf = (row: Staff) => staffOptionLabel(row, ambiguous.has(row.name));
  const selected = staff.find((row) => String(row.id) === value) ?? null;
  const selectedLabel = selected ? labelOf(selected) : "";
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const terms = searchTerms(query === selectedLabel ? "" : query);
  // 表示は部署ごとの束。キー操作は束を跨いで「見えている順」に動かすので、同じ順で平らにした配列も持つ。
  const groups = groupStaffByDepartment(staff.filter((row) => matchesSearchTerms([row.name, row.nameKana, row.staffCode, row.department], terms)));
  const filtered = groups.flatMap((group) => group.options);
  const indexById = new Map(filtered.map((row, index) => [row.id, index]));
  const listboxId = `${id}-options`;
  const optionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    // カーソルが先頭なら一覧ごと上へ戻す。絞り込み直後は前の位置が残り、「未設定」の行が画面の外へ出てしまう。
    // `query` も依存に要る ── 担当者未設定の画面は `activeIndex` が最初から0で、入力しても0のままなので
    // カーソルだけを見ているとこの効果が1度も走らない（新規登録のモーダルで実測）。
    if (activeIndex === 0 && optionsRef.current) optionsRef.current.scrollTop = 0;
    else optionsRef.current?.querySelector(".is-active")?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, open, query]);

  function choose(row: Staff) {
    onChange(String(row.id));
    setQuery(labelOf(row));
    setOpen(false);
  }

  /**
   * 開くときは今の担当者にカーソルを置く（62人だと一覧は12画面ぶんあり、
   * 先頭から出すと選ばれている人がどこにいるか分からない）。絞り込み前の全体で位置を数える。
   */
  function openList() {
    setQuery(selectedLabel);
    setOpen(true);
    const all = groupStaffByDepartment(staff).flatMap((group) => group.options);
    setActiveIndex(Math.max(all.findIndex((row) => String(row.id) === value), 0));
  }

  function handleKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) openList();
      else setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openList();
      else setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (!event.nativeEvent.isComposing && filtered[activeIndex]) choose(filtered[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault(); setQuery(selectedLabel); setOpen(false);
    }
  }

  return <div
    className="staff-combobox"
    onBlur={(event) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
      setQuery(selectedLabel); setOpen(false);
    }}
  >
    {name ? <input type="hidden" name={name} value={value} /> : null}
    <div className="staff-combobox-input">
      <Search aria-hidden="true" />
      <input
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[activeIndex] ? `${id}-option-${filtered[activeIndex].id}` : undefined}
        autoComplete="off"
        value={open ? query : selectedLabel}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={(event) => { openList(); event.currentTarget.select(); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0); }}
        onKeyDown={handleKeys}
      />
      {value ? <button type="button" className="staff-combobox-clear" aria-label="担当者の選択を解除" onClick={() => { onChange(""); setQuery(""); setOpen(true); setActiveIndex(0); }} disabled={disabled}><X /></button> : <ChevronDown aria-hidden="true" />}
    </div>
    {open ? <div ref={optionsRef} id={listboxId} className="staff-combobox-options" role="listbox" aria-label="担当者の候補">
      <button type="button" role="option" aria-selected={value === ""} className="staff-combobox-option is-empty" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(""); setQuery(""); setOpen(false); }}>未設定</button>
      {/* 部署は見出しが言うので行には出さない。行に残すのは同姓同名のコードと退職の印だけ。 */}
      {groups.map((group) => <div key={group.label} role="group" aria-label={group.label} className="staff-combobox-group">
        <p className="staff-combobox-group-label" aria-hidden="true">{group.label}<span>{group.options.length}人</span></p>
        {group.options.map((row) => {
          const index = indexById.get(row.id) ?? 0;
          const detail = [ambiguous.has(row.name) ? row.staffCode : "", row.isActive ? "" : "退職"].filter(Boolean).join("・");
          return <button
            id={`${id}-option-${row.id}`}
            key={row.id}
            type="button"
            role="option"
            aria-selected={String(row.id) === value}
            className={index === activeIndex ? "staff-combobox-option is-active" : "staff-combobox-option"}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => choose(row)}
          ><strong>{row.name}</strong>{detail ? <span>{detail}</span> : null}</button>;
        })}
      </div>)}
      {filtered.length === 0 ? <p className="staff-combobox-empty">一致する担当者がいません。</p> : null}
    </div> : null}
  </div>;
}
