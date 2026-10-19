"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { matchesSearchTerms, searchTerms } from "@/lib/clients";
import { type Staff, staffOptionLabel } from "@/lib/staff";

export function StaffCombobox({ id, staff, value, onChange, name, ariaLabel = "担当者", placeholder = "氏名・コード・部署で検索", disabled = false }: {
  id: string;
  staff: Staff[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const selected = staff.find((row) => String(row.id) === value) ?? null;
  const selectedLabel = selected ? staffOptionLabel(selected) : "";
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const terms = searchTerms(query === selectedLabel ? "" : query);
  const filtered = staff.filter((row) => matchesSearchTerms([row.name, row.nameKana, row.staffCode, row.department], terms));
  const listboxId = `${id}-options`;
  const optionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) optionsRef.current?.querySelector(".is-active")?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, open]);

  function choose(row: Staff) {
    onChange(String(row.id));
    setQuery(staffOptionLabel(row));
    setOpen(false);
  }

  function handleKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault(); setOpen(true); setActiveIndex((index) => open ? Math.min(index + 1, Math.max(filtered.length - 1, 0)) : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.max(index - 1, 0));
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
        onFocus={(event) => { setQuery(selectedLabel); setOpen(true); setActiveIndex(0); event.currentTarget.select(); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0); }}
        onKeyDown={handleKeys}
      />
      {value ? <button type="button" className="staff-combobox-clear" aria-label="担当者の選択を解除" onClick={() => { onChange(""); setQuery(""); setOpen(true); }} disabled={disabled}><X /></button> : <ChevronDown aria-hidden="true" />}
    </div>
    {open ? <div ref={optionsRef} id={listboxId} className="staff-combobox-options" role="listbox" aria-label="担当者の候補">
      <button type="button" role="option" aria-selected={value === ""} className="staff-combobox-option is-empty" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(""); setQuery(""); setOpen(false); }}>未設定</button>
      {filtered.map((row, index) => <button
        id={`${id}-option-${row.id}`}
        key={row.id}
        type="button"
        role="option"
        aria-selected={String(row.id) === value}
        className={index === activeIndex ? "staff-combobox-option is-active" : "staff-combobox-option"}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => choose(row)}
      ><strong>{row.name}</strong><span>{row.staffCode}{row.department ? ` ・ ${row.department}` : ""}{row.isActive ? "" : " ・ 退職"}</span></button>)}
      {filtered.length === 0 ? <p className="staff-combobox-empty">一致する担当者がいません。</p> : null}
    </div> : null}
  </div>;
}
