// 案件（会社ごとの保存）の状態と自動保存。
//
// 入力そのものは今までどおり useFormData が持ち、localStorage へ保存し続ける
// （サーバへ届かない間も入力が消えないように）。このフックはそれに加えて、
// 案件へ一定間隔で書き戻す係。DBへ入れておくと会社を切り替えられ、
// docker/scripts/backup.sh の日次バックアップにも含まれる。
//
// 案件は自動で作る。以前は画面右上の「案件」から作るまでDBに何も入らず、入力は
// この端末の localStorage にしか無かった（＝バックアップの対象外）。作り忘れに
// 気づく機会が無い形だったので、入力があって案件に紐づいていなければ自動で作る。
// 通常は案件一覧（CasesPage）で会社を選んでから帳票に入るので、自動作成は
// 「一覧を通らずに入力してしまったとき」の安全網。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { completeFormData, hasAnyInput } from '@/hooks/useFormData';
import { rolloverFormData } from '@/hooks/rollover';
import { type FormData, type TableProps, initialFormData } from '@/types/form';
import * as api from './api';
import { ADOPT_RETRY_MS, shouldAdoptIntoCase } from './autoAdopt';
import { type CaseSaveStatus, caseLabelsOf } from './caseLabels';
import { type CaseProfile, applyCaseProfile } from './newCase';

/** 開いている案件。リロードしても同じ案件の続きから始められるように控える。 */
const CURRENT_CASE_KEY = 'stock-valuation-form-case-id';

/**
 * その案件を最後に見た時点（updatedAt）。上書きの前提としてサーバへ送る。
 *
 * localStorage に置くのは、画面を閉じても入力は残るため ── 閉じている間に別の端末が
 * 更新していたら、再び開いて自動保存が動いた瞬間にその更新を消してしまう。
 */
const CURRENT_VERSION_KEY = 'stock-valuation-form-case-version';

/**
 * 入力が止まってから書き戻すまでの間隔。打鍵ごとに送ると回数が多すぎ、長すぎると
 * タブを閉じたぶんが案件に入らない（この端末の localStorage には残る）。
 */
const AUTO_SAVE_DELAY_MS = 3000;

/** 帳票の欄から案件名を作る（一覧に出るのは会社名と課税時期だけ）。 */
const labelsOfData = (data: FormData) =>
  caseLabelsOf((table, field) => data[table]?.[field] ?? '');

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
  // ゴミ箱も一覧に出すか。会社一覧と年度一覧の両方から切り替えるので画面ではなくここで持つ
  // （画面ごとに持つと、会社を選んで入った先で切替が元に戻る）。
  const [includeArchived, setIncludeArchivedState] = useState(false);
  const includeArchivedRef = useRef(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 起動時の判定で最新の入力を見るための控え（判定のたびに effect を回さない）。
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // サーバへ最後に送った内容。同じ間は送らない（案件を開いた直後に送り返さないため）。
  const syncedRef = useRef<string | null>(null);
  // 上書きの前提（最後に見た updatedAt）と、ぶつかって保存を止めている印。
  const versionRef = useRef<string | null>(localStorage.getItem(CURRENT_VERSION_KEY));
  const conflictRef = useRef(false);
  // 待機中の書き戻し。案件を切り替える前などに先に送り切るため保持する。
  const pendingRef = useRef<{ id: number; input: api.CaseInput; snapshot: string } | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  // 自動作成の制御（判定は autoAdopt.ts、状態はここ）。
  const adoptingRef = useRef(false);
  const adoptFailedAtRef = useRef<number | null>(null);
  const adoptRetryTimerRef = useRef<number | undefined>(undefined);
  const unlinkedSnapshotRef = useRef<string | null>(null);
  // 失敗したあとの再試行を促す印。打鍵が無くても判定をやり直させるために増やす。
  const [adoptRetryTick, setAdoptRetryTick] = useState(0);

  useEffect(() => {
    if (currentId === null) localStorage.removeItem(CURRENT_CASE_KEY);
    else localStorage.setItem(CURRENT_CASE_KEY, String(currentId));
  }, [currentId]);

  const setVersion = useCallback((value: string | null) => {
    versionRef.current = value;
    if (value === null) localStorage.removeItem(CURRENT_VERSION_KEY);
    else localStorage.setItem(CURRENT_VERSION_KEY, value);
  }, []);

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
    () => run(async () => {
      const list = await api.fetchCases(includeArchivedRef.current);
      setCases(list);
      return list;
    }),
    [run],
  );

  /** ゴミ箱の表示を切り替えて取り直す。reload の識別子は変えない（起動時の effect を回さない）。 */
  const setIncludeArchived = useCallback((next: boolean) => {
    includeArchivedRef.current = next;
    setIncludeArchivedState(next);
    void reload();
  }, [reload]);

  // 起動時。控えていた案件が消えていたら（別の画面で削除した等）選択を外す。
  useEffect(() => {
    void (async () => {
      const list = await reload();
      if (list === null) return;

      const storedId = readStoredCaseId();
      const keptId = storedId !== null && list.some((item) => item.id === storedId) ? storedId : null;
      // 控えていた案件が消えていれば選択を外す。入力は残っているので自動作成が引き取る。
      if (keptId !== storedId) {
        setCurrentId(keptId);
        setVersion(null);
      }
    })();
  }, [reload, setVersion]);

  /** 待機中の書き戻しを送り切る。案件の切替・複製の前に呼ぶ。 */
  const flush = useCallback(async () => {
    const pending = pendingRef.current;
    if (pending === null) return;
    pendingRef.current = null;
    window.clearTimeout(timerRef.current);

    setStatus('saving');
    try {
      const saved = await api.updateCase(pending.id, pending.input, versionRef.current);
      syncedRef.current = pending.snapshot;
      setVersion(saved.updatedAt);
      setSavedAt(new Date(saved.updatedAt));
      setStatus('saved');
      setError(null);
      setCases((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
    } catch (cause) {
      // ぶつかったら送るのをやめる。3秒ごとに同じ失敗を繰り返しても事態は変わらず、
      // 「読み直す」まで押し続けるだけになる。入力はこの端末に残り続ける。
      if (cause instanceof api.CaseConflictError) {
        conflictRef.current = true;
        setStatus('conflict');
        setError('別の端末で更新されました。この画面の入力はまだ送れていません（ヘッダの「読み直す」）');
        return;
      }
      setStatus('error');
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [setVersion]);

  // 入力の変化をまとめてから案件へ書き戻す。
  useEffect(() => {
    if (currentId === null || conflictRef.current) return;

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
    setVersion(item.updatedAt);
    conflictRef.current = false;
    pendingRef.current = null;
    unlinkedSnapshotRef.current = null;
    adoptFailedAtRef.current = null;
    window.clearTimeout(adoptRetryTimerRef.current);
    window.clearTimeout(timerRef.current);
    setCurrentId(item.id);
    setSavedAt(new Date(item.updatedAt));
    setStatus(snapshot === null ? 'pending' : 'saved');
  }, [setVersion]);

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

  /**
   * 開いている案件をサーバの内容で開き直す（別の端末とぶつかったときの出口）。
   *
   * 送れていない入力は消えるので、先に確認を取る。突き合わせは updatedAt だけで、どの欄が
   * 食い違うかは分からない ── 様式の欄を機械で混ぜると、どちらでもない数字が残りうる。
   */
  const reloadCurrent = useCallback(
    () => run(async () => {
      const id = currentId;
      if (id === null) return null;

      const message = [
        'この案件をサーバの内容で開き直します。',
        '',
        'この画面でまだ保存できていない入力は失われます。',
        '残したい場合は「キャンセル」を選び、先に「JSONで保存」で控えを取ってください。',
      ].join('\n');
      if (!window.confirm(message)) return null;

      const detail = await api.fetchCase(id);
      replaceAll(detail.data);
      // 読み込んだ内容は正規化で整うことがあるので、整った側を書き戻させる。
      link(detail, null);
      return detail;
    }),
    [currentId, link, replaceAll, run],
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

  // 案件に入っていない入力を自動で案件にする（一覧を通らずに入力したときの安全網）。
  // ここが無いと、案件を作らないまま入力したぶんはこの端末の localStorage にしか
  // 残らない（毎日のバックアップにも入らない）。
  useEffect(() => {
    if (!shouldAdoptIntoCase({
      currentId,
      hasInput: hasAnyInput(formData),
      snapshot: JSON.stringify(formData),
      unlinkedSnapshot: unlinkedSnapshotRef.current,
      failedAt: adoptFailedAtRef.current,
      now: Date.now(),
    })) return;

    // 書き戻しと同じ間隔で、入力が止まってから作る（1打鍵ごとに案件を作らない）。
    const timer = window.setTimeout(() => {
      // 作成中にもう一度火が入っても二重に作らない（POST が遅いと起こりうる）。
      if (adoptingRef.current) return;
      adoptingRef.current = true;
      void (async () => {
        try {
          const created = await createFromCurrent();
          if (created !== null) return;
          // 失敗しても入力は localStorage に残る。間隔をおいて自分でもう一度試す
          // （打鍵を待つと、入力し終えてから失敗した回が端末に取り残される）。
          adoptFailedAtRef.current = Date.now();
          setStatus('error');
          window.clearTimeout(adoptRetryTimerRef.current);
          adoptRetryTimerRef.current = window.setTimeout(
            () => setAdoptRetryTick((tick) => tick + 1),
            ADOPT_RETRY_MS,
          );
        } finally {
          adoptingRef.current = false;
        }
      })();
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [adoptRetryTick, createFromCurrent, currentId, formData]);

  /**
   * 新しい案件を作って、帳票をその内容へ切り替える（白紙・JSON読込・翌年度更新で同じ手順）。
   *
   * 先に flush するのは、まだ書き戻せていない入力を**いま開いている案件へ**確定させるため。
   * これが無いと打ちかけの数字が、元の案件ではなく新しい案件の側に紛れ込む。
   *
   * `relatedTo` を渡すと、その案件と同じ会社として作られる（翌年度更新）。
   */
  const createAndSwitch = useCallback(async (data: FormData, relatedTo?: number) => {
    await flush();
    const created = await api.createCase({ ...labelsOfData(data), data }, relatedTo);
    replaceAll(data);
    // 読み込んだ内容は正規化で整うことがあるので、整った側を書き戻させる。
    link(created, null);
    await reload();
    return created;
  }, [flush, link, reload, replaceAll]);

  /**
   * 会社名と課税時期を先に決めて案件を作る（一覧の「新しい案件を作る」「この会社に年分を追加」）。
   *
   * `basedOn` にその会社の一番新しい年分を渡すと、その内容を順送りした形で作り、同じ会社の
   * 年分としてサーバが会社キーを揃える。会社名を打ち直さないので、1文字違いで同じ会社が
   * 2つの塊に割れることが無い（キーを持たない案件同士は会社名で寄せるため。caseGroups.ts）。
   *
   * 順送りは帳票の「翌年度更新」と同じ rolloverFormData。写した内容の正規化は replaceAll が行う。
   */
  const createWithProfile = useCallback(
    (profile: CaseProfile, basedOn: number | null) => run(async () => {
      if (currentId === null && !confirmDiscard()) return null;
      // 写す元は骨格に載せてから渡す。順送りは全部の表がある前提だが、サーバは表の名前を
      // 見ずに保存するので、MCP サーバが作った案件など表が欠けたままのことがある。
      const base = basedOn === null
        ? initialFormData
        : rolloverFormData(completeFormData((await api.fetchCase(basedOn)).data));
      return createAndSwitch(applyCaseProfile(base, profile), basedOn ?? undefined);
    }),
    [confirmDiscard, createAndSwitch, currentId, run],
  );

  /** 読み込んだJSONを新しい案件にする（これまでJSONで持ち回っていた会社を取り込む口）。 */
  const createFromJson = useCallback(
    (data: FormData) => run(async () => {
      if (currentId === null && !confirmDiscard()) return null;
      return createAndSwitch(data);
    }),
    [confirmDiscard, createAndSwitch, currentId, run],
  );

  /**
   * 翌事業年度の案件を作って移る。いま開いている案件は前年分としてそのまま残る。
   *
   * 順送り（rolloverFormData）は第５表の金額や類似業種の株価をクリアするので、同じ案件を
   * 書き換えると仕上がった前年の評価がどこにも残らない。同じ会社を毎年評価する道具なので、
   * 年分ごとに別の案件にする。課税時期が1年進むので、案件名もそれに従って付く。
   *
   * いま開いている案件を `relatedTo` に渡すので、新しい案件は同じ会社の年分としてまとまる
   * （会社名を打ち直さないため、名前が揺れても離れ離れにならない）。
   */
  const createNextYear = useCallback(
    (nextData: FormData) => run(() => createAndSwitch(nextData, currentId ?? undefined)),
    [createAndSwitch, currentId, run],
  );

  const duplicate = useCallback(
    (id: number) => run(async () => {
      // 複製元が開いている案件なら、書き戻し待ちを送ってから複製する（古い内容を複製しない）。
      await flush();
      const created = await api.duplicateCase(id);
      await reload();
      return created;
    }),
    [flush, reload, run],
  );

  const archive = useCallback(
    (id: number) => run(async () => {
      if (id === currentId) {
        pendingRef.current = null;
        window.clearTimeout(timerRef.current);
        setCurrentId(null);
        setVersion(null);
        conflictRef.current = false;
        setStatus('idle');
        // 画面の入力はそのまま残るので、同じ内容で案件を作り直さないよう控えておく
        // （入力を続ければ内容が変わり、そこからは改めて案件になる）。
        unlinkedSnapshotRef.current = JSON.stringify(formDataRef.current);
      }
      await api.archiveCase(id);
      await reload();
    }),
    [currentId, reload, run, setVersion],
  );

  const restore = useCallback(
    (id: number) => run(async () => {
      await api.restoreCase(id);
      await reload();
    }),
    [reload, run],
  );

  const purge = useCallback(
    (id: number) => run(async () => {
      await api.purgeCase(id);
      await reload();
    }),
    [reload, run],
  );

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
    includeArchived,
    setIncludeArchived,
    reload,
    reloadCurrent,
    openCase,
    createFromCurrent,
    createWithProfile,
    createFromJson,
    createNextYear,
    duplicate,
    archive,
    restore,
    purge,
  };
}

export type CaseStore = ReturnType<typeof useCases>;
