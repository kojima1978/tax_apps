// 案件（会社ごとの保存）の状態と自動保存。
//
// 入力そのものは今までどおり useFormData が持ち、localStorage へ保存し続ける
// （案件を選んでいない間も入力が消えないように）。このフックはそれに加えて、
// 選んでいる案件へ一定間隔で書き戻す係。DBへ入れておくと会社を切り替えられ、
// docker/scripts/backup.sh の日次バックアップにも含まれる。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hasAnyInput } from '@/hooks/useFormData';
import { type FormData, type TableProps, initialFormData } from '@/types/form';
import * as api from './api';
import { type CaseSaveStatus, caseLabelsOf } from './caseLabels';
import { markMigrationAsked, migrationAsked, shouldOfferMigration } from './migration';

/** 開いている案件。リロードしても同じ案件の続きから始められるように控える。 */
const CURRENT_CASE_KEY = 'stock-valuation-form-case-id';

/**
 * 入力が止まってから書き戻すまでの間隔。打鍵ごとに送ると回数が多すぎ、長すぎると
 * タブを閉じたぶんが案件に入らない（この端末の localStorage には残る）。
 */
const AUTO_SAVE_DELAY_MS = 3000;

interface UseCasesOptions {
  formData: FormData;
  getField: TableProps['getField'];
  /** 案件を開く・作り直すときに帳票の中身を入れ替える。 */
  replaceAll: (data: FormData) => void;
  /**
   * 案件に入れていない入力を捨てる直前の確認（JSONへの退避も呼び出し側で行う）。
   * false なら操作を中止する。案件に紐づいている間は呼ばない（サーバに残るため）。
   */
  confirmDiscard: () => boolean;
}

function readStoredCaseId(): number | null {
  const stored = Number(localStorage.getItem(CURRENT_CASE_KEY));
  return Number.isInteger(stored) && stored > 0 ? stored : null;
}

export function useCases({ formData, getField, replaceAll, confirmDiscard }: UseCasesOptions) {
  const [cases, setCases] = useState<api.CaseSummary[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(readStoredCaseId);
  const [status, setStatus] = useState<CaseSaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 端末にだけ残っている入力を案件へ移すかの誘導（起動時に一度だけ）。
  const [migrationOffer, setMigrationOffer] = useState(false);

  // 起動時の判定で最新の入力を見るための控え（判定のたびに effect を回さない）。
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // サーバへ最後に送った内容。同じ間は送らない（案件を開いた直後に送り返さないため）。
  const syncedRef = useRef<string | null>(null);
  // 待機中の書き戻し。案件を切り替える前などに先に送り切るため保持する。
  const pendingRef = useRef<{ id: number; input: api.CaseInput; snapshot: string } | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (currentId === null) localStorage.removeItem(CURRENT_CASE_KEY);
    else localStorage.setItem(CURRENT_CASE_KEY, String(currentId));
  }, [currentId]);

  /** 失敗しても画面は落とさず、ダイアログにメッセージを出すだけにする。 */
  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | null> => {
    try {
      setError(null);
      return await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return null;
    }
  }, []);

  const reload = useCallback(
    (includeArchived = false) => run(async () => {
      const list = await api.fetchCases(includeArchived);
      setCases(list);
      return list;
    }),
    [run],
  );

  // 起動時。控えていた案件が消えていたら（別の画面で削除した等）選択を外す。
  useEffect(() => {
    void (async () => {
      const list = await reload();
      if (list === null) return;

      const storedId = readStoredCaseId();
      const keptId = storedId !== null && list.some((item) => item.id === storedId) ? storedId : null;
      if (keptId !== storedId) setCurrentId(keptId);

      setMigrationOffer(shouldOfferMigration({
        cases: list,
        currentId: keptId,
        hasInput: hasAnyInput(formDataRef.current),
        asked: migrationAsked(),
      }));
    })();
  }, [reload]);

  /** 待機中の書き戻しを送り切る。案件の切替・複製の前に呼ぶ。 */
  const flush = useCallback(async () => {
    const pending = pendingRef.current;
    if (pending === null) return;
    pendingRef.current = null;
    window.clearTimeout(timerRef.current);

    setStatus('saving');
    try {
      const saved = await api.updateCase(pending.id, pending.input);
      syncedRef.current = pending.snapshot;
      setSavedAt(new Date(saved.updatedAt));
      setStatus('saved');
      setError(null);
      setCases((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  // 入力の変化をまとめてから案件へ書き戻す。
  useEffect(() => {
    if (currentId === null) return;

    const snapshot = JSON.stringify(formData);
    if (snapshot === syncedRef.current) return;

    pendingRef.current = {
      id: currentId,
      input: { ...caseLabelsOf(getField), data: formData },
      snapshot,
    };
    setStatus('pending');
    timerRef.current = window.setTimeout(() => { void flush(); }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(timerRef.current);
  }, [currentId, flush, formData, getField]);

  /**
   * 案件と帳票を結び付ける。`snapshot` はサーバ側と同じと分かっている内容で、
   * null なら（読み込んだデータを正規化した直後などで）改めて書き戻させる。
   */
  const link = useCallback((item: api.CaseSummary, snapshot: string | null) => {
    syncedRef.current = snapshot;
    pendingRef.current = null;
    window.clearTimeout(timerRef.current);
    setCurrentId(item.id);
    setSavedAt(new Date(item.updatedAt));
    setStatus(snapshot === null ? 'pending' : 'saved');
  }, []);

  const openCase = useCallback(
    (id: number) => run(async () => {
      if (currentId === null && !confirmDiscard()) return null;
      await flush();
      const detail = await api.fetchCase(id);
      replaceAll(detail.data);
      // 読み込んだ内容は正規化で整うことがあるので、整った側を書き戻させる。
      link(detail, null);
      return detail;
    }),
    [confirmDiscard, currentId, flush, link, replaceAll, run],
  );

  /** いま入力されている内容を新しい案件にする（案件へ移す最初の一歩）。 */
  const createFromCurrent = useCallback(
    () => run(async () => {
      await flush();
      const snapshot = JSON.stringify(formData);
      const created = await api.createCase({ ...caseLabelsOf(getField), data: formData });
      link(created, snapshot);
      await reload();
      return created;
    }),
    [flush, formData, getField, link, reload, run],
  );

  /** 白紙の案件を作って切り替える。 */
  const createEmpty = useCallback(
    () => run(async () => {
      if (currentId === null && !confirmDiscard()) return null;
      await flush();
      const created = await api.createCase({ companyName: '', taxPeriod: '', data: initialFormData });
      replaceAll(initialFormData);
      link(created, null);
      await reload();
      return created;
    }),
    [confirmDiscard, currentId, flush, link, reload, replaceAll, run],
  );

  /** 読み込んだJSONを新しい案件にする（これまでJSONで持ち回っていた会社を取り込む口）。 */
  const createFromJson = useCallback(
    (data: FormData) => run(async () => {
      if (currentId === null && !confirmDiscard()) return null;
      await flush();
      const labels = caseLabelsOf((table, field) => data[table]?.[field] ?? '');
      const created = await api.createCase({ ...labels, data });
      replaceAll(data);
      link(created, null);
      await reload();
      return created;
    }),
    [confirmDiscard, currentId, flush, link, reload, replaceAll, run],
  );

  const duplicate = useCallback(
    (id: number, includeArchived = false) => run(async () => {
      // 複製元が開いている案件なら、書き戻し待ちを送ってから複製する（古い内容を複製しない）。
      await flush();
      const created = await api.duplicateCase(id);
      await reload(includeArchived);
      return created;
    }),
    [flush, reload, run],
  );

  const archive = useCallback(
    (id: number, includeArchived = false) => run(async () => {
      if (id === currentId) {
        pendingRef.current = null;
        window.clearTimeout(timerRef.current);
        setCurrentId(null);
        setStatus('idle');
      }
      await api.archiveCase(id);
      await reload(includeArchived);
    }),
    [currentId, reload, run],
  );

  const restore = useCallback(
    (id: number, includeArchived = true) => run(async () => {
      await api.restoreCase(id);
      await reload(includeArchived);
    }),
    [reload, run],
  );

  const purge = useCallback(
    (id: number, includeArchived = true) => run(async () => {
      await api.purgeCase(id);
      await reload(includeArchived);
    }),
    [reload, run],
  );

  /**
   * 誘導に「案件として保存する」で答えたとき。作れなかったときは印を付けず、
   * 次に開いたときにもう一度訊く（取り残しに気づく機会を潰さない）。
   */
  const acceptMigration = useCallback(async () => {
    const created = await createFromCurrent();
    if (created === null) return null;
    markMigrationAsked();
    setMigrationOffer(false);
    return created;
  }, [createFromCurrent]);

  /** 誘導を断ったとき。入力はこの端末にそのまま残し、以後は訊かない。 */
  const declineMigration = useCallback(() => {
    markMigrationAsked();
    setMigrationOffer(false);
  }, []);

  const currentCase = useMemo(
    () => cases.find((item) => item.id === currentId) ?? null,
    [cases, currentId],
  );

  return {
    cases,
    currentId,
    currentCase,
    status,
    savedAt,
    error,
    migrationOffer,
    acceptMigration,
    declineMigration,
    reload,
    openCase,
    createFromCurrent,
    createEmpty,
    createFromJson,
    duplicate,
    archive,
    restore,
    purge,
  };
}

export type CaseStore = ReturnType<typeof useCases>;
