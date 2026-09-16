"use client";

import { useMemo, useRef, useState } from "react";
import {
  type FamilyMember,
  type FamilyMemberDraft,
  defaultSpecialTaxAddition,
  formatShareText,
  legalShareFor,
  parseShareText,
} from "@/lib/family";

/**
 * 編集中の1人分。法定相続分は「1/2」の文字のまま持ち、保存時に分子・分母へ分ける。
 * 税法上の法定相続分は民法上と同じことがほとんどなので、既定では民法上の値をそのまま使う。
 */
export type FamilyEditRow = Pick<FamilyMemberDraft, "id" | "name" | "nameKana" | "relationship" | "acquisitionReason" | "specialTaxAddition" | "disabilityCategory" | "birthDate"> & {
  key: string;
  civilShare: string;
  taxShare: string;
  taxSameAsCivil: boolean;
};

export type RemovedFamilyRow = { row: FamilyEditRow; index: number };

const sameShare = (a: string, b: string) => {
  const left = parseShareText(a);
  const right = parseShareText(b);
  if (left === "invalid" || right === "invalid") return a.trim() === b.trim();
  return left?.numerator === right?.numerator && left?.denominator === right?.denominator;
};

function rowFromMember(member: FamilyMember): FamilyEditRow {
  const civilShare = formatShareText(member.civilShareNumerator, member.civilShareDenominator);
  const taxShare = formatShareText(member.taxShareNumerator, member.taxShareDenominator);
  return {
    key: `member-${member.id}`,
    id: member.id,
    name: member.name,
    nameKana: member.nameKana,
    relationship: member.relationship,
    acquisitionReason: member.acquisitionReason,
    specialTaxAddition: member.specialTaxAddition,
    disabilityCategory: member.disabilityCategory,
    birthDate: member.birthDate,
    civilShare,
    taxSameAsCivil: sameShare(civilShare, taxShare),
    taxShare: sameShare(civilShare, taxShare) ? "" : taxShare,
  };
}

/** 変更の有無を比べるための形。行の key と、税法上の値の持ち方の違いは比べない。 */
const comparable = (rows: FamilyEditRow[]) => JSON.stringify(rows.map(({ key, taxShare, taxSameAsCivil, ...row }) => {
  void key;
  return { ...row, taxShare: taxSameAsCivil ? row.civilShare : taxShare };
}));

/** 保存する形へ変換する。読めない法定相続分があれば、何人目のどの欄かを添えて例外にする。 */
export function familyDraftsFromRows(rows: FamilyEditRow[]): FamilyMemberDraft[] {
  return rows.map((row, sortOrder) => {
    const label = `${sortOrder + 1}人目（${row.name.trim() || "氏名未入力"}）`;
    const parse = (text: string, field: string) => {
      const share = parseShareText(text);
      if (share === "invalid") throw new Error(`${label}の${field}は「1/2」の形で入力してください。`);
      return share;
    };
    const civil = parse(row.civilShare, "民法上の法定相続分");
    const tax = row.taxSameAsCivil ? civil : parse(row.taxShare, "税法上の法定相続分");
    return {
      ...(row.id === undefined ? {} : { id: row.id }),
      name: row.name,
      nameKana: row.nameKana,
      relationship: row.relationship,
      acquisitionReason: row.acquisitionReason,
      civilShareNumerator: civil?.numerator ?? null,
      civilShareDenominator: civil?.denominator ?? null,
      taxShareNumerator: tax?.numerator ?? null,
      taxShareDenominator: tax?.denominator ?? null,
      specialTaxAddition: row.specialTaxAddition,
      disabilityCategory: row.disabilityCategory,
      birthDate: row.birthDate,
      note: "",
      sortOrder,
    };
  });
}

/** 自動計算の結果。相続で取得する人だけに法定相続分を付け、税法上は民法上と同じにする。 */
function calculatedRows(rows: FamilyEditRow[]) {
  return rows.map((row) => {
    const share = row.acquisitionReason === "INHERITANCE" ? legalShareFor(row, rows) : null;
    return { ...row, civilShare: formatShareText(share?.numerator ?? null, share?.denominator ?? null), taxShare: "", taxSameAsCivil: true };
  });
}

/** 入力済みの値のうち、自動計算で別の値に書き換わる欄の数。 */
function overwriteCount(before: FamilyEditRow[], after: FamilyEditRow[]) {
  return before.reduce((count, row, index) => {
    const next = after[index];
    const civilChanged = row.civilShare.trim() !== "" && !sameShare(row.civilShare, next.civilShare);
    const taxChanged = !row.taxSameAsCivil && row.taxShare.trim() !== "" && !sameShare(row.taxShare, next.civilShare);
    return count + Number(civilChanged) + Number(taxChanged);
  }, 0);
}

export const MAX_FAMILY_ROWS = 20;

/** 家族情報の編集ダイアログの状態。行の追加・並べ替え・削除（元に戻す）・自動計算をまとめて持つ。 */
export function useFamilyEditor(members: FamilyMember[]) {
  const [initialRows] = useState(() => members.filter((member) => member.relationship !== "SELF").map(rowFromMember));
  const [rows, setRows] = useState(initialRows);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [pendingOverwrite, setPendingOverwrite] = useState<number | null>(null);
  const nextKey = useRef(0);

  const initialComparable = useMemo(() => comparable(initialRows), [initialRows]);
  const dirty = useMemo(() => comparable(rows) !== initialComparable, [rows, initialComparable]);

  const update = (key: string, patch: Partial<FamilyEditRow>) => {
    setRows((current) => current.map((row) => {
      if (row.key !== key) return row;
      // 続柄を選び直したら、2割加算はその続柄の原則に合わせる（あとから手で変えられる）。
      const relationshipPatch = patch.relationship && patch.relationship !== row.relationship
        ? { specialTaxAddition: defaultSpecialTaxAddition(patch.relationship) }
        : {};
      return { ...row, ...relationshipPatch, ...patch };
    }));
  };

  const add = () => {
    if (rows.length >= MAX_FAMILY_ROWS) return;
    nextKey.current += 1;
    const key = `new-${nextKey.current}`;
    setRows((current) => [...current, {
      key,
      name: "",
      nameKana: "",
      relationship: "CHILD",
      acquisitionReason: "INHERITANCE",
      specialTaxAddition: defaultSpecialTaxAddition("CHILD"),
      disabilityCategory: "NONE",
      birthDate: null,
      civilShare: "",
      taxShare: "",
      taxSameAsCivil: true,
    }]);
    setFocusKey(key);
  };

  const move = (index: number, direction: -1 | 1) => {
    setRows((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (key: string): RemovedFamilyRow | null => {
    const index = rows.findIndex((row) => row.key === key);
    if (index < 0) return null;
    setRows((current) => current.filter((row) => row.key !== key));
    return { row: rows[index], index };
  };

  const restore = ({ row, index }: RemovedFamilyRow) => {
    setRows((current) => current.some((item) => item.key === row.key)
      ? current
      : [...current.slice(0, index), row, ...current.slice(index)]);
    setFocusKey(row.key);
  };

  const applyCalculation = () => {
    setRows(calculatedRows);
    setPendingOverwrite(null);
  };

  /** 手で入れた値が書き換わるときは、すぐには計算せず件数を示して確認を待つ。 */
  const requestCalculation = () => {
    const count = overwriteCount(rows, calculatedRows(rows));
    if (count > 0) setPendingOverwrite(count);
    else applyCalculation();
  };

  return {
    rows,
    dirty,
    focusKey,
    clearFocusKey: () => setFocusKey(null),
    pendingOverwrite,
    update,
    add,
    move,
    remove,
    restore,
    requestCalculation,
    confirmCalculation: applyCalculation,
    cancelCalculation: () => setPendingOverwrite(null),
  };
}
