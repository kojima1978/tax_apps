"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { buildPickerSections, departmentOrderByName, type PersonLike, readRecentIds, rememberRecent } from "@/shared/staff-directory/assignee";
import { copyLinkTroubleMessage, useCopyLinkTrouble } from "@/shared/staff-directory/linkHealth";
import { useOperator } from "@/shared/staff-directory/operator";
import { retirementMark } from "@/shared/staff-retirement/retirement";
import { ambiguousStaffNames, type Staff, staffOptionLabel } from "@/lib/staff";

/** 共通の並べ方（shared/staff-directory/assignee.ts）に渡す形。写しの行をそのまま持たせる */
type Person = PersonLike & { row: Staff };

/** link-health の写しの状態を引くときのアプリ名（社員台帳の server/linkedApps.ts と同じ） */
const LINK_APP = "private-banking";

/**
 * 担当者を選ぶ欄。振る舞いは社員台帳を使う他のアプリの担当者ダイアログ（shared/staff-directory の
 * AssigneePicker）とそろえる ── 検索・部署ごと・先頭に「自分（操作者）」「最近選んだ人」・退職予定の印。
 * 並べ方・自分・最近・退職の判定は shared の同じ関数を通し、見た目だけ PB の CSS で持つ。
 *
 * 一覧は PB の写し（`staff`）から出すので、台帳が止まっていても選べる。自分と最近選んだ人は台帳ID で
 * 控えてあるため、写しの `staffDirectoryId` で行へ引き当てる。値（hidden input）は写しの ID のまま。
 */
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
  const { selected: me, operators, status } = useOperator();
  const trouble = useCopyLinkTrouble(LINK_APP);
  // コードは同姓同名のときだけ併記する（この事務所は62人全員が自動生成の `SD-<台帳ID>`）。
  const ambiguous = ambiguousStaffNames(staff);
  const labelOf = (row: Staff) => staffOptionLabel(row, ambiguous.has(row.name));
  const selected = staff.find((row) => String(row.id) === value) ?? null;
  const selectedLabel = selected ? labelOf(selected) : "";
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  // localStorage はブラウザでしか読めないので、開いたときに読む（サーバーで描く1回目と食い違わせない）
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const listboxId = `${id}-options`;
  const optionsRef = useRef<HTMLDivElement>(null);

  // 部署の並びは台帳の部署の画面の順。写しは部署名しか持たないので、台帳から読めた一覧で名前から順を引く。
  // 台帳が止まっていれば空 ── 並びが名前順に戻るだけで、選ぶのは写しからできる
  const orderByDepartment = useMemo(() => departmentOrderByName(status === "ok" ? operators : []), [operators, status]);
  const people = useMemo(() => staff.map((row): Person => ({
    row,
    fullName: row.name,
    kana: row.nameKana,
    companyName: "",
    departmentName: row.department,
    departmentOrder: orderByDepartment.get(row.department) ?? null,
    searchExtra: row.staffCode,
  })), [staff, orderByDepartment]);
  // 退職予定の印に使う退職日は台帳から（写しには持たない）。台帳が止まっていれば印は出せない
  const retiredOnByDirectoryId = useMemo(
    () => new Map(status === "ok" ? operators.flatMap((o) => o.id === null ? [] : [[o.id, o.retiredOn] as const]) : []),
    [operators, status],
  );
  const meId = status === "ok" ? me?.id ?? null : null;
  const sectionsFor = (text: string, recent: readonly number[]) => buildPickerSections(people, {
    query: text,
    directoryIdOf: (person) => person.row.staffDirectoryId,
    quick: { meId, recentIds: recent },
  });
  const searchText = query === selectedLabel ? "" : query;
  const sections = sectionsFor(searchText, recentIds);
  // 表示は塊ごと。キー操作は塊を跨いで「見えている順」に動かすので、同じ順で平らにした配列も持つ。
  // 自分・最近の人は部署の塊にも出るので、行の識別は塊の番号つき。
  const entries = (list: typeof sections) => list.flatMap((section, s) => section.people.map((person) => ({ key: `${s}-${person.row.id}`, row: person.row })));
  const flat = entries(sections);
  const indexByKey = new Map(flat.map((entry, index) => [entry.key, index]));

  /**
   * 開いたら外側を送って一覧を丸ごと見せる。新規登録の画面は候補がモーダルの中に出るため、
   * 一覧の下端が枠で切れて1行ぶん（実測50px）読めなかった。モーダル自身がスクロールするので
   * `block: "nearest"` で足りるぶんだけ送る（既に全部見えていれば何も動かない）。
   */
  useEffect(() => {
    if (open) optionsRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [open]);
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
    // 最近選んだ人は全アプリ共通で台帳ID を控える（台帳に居ない行は控えない）
    if (row.staffDirectoryId !== null) rememberRecent(row.staffDirectoryId);
  }

  /**
   * 開くときは今の担当者にカーソルを置く（62人だと一覧は12画面ぶんあり、
   * 先頭から出すと選ばれている人がどこにいるか分からない）。絞り込み前の全体で位置を数える。
   */
  function openList() {
    const recent = readRecentIds();
    setRecentIds(recent);
    setQuery(selectedLabel);
    setOpen(true);
    const all = entries(sectionsFor("", recent));
    setActiveIndex(Math.max(all.findIndex((entry) => String(entry.row.id) === value), 0));
  }

  function handleKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) openList();
      else setActiveIndex((index) => Math.min(index + 1, Math.max(flat.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openList();
      else setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (!event.nativeEvent.isComposing && flat[activeIndex]) choose(flat[activeIndex].row);
    } else if (event.key === "Escape") {
      event.preventDefault(); setQuery(selectedLabel); setOpen(false);
    }
  }

  /** 行の右に添える小さな字。同姓同名のコード・（部署の塊以外では）部署・退職／退職予定の印 */
  function detailOf(row: Staff, showDepartment: boolean) {
    const mark = row.isActive
      ? retirementMark(row.staffDirectoryId === null ? null : retiredOnByDirectoryId.get(row.staffDirectoryId) ?? null)
      : "退職";
    return { text: [ambiguous.has(row.name) ? row.staffCode : "", showDepartment ? row.department : ""].filter(Boolean).join("・"), mark };
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
        aria-activedescendant={open && flat[activeIndex] ? `${id}-option-${flat[activeIndex].key}` : undefined}
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
      {sections.map((section, s) => section.people.length === 0 ? null : <div key={`${section.kind}-${section.label}`} role="group" aria-label={section.label} className="staff-combobox-group">
        <p className="staff-combobox-group-label" aria-hidden="true">{section.label}{section.kind === "department" ? <span>{section.people.length}人</span> : null}</p>
        {section.people.map(({ row }) => {
          const key = `${s}-${row.id}`;
          const index = indexByKey.get(key) ?? 0;
          const detail = detailOf(row, section.showDepartment);
          return <button
            id={`${id}-option-${key}`}
            key={key}
            type="button"
            role="option"
            aria-selected={String(row.id) === value}
            className={index === activeIndex ? "staff-combobox-option is-active" : "staff-combobox-option"}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => choose(row)}
          ><strong>{row.name}</strong>{detail.mark ? <em className="staff-combobox-mark">{detail.mark}</em> : null}{detail.text ? <span>{detail.text}</span> : null}</button>;
        })}
      </div>)}
      {flat.length === 0 ? <p className="staff-combobox-empty">一致する担当者がいません。</p> : null}
      {status === "fallback" ? <p className="staff-combobox-empty">社員台帳に接続できないため、自分（操作者）と退職予定の印は出ていません（一覧は PB の写しから選べます）。</p> : null}
    </div> : null}
    {trouble ? <small className="staff-field-note is-warning" role="status">{copyLinkTroubleMessage(trouble)}</small> : null}
  </div>;
}
