/**
 * 申告書全体の入力状態を持つフック。
 *
 * 保存する形そのもの（フィールド名の振り分け・保存形式の移行）は `lib/storedData.ts` にある。
 * ここは画面からの読み書き（`g` / `u`）と、計算・並べ替え・人物や明細の増減を受け持つ。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DETAIL_AUTO_VALUE, DETAIL_SOURCE, TABLE11F1_UNIT,
  computeAll, detailAutoValue, detailShareAmounts, detailShareCount, detailUnit,
  isEmptyDetail, moved, type Values,
} from '../lib/calc';
import {
  HEIR_ID, detailHeirRefKind, heirRefMap, isTotalsHeirRef, newHeirId, resolveHeirRefs,
} from '../lib/heirRef';
import {
  MAX_HEIRS, emptyData, isFormData, loadStored, normalize, saveStored, withDetailForms,
  type FormData,
} from '../lib/storedData';

/** 財産を取得した人 i 番目のフィールド接頭辞 */
export const heirPrefix = (i: number): string => `h${i}.`;
/** アクセシブル名・画面表示に使う呼び名 */
export const heirLabel = (i: number): string => `${i + 1}人目`;
/** 接頭辞（'h0.'）から何人目かを取り出す。人物ブロックのクリックは接頭辞で返ってくる */
export const heirIndex = (prefix: string): number => Number(prefix.slice(1, -1));

/** 付表 form の i 番目の明細のフィールド接頭辞 */
export const detailPrefix = (form: string, i: number): string => `${form}#${i}.`;
/** アクセシブル名に使う呼び名 */
export const detailLabel = (i: number): string => `明細${i + 1}`;
/** `h0.v1` を ['h0', 'v1'] に分ける */
function splitField(field: string): [string, string] {
  const dot = field.indexOf('.');
  return dot < 0 ? ['c', field] : [field.slice(0, dot), field.slice(dot + 1)];
}

/** 項番の欄名（`no0`・`no3` …）から、その組の先頭の取得者の添字を取り出す */
function shareBase(key: string): number | null {
  const found = /^no(\d+)$/.exec(key);
  return found ? Number(found[1]) : null;
}

/**
 * 付表の項番。財産の並び順から決まる（空欄の財産は数えない）ので入力できない。
 * 続きの組（`base` が3以上）は、そこに取得者が入ったときだけ番号を出す。
 * 4人目を書くために先回りして空けてある組に番号だけ浮かぶのを避けるため。
 */
function detailNo(rows: readonly Values[], index: number, base: number): string {
  const item = rows[index];
  if (isEmptyDetail(item)) return '';
  if (base > 0 && base >= detailShareCount(item!)) return '';
  let no = 0;
  for (let i = 0; i <= index; i += 1) if (!isEmptyDetail(rows[i])) no += 1;
  return String(no);
}

/** `table11f1#3` を ['table11f1', 3] に分ける（付表以外は null） */
function splitDetailScope(scope: string): [string, number] | null {
  const hash = scope.indexOf('#');
  if (hash < 0) return null;
  const index = Number(scope.slice(hash + 1));
  return Number.isInteger(index) && index >= 0 ? [scope.slice(0, hash), index] : null;
}

export function useFormData() {
  const [data, setData] = useState<FormData>(loadStored);

  useEffect(() => { saveStored(data); }, [data]);

  /**
   * 計算に渡す前に、氏名欄が持つIDを「何人目か」へ直す。
   * 位置に依存する計算（第4表・第6表・第7表・付表の集計）はここより下では今までどおり。
   */
  const resolved = useMemo(
    () => resolveHeirRefs(data.common, data.heirs, data.details),
    [data.common, data.heirs, data.details],
  );

  const computed = useMemo(
    () => computeAll(resolved.common, data.heirs, data.used, resolved.details),
    [resolved, data.heirs, data.used],
  );

  /** 画面へ返すときの読み替え（計算結果の中の人の番号は、選択肢に合わせてIDへ戻す） */
  const refs = useMemo(() => heirRefMap(data.heirs), [data.heirs]);

  /** 明細が入っているため「使用する」の印を外せない様式（付表とその合計表の第11表） */
  const requiredForms = useMemo(() => withDetailForms([], data.details), [data.details]);

  /**
   * 用紙に載せる明細（保存した明細の後ろに、他の様式から転記された明細を続けたもの）。
   * 転記行は読み取り専用で、直すときは転記元の様式を開く。
   */
  const detailRows = useMemo(() => {
    const forms = Object.keys(computed.derived);
    if (forms.length === 0) return data.details;
    const out = { ...data.details };
    for (const form of forms) out[form] = [...(data.details[form] ?? []), ...computed.derived[form]!];
    return out;
  }, [data.details, computed.derived]);

  const g = useCallback((field: string): string => {
    const [scope, key] = splitField(field);
    if (scope === 't') {
      const value = computed.totals[key] ?? '';
      return isTotalsHeirRef(key) ? refs.toId(value) : value;
    }
    if (scope === 'c') return data.common[key] ?? '';
    const detail = splitDetailScope(scope);
    if (detail) {
      const [form, index] = detail;
      const rows = detailRows[form] ?? [];
      const base = shareBase(key);
      if (base !== null) return detailNo(rows, index, base);
      const item = rows[index];
      if (item === undefined) return '';
      // 転記された明細は計算済み（人も番号のまま）なので、そのまま出す
      if (item[DETAIL_SOURCE] !== undefined) return item[key] ?? '';
      // 用紙の「単価（円）又は倍数」は保存欄ではなく、路線価・倍数・調整から組み立てる
      if (key === TABLE11F1_UNIT) return detailUnit(item) ?? '';
      // 価額は元になる欄（面積×単価など）がそろっていれば自動計算に切り替わる
      if (key === 'value' || key === DETAIL_AUTO_VALUE) {
        const auto = detailAutoValue(form, item);
        if (key === DETAIL_AUTO_VALUE) return auto === undefined ? '' : '1';
        if (auto !== undefined) return auto;
      }
      // 取得者ごとの価額は、取り分の割合が入っていれば按分で決まる
      const share = /^amount(\d+)$/.exec(key);
      if (share !== null) {
        const amount = detailShareAmounts(form, item)[Number(share[1])];
        if (amount !== undefined) return amount;
      }
      // 取得者は用紙に「何人目か」を印字する（画面の選択肢はIDのままなので、ここでだけ直す）
      const value = item[key] ?? '';
      return detailHeirRefKind(key) === 'number' ? refs.toNo(value) : value;
    }
    return computed.heirs[Number(scope.slice(1))]?.[key] ?? '';
  }, [data, detailRows, computed, refs]);

  const u = useCallback((field: string, value: string): void => {
    const [scope, key] = splitField(field);
    if (scope === 't') return; // 自動計算欄は書き込み不可
    const detail = splitDetailScope(scope);
    if (detail && shareBase(key) !== null) return; // 付表の項番は並び順から決まるので書き込み不可
    const index = Number(scope.slice(1));
    setData((prev) => {
      if (scope === 'c') return { ...prev, common: { ...prev.common, [key]: value } };
      if (detail) {
        const [form, i] = detail;
        // 価額は用紙から直接は書けない。自動計算か直接入力かの選択も含めて入力画面に一本化してある
        if (key === 'value') return prev;
        // 明細は用紙の枚数だけ表示するので、未作成の行は入力時に作る
        const rows = [...(prev.details[form] ?? [])];
        // 転記行は保存行の後ろに並ぶ。その添字へ書くと転記行を保存行で押しのけてしまう
        if (i >= rows.length && (computed.derived[form]?.length ?? 0) > 0) return prev;
        while (rows.length <= i) rows.push({});
        rows[i] = { ...rows[i]!, [key]: value };
        return { ...prev, details: { ...prev.details, [form]: rows } };
      }
      // 第1表（続）は必ず2人分が印刷されるため、右側の未作成の1人は入力時に作る
      if (!Number.isInteger(index) || index < 0 || index > prev.heirs.length || index >= MAX_HEIRS) return prev;
      const current = prev.heirs[index] ?? { [HEIR_ID]: newHeirId() };
      const next = { ...current, [key]: value };
      const heirs = [...prev.heirs];
      heirs[index] = next;
      return { ...prev, heirs };
    });
  }, [computed.derived]);

  const addHeir = useCallback(() => {
    setData((prev) => (prev.heirs.length >= MAX_HEIRS
      ? prev
      : { ...prev, heirs: [...prev.heirs, { [HEIR_ID]: newHeirId() }] }));
  }, []);

  /**
   * 「財産を取得した人」を1人消す。
   * 各表の氏名欄はIDを持っているので、後ろの人がずれても指す相手は変わらない。
   * 消した人を指していた欄は行き先が無くなるため、空欄として表示される。
   */
  const removeHeir = useCallback((index: number) => {
    setData((prev) => (prev.heirs.length <= 1 || index < 0 || index >= prev.heirs.length
      ? prev
      : { ...prev, heirs: prev.heirs.filter((_, i) => i !== index) }));
  }, []);

  /** 「財産を取得した人」の並びを入れ替える（用紙に載る順と番号が変わる。参照は付いてくる） */
  const moveHeir = useCallback((from: number, to: number) => {
    setData((prev) => {
      const { heirs } = prev;
      if (from === to || from < 0 || to < 0 || from >= heirs.length || to >= heirs.length) return prev;
      return { ...prev, heirs: moved(heirs, from, to) };
    });
  }, []);

  /**
   * 「財産を取得した人」1人分を丸ごと差し替える（人物の画面の「取消」で使う）。
   * 人物の画面は打つそばから書き込むので、取り消すには開いた時に控えたオブジェクトを戻す。
   * 欄を数え上げて組み立て直すのではないため、他の表が入れた計算値も控えたまま戻る。
   * IDだけは今の人のものを残す（控えた時点でまだIDが無くても、参照の指す先を失わないため）。
   */
  const setHeir = useCallback((index: number, values: Values) => {
    setData((prev) => {
      const current = prev.heirs[index];
      if (!Number.isInteger(index) || index < 0 || current === undefined) return prev;
      const heirs = [...prev.heirs];
      heirs[index] = { ...values, [HEIR_ID]: current[HEIR_ID] ?? values[HEIR_ID] ?? newHeirId() };
      return { ...prev, heirs };
    });
  }, []);

  /**
   * 付表の明細1件を丸ごと差し替える（別画面の「確定」）。
   * 入力は1件ずつ別画面で行い、確定するまで申告内容には反映しない。
   * `index` が末尾より後なら新しい明細として足す。
   */
  const setDetailItem = useCallback((form: string, index: number, item: Values) => {
    setData((prev) => {
      const rows = [...(prev.details[form] ?? [])];
      while (rows.length <= index) rows.push({});
      // 空欄は保存しない（項番は「空でない明細」の並び順から決まるため）
      rows[index] = Object.fromEntries(Object.entries(item).filter(([, value]) => value.trim() !== ''));
      const details = { ...prev.details, [form]: rows };
      return { ...prev, details, used: withDetailForms(prev.used, details) };
    });
  }, []);

  /** 付表の明細1件を消す（以降の項番は自動で繰り上がる） */
  const removeDetailItem = useCallback((form: string, index: number) => {
    setData((prev) => {
      const rows = prev.details[form] ?? [];
      if (index < 0 || index >= rows.length) return prev;
      return { ...prev, details: { ...prev.details, [form]: rows.filter((_, i) => i !== index) } };
    });
  }, []);

  /**
   * 明細の並びを入れ替える（項番は並び順そのものなので、動かせば番号も振り直される）。
   *
   * @param remapCommon 共通欄が行を番号で名指ししている様式（第14表の確認欄）だけ渡す。
   *   共通欄と明細を1回の更新でまとめて直せるのがここしかないため。
   */
  const moveDetailItem = useCallback((
    form: string, from: number, to: number,
    remapCommon?: (common: Values, indexOf: (index: number) => number) => Values,
  ) => {
    setData((prev) => {
      const rows = prev.details[form] ?? [];
      if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return prev;
      const details = { ...prev.details, [form]: moved(rows, from, to) };
      if (remapCommon === undefined) return { ...prev, details };
      /** 動かした1件だけが行き先へ跳び、間に挟まれた行は1つずつ寄る */
      const indexOf = (index: number): number => {
        if (index === from) return to;
        if (from < index && index <= to) return index - 1;
        if (to <= index && index < from) return index + 1;
        return index;
      };
      return { ...prev, common: remapCommon(prev.common, indexOf), details };
    });
  }, []);

  /** 付表の明細を1枚分（`rows` 件）増やす */
  const addDetailPage = useCallback((form: string, rows: number) => {
    setData((prev) => {
      const current = prev.details[form] ?? [];
      const next = [...current, ...Array.from({ length: rows }, (): Values => ({}))];
      return { ...prev, details: { ...prev.details, [form]: next } };
    });
  }, []);

  /**
   * 明細の件数をちょうど `count` 件にする。
   * 枚数ではなく件数で増減する様式（第11・11の2表の付表1と、その別表1）用。
   * 表示件数は「配列の長さ」ではなく「様式が持つ最低枚数」との大きい方なので、
   * 未作成（長さ0）の状態から ＋ を押したときも飛ばずに1件だけ増える。
   */
  const setDetailCount = useCallback((form: string, count: number) => {
    setData((prev) => {
      const current = prev.details[form] ?? [];
      if (count <= 0 || count === current.length) return prev;
      const next = count < current.length
        ? current.slice(0, count)
        : [...current, ...Array.from({ length: count - current.length }, (): Values => ({}))];
      return { ...prev, details: { ...prev.details, [form]: next } };
    });
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

  return {
    data, detailRows, g, u, addHeir, removeHeir, moveHeir, setHeir, addDetailPage, setDetailCount, setDetailItem, removeDetailItem, moveDetailItem,
    toggleUsed, reset, exportJson, importJson, requiredForms, maxHeirs: MAX_HEIRS,
  };
}
