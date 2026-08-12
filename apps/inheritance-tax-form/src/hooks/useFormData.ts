/**
 * 申告書全体の入力状態。
 *
 * GridForm は `g(field)` / `u(field, value)` の2関数だけで値をやり取りするため、
 * フィールド名の接頭辞で保存先を振り分ける:
 *   `c.xxx`  … 共通欄（被相続人・提出先・第2表㋭）
 *   `t.xxx`  … 自動計算欄（「各人の合計」列と様式間の転記欄・書き込み不可）
 *   `h0.xxx` … 財産を取得した人 0番目（第1表に載る人）
 *   `h1.xxx` … 以降は第1表（続）に2人ずつ
 *   `l0.xxx` … 第2表の法定相続人 0番目
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeAll, type Values } from '../lib/calc';
import { LAWFUL_ROWS } from '../forms/table2';

export interface FormData {
  common: Values;
  heirs: Values[];
  /** 第2表の法定相続人（様式の行数と同じ固定長） */
  lawful: Values[];
  /** 使用する様式のID（印刷対象） */
  used: string[];
}

const STORAGE_KEY = 'inheritance-tax-form:v1';
/** 第1表に1人＋第1表（続）10枚に2人ずつ */
const MAX_HEIRS = 21;
/** 既定で使用する様式 */
const DEFAULT_USED = ['table1', 'table2', 'table11'];

const emptyLawful = (): Values[] => Array.from({ length: LAWFUL_ROWS }, () => ({}));
const emptyData = (): FormData => ({ common: {}, heirs: [{}], lawful: emptyLawful(), used: [...DEFAULT_USED] });

/** 財産を取得した人 i 番目のフィールド接頭辞 */
export const heirPrefix = (i: number): string => `h${i}.`;
/** アクセシブル名・画面表示に使う呼び名 */
export const heirLabel = (i: number): string => `${i + 1}人目`;

/** 第1表1枚＋（続）は2人ずつ */
export const pageCount = (heirs: number): number => 1 + Math.ceil(Math.max(0, heirs - 1) / 2);

function isFormData(value: unknown): value is Partial<FormData> {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Partial<FormData>;
  return typeof data.common === 'object' && data.common !== null && Array.isArray(data.heirs);
}

/** 保存済み・読込データを現在の形（行数・様式一覧）に揃える */
function normalize(parsed: Partial<FormData>): FormData {
  const lawful = emptyLawful().map((row, i) => parsed.lawful?.[i] ?? row);
  return {
    common: parsed.common ?? {},
    heirs: parsed.heirs && parsed.heirs.length > 0 ? parsed.heirs : [{}],
    lawful,
    used: Array.isArray(parsed.used) ? parsed.used : [...DEFAULT_USED],
  };
}

function loadStored(): FormData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed: unknown = JSON.parse(raw);
    if (!isFormData(parsed)) return emptyData();
    return normalize(parsed);
  } catch {
    return emptyData();
  }
}

/** `h0.v1` を ['h0', 'v1'] に分ける */
function splitField(field: string): [string, string] {
  const dot = field.indexOf('.');
  return dot < 0 ? ['c', field] : [field.slice(0, dot), field.slice(dot + 1)];
}

export function useFormData() {
  const [data, setData] = useState<FormData>(loadStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // 容量超過や privacy モードでは保存を諦める（入力自体は続けられる）
    }
  }, [data]);

  const computed = useMemo(() => computeAll(data.common, data.heirs, data.lawful, data.used), [data]);

  const g = useCallback((field: string): string => {
    const [scope, key] = splitField(field);
    if (scope === 't') return computed.totals[key] ?? '';
    if (scope === 'c') return data.common[key] ?? '';
    const index = Number(scope.slice(1));
    if (scope.startsWith('l')) return computed.lawful[index]?.[key] ?? '';
    return computed.heirs[index]?.[key] ?? '';
  }, [data, computed]);

  const u = useCallback((field: string, value: string): void => {
    const [scope, key] = splitField(field);
    if (scope === 't') return; // 自動計算欄は書き込み不可
    const index = Number(scope.slice(1));
    setData((prev) => {
      if (scope === 'c') return { ...prev, common: { ...prev.common, [key]: value } };
      if (scope.startsWith('l')) {
        if (!Number.isInteger(index) || index < 0 || index >= prev.lawful.length) return prev;
        const lawful = [...prev.lawful];
        lawful[index] = { ...(lawful[index] ?? {}), [key]: value };
        return { ...prev, lawful };
      }
      // 第1表（続）は必ず2人分が印刷されるため、右側の未作成の1人は入力時に作る
      if (!Number.isInteger(index) || index < 0 || index > prev.heirs.length || index >= MAX_HEIRS) return prev;
      const next = { ...(prev.heirs[index] ?? {}), [key]: value };
      // ⑧あん分割合は自動計算だが端数調整のため手入力を優先する。空に戻したら自動へ復帰。
      if (key === 'v8') {
        if (value.trim() === '') delete next.v8m;
        else next.v8m = '1';
      }
      const heirs = [...prev.heirs];
      heirs[index] = next;
      return { ...prev, heirs };
    });
  }, []);

  const addHeir = useCallback(() => {
    setData((prev) => (prev.heirs.length >= MAX_HEIRS ? prev : { ...prev, heirs: [...prev.heirs, {}] }));
  }, []);

  const removeHeir = useCallback(() => {
    setData((prev) => (prev.heirs.length <= 1 ? prev : { ...prev, heirs: prev.heirs.slice(0, -1) }));
  }, []);

  /** 様式を「使用する／しない」で切り替える（印刷対象の出し入れ） */
  const toggleUsed = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      used: prev.used.includes(id) ? prev.used.filter((x) => x !== id) : [...prev.used, id],
    }));
  }, []);

  const reset = useCallback(() => setData(emptyData()), []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `相続税申告書_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const importJson = useCallback(async (file: File): Promise<boolean> => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isFormData(parsed)) return false;
      setData(normalize(parsed));
      return true;
    } catch {
      return false;
    }
  }, []);

  return { data, g, u, addHeir, removeHeir, toggleUsed, reset, exportJson, importJson, maxHeirs: MAX_HEIRS };
}
