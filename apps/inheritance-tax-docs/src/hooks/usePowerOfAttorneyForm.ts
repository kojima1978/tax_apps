import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_KEYS } from '@/constants';
import { useCompanyInfo } from '@/shared/staff-directory/company';
import type { Operator } from '@/shared/staff-directory/operator';
import {
  DeceasedApiError,
  EMPTY_DECEASED_DRAFT,
  createDeceased,
  deceasedDraftOf,
  fetchDeceased,
  linkHeirs,
  updateDeceased as updateDeceasedRecord,
  type PoaDeceased,
} from '@/utils/powerOfAttorney/deceasedApi';
import { fetchMatterMaster, registerMatters } from '@/utils/powerOfAttorney/matterMasterApi';
import {
  PrincipalApiError,
  createPrincipal,
  draftOf,
  fetchPrincipal,
  updatePrincipal as updatePrincipalRecord,
  type PoaPrincipal,
} from '@/utils/powerOfAttorney/principalApi';
import {
  draftFromSlot,
  isBlankSlot,
  mergeHeirs,
  slotFieldsFromRecord,
  type PrincipalForm,
} from '@/utils/powerOfAttorney/principalLink';
import {
  DEFAULT_MATTER_MASTER,
  editedText,
  resolveMatters,
  splitExtraMatters,
  togglePreset,
  type MatterMaster,
  type MatterPresetId,
  type MatterSelection,
  type Purpose,
} from '@/utils/powerOfAttorney/matters';
import {
  buildSheets,
  type DocumentKind,
  type NameMode,
  type PrincipalInput,
} from '@/utils/powerOfAttorney/record';
import { fetchSubAgentDetails } from '@/utils/powerOfAttorney/subAgent';
import { parseBirthDate, warekiFromIsoDate } from '@/utils/powerOfAttorney/wareki';

export type { PrincipalForm };

export type DirectoryMessage = { slotId: number | null; kind: 'ok' | 'error'; text: string };

type PrincipalKind = PrincipalInput['kind'];

/**
 * 資料が必要な人。① 亡くなった方（相続人が委任者・被相続人を刷る）／② 存命の個人（本人）／③ 法人。
 * ②③は委任者本人の手続きの文面になり、委任者の区分もこれで決まる。
 */
export type Subject = 'deceased' | 'individual' | 'corporate';

/** 委任日。手書きで埋める空欄か、カレンダーで選んだ日（2枚とも同じ日） */
export type DateMode = 'blank' | 'pick';

/** 被相続人の欄。record は被相続人DBから入れた（または登録した）ときの DB の内容 */
export type DeceasedForm = { name: string; birthInput: string; record?: PoaDeceased };

/** 被相続人を選んだときに「相続人もまとめて入れますか」と聞く相手（まだ欄に入っていない人だけ） */
export type HeirPrompt = { deceasedName: string; heirs: PoaPrincipal[] };

type Message = { kind: 'ok' | 'error'; text: string };

export type SubAgentForm = {
  staffId: number;
  name: string;
  address: string;
  birthInput: string;
  status: 'loading' | 'ok' | 'missing';
};

const readStored = (key: string) => {
  try {
    return localStorage.getItem(key)?.trim() ?? '';
  } catch {
    return '';
  }
};

const emptyPrincipal = (id: number, name = '', kind: PrincipalKind = 'individual'): PrincipalForm => ({
  id,
  kind,
  address: '',
  name,
  representative: '',
  birthInput: '',
});

// 本人用の事項は1つだけなので、最初から印を付けておく
const INITIAL_SELECTION: MatterSelection = { 'own-property-certificates': { checked: true, text: '' } };

/**
 * 委任状の入力。ブラウザには何も残さない（画面を閉じれば消える）── 委任者の住所・生年月日を
 * 端末に残さないため。被相続人と1人目の委任者の名前だけ、書類リストの案件から写す。
 * 残したい人は、押したときだけ被相続人DB・委任者DB（サーバ）へ登録する。
 * linked は DB の画面の「委任状を作る」から来たときの相手（被相続人なら相続人も全員入れる）。
 */
export function usePowerOfAttorneyForm(linked: { principalId?: number; deceasedId?: number } = {}) {
  const { principalId: linkedPrincipalId, deceasedId: linkedDeceasedId } = linked;
  const { company } = useCompanyInfo();
  const nextId = useRef(2);
  // DB の画面から来たときは、書類リストの案件の名前を写さない（別の案件の人が混ざるため）
  const fromDirectory = Boolean(linkedPrincipalId || linkedDeceasedId);

  const [subject, setSubjectState] = useState<Subject>('deceased');
  const purpose: Purpose = subject === 'deceased' ? 'inheritance' : 'personal';
  // ②③は区分が決まる。①は相続人ごとに選べる（法人の受遺者がいるため）
  const forcedKind: PrincipalKind | null = subject === 'deceased' ? null : subject;
  const [documents, setDocuments] = useState<DocumentKind>('both');
  const [printDetails, setPrintDetails] = useState(true);
  const [nameMode, setNameMode] = useState<NameMode>('printed');
  const [dateMode, setDateMode] = useState<DateMode>('blank');
  const [dateIso, setDateIso] = useState('');
  const [deceased, setDeceased] = useState<DeceasedForm>(() => ({
    name: fromDirectory ? '' : readStored(STORAGE_KEYS.deceasedName),
    birthInput: '',
  }));
  const [principals, setPrincipals] = useState<PrincipalForm[]>(() => [
    emptyPrincipal(1, fromDirectory ? '' : readStored(STORAGE_KEYS.clientName)),
  ]);
  // 事項の印と押している提出先は一緒に動くので1つの state に持つ（続けて押しても古い値で上書きしない）
  const [matterState, setMatterState] = useState<{ selection: MatterSelection; activePresetIds: MatterPresetId[] }>({
    selection: INITIAL_SELECTION,
    activePresetIds: [],
  });
  const { selection, activePresetIds } = matterState;
  const [extraMatters, setExtraMatters] = useState('');
  const [subAgent, setSubAgent] = useState<SubAgentForm | null>(null);

  // 委任事項の文面はマスタ（全社共通）から。読めなければ初期の文面で作れるようにし、登録だけ止める
  const [master, setMaster] = useState<MatterMaster>(DEFAULT_MATTER_MASTER);
  const [masterStatus, setMasterStatus] = useState<'loading' | 'ok' | 'fallback'>('loading');
  const [registering, setRegistering] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<Message | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMatterMaster()
      .then((loaded) => {
        if (cancelled) return;
        setMaster(loaded);
        setMasterStatus('ok');
      })
      .catch(() => {
        if (!cancelled) setMasterStatus('fallback');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [directoryMessage, setDirectoryMessage] = useState<DirectoryMessage | null>(null);
  const [savingSlotId, setSavingSlotId] = useState<number | null>(null);
  const updatePrincipal = useCallback((id: number, patch: Partial<PrincipalForm>) => {
    setPrincipals((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    // 直した後まで「登録しました」を残さない
    setDirectoryMessage((prev) => (prev?.slotId === id ? null : prev));
  }, []);
  const addPrincipal = useCallback(() => {
    setPrincipals((prev) => [...prev, emptyPrincipal(nextId.current++, '', forcedKind ?? 'individual')]);
  }, [forcedKind]);
  const removePrincipal = useCallback((id: number) => {
    setPrincipals((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }, []);

  const setSubject = useCallback((next: Subject) => {
    setSubjectState(next);
    if (next !== 'deceased') setPrincipals((prev) => prev.map((p) => (p.kind === next ? p : { ...p, kind: next })));
  }, []);

  // ── 委任者DB ──

  /** DB の内容を欄へ入れる。target が 'new' なら、空の欄が1つだけのときはそこへ、それ以外は欄を足す */
  const applyRecord = useCallback((target: number | 'new', record: PoaPrincipal) => {
    const fields = { ...slotFieldsFromRecord(record), record };
    setPrincipals((prev) => {
      if (target !== 'new') return prev.map((p) => (p.id === target ? { ...p, ...fields } : p));
      if (prev.length === 1 && isBlankSlot(prev[0])) return [{ ...prev[0], ...fields }];
      return [...prev, { id: nextId.current++, ...fields }];
    });
    setDirectoryMessage(null);
  }, []);

  const unlinkRecord = useCallback((slotId: number) => {
    setPrincipals((prev) => prev.map((p) => (p.id === slotId ? { ...p, record: undefined } : p)));
    setDirectoryMessage(null);
  }, []);

  // ── 被相続人DB ──

  const [deceasedMessage, setDeceasedMessage] = useState<Message | null>(null);
  const [savingDeceased, setSavingDeceased] = useState(false);
  const [heirPrompt, setHeirPrompt] = useState<HeirPrompt | null>(null);

  const updateDeceased = useCallback((patch: Partial<Omit<DeceasedForm, 'record'>>) => {
    setDeceased((prev) => ({ ...prev, ...patch }));
    setDeceasedMessage(null);
  }, []);

  /** 相続人をまとめて欄へ（空の欄から埋め、足りなければ足す。もう入っている人は入れない） */
  const insertHeirs = useCallback((heirs: PoaPrincipal[]) => {
    setPrincipals((prev) => mergeHeirs(prev, heirs, () => nextId.current++).slots);
    setDirectoryMessage(null);
  }, []);

  /** 被相続人を選ぶ。まだ欄に入っていない相続人がいれば、まとめて入れるかを聞く */
  const pickDeceased = useCallback((record: PoaDeceased) => {
    setDeceased({ name: record.name, birthInput: record.birthDate, record });
    setDeceasedMessage(null);
    const present = new Set(principals.flatMap((p) => (p.record ? [p.record.id] : [])));
    const missing = record.heirs.filter((heir) => !present.has(heir.id));
    setHeirPrompt(missing.length > 0 ? { deceasedName: record.name, heirs: missing } : null);
  }, [principals]);

  const acceptHeirs = useCallback(() => {
    if (!heirPrompt) return;
    insertHeirs(heirPrompt.heirs);
    setDeceasedMessage({ kind: 'ok', text: `相続人${heirPrompt.heirs.length}人を委任者に入れました` });
    setHeirPrompt(null);
  }, [heirPrompt, insertHeirs]);
  const dismissHeirs = useCallback(() => setHeirPrompt(null), []);

  const unlinkDeceased = useCallback(() => {
    setDeceased((prev) => ({ ...prev, record: undefined }));
    setDeceasedMessage(null);
  }, []);

  /**
   * 被相続人の欄を被相続人DBへ。つながっていなければ新しく登録し、つながっていれば更新する。
   * どちらでも、委任者DBとつながっている欄の人は全員この方の相続人としてつなぐ。
   */
  const saveDeceasedToDirectory = useCallback(async () => {
    if (!deceased.name.trim() || savingDeceased) return;
    const { record } = deceased;
    const draft = {
      ...(record ? deceasedDraftOf(record) : EMPTY_DECEASED_DRAFT),
      name: deceased.name.trim(),
      birthDate: deceased.birthInput.trim(),
    };
    const heirIds = principals.flatMap((p) => (p.record ? [p.record.id] : []));
    const savedText = record ? '被相続人DBの登録内容を更新しました' : '被相続人DBに登録しました';
    let stage: 'save' | 'link' = 'save';
    setSavingDeceased(true);
    setDeceasedMessage(null);
    try {
      const saved = record ? await updateDeceasedRecord(record.id, draft, record.version) : await createDeceased(draft);
      setDeceased((prev) => ({ ...prev, record: saved }));
      stage = 'link';
      const newHeirs = heirIds.filter((id) => !saved.heirs.some((heir) => heir.id === id));
      if (newHeirs.length > 0) {
        const linkedRecord = await linkHeirs(saved.id, newHeirs);
        setDeceased((prev) => ({ ...prev, record: linkedRecord }));
      }
      // 中身が同じで相続人をつなぐためだけに押したときは「更新しました」と書かない
      const unchanged = 'unchanged' in saved && saved.unchanged;
      const linkedText = `委任者${newHeirs.length}人を相続人としてつなぎました`;
      setDeceasedMessage({
        kind: 'ok',
        text: newHeirs.length === 0 ? (unchanged ? '被相続人DBの登録内容と同じです' : savedText)
          : unchanged ? linkedText : `${savedText}（${linkedText}）`,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : '被相続人DBに保存できませんでした';
      if (stage === 'link') {
        setDeceasedMessage({ kind: 'error', text: `${savedText}が、相続人をつなげませんでした（${text}）` });
      } else if (error instanceof DeceasedApiError && error.status === 409 && error.current) {
        // 今の内容を控えにし直すので、もう一度押せばこの画面の内容で上書きできる
        const current = error.current;
        setDeceased((prev) => ({ ...prev, record: current }));
        setDeceasedMessage({ kind: 'error', text: 'ほかの画面で被相続人DBの内容が直されていました。この画面の内容で上書きするなら、もう一度押してください。' });
      } else if (error instanceof DeceasedApiError && error.status === 404) {
        setDeceased((prev) => ({ ...prev, record: undefined }));
        setDeceasedMessage({ kind: 'error', text: '被相続人DBの登録がゴミ箱へ移されていたため、つながりを外しました。残すなら登録し直してください。' });
      } else {
        setDeceasedMessage({ kind: 'error', text });
      }
    } finally {
      setSavingDeceased(false);
    }
  }, [deceased, savingDeceased, principals]);

  // DB の画面の「委任状を作る」から来たとき。委任者は区分で②③を決め、被相続人は相続人も全員入れる
  useEffect(() => {
    if (!linkedPrincipalId) return;
    let cancelled = false;
    fetchPrincipal(linkedPrincipalId)
      .then((record) => {
        if (cancelled) return;
        setSubject(record.kind);
        applyRecord(1, record);
      })
      .catch((error) => {
        if (!cancelled) setDirectoryMessage({ slotId: null, kind: 'error', text: error instanceof Error ? error.message : '委任者DBから読み込めませんでした' });
      });
    return () => {
      cancelled = true;
    };
  }, [linkedPrincipalId, applyRecord, setSubject]);

  useEffect(() => {
    if (!linkedDeceasedId) return;
    let cancelled = false;
    fetchDeceased(linkedDeceasedId)
      .then((record) => {
        if (cancelled) return;
        setSubject('deceased');
        setDeceased({ name: record.name, birthInput: record.birthDate, record });
        insertHeirs(record.heirs);
        if (record.heirs.length > 0) setDeceasedMessage({ kind: 'ok', text: `相続人${record.heirs.length}人を委任者に入れました` });
      })
      .catch((error) => {
        if (!cancelled) setDeceasedMessage({ kind: 'error', text: error instanceof Error ? error.message : '被相続人DBから読み込めませんでした' });
      });
    return () => {
      cancelled = true;
    };
  }, [linkedDeceasedId, insertHeirs, setSubject]);

  /**
   * 欄の内容を委任者DBへ。つながっていなければ新しく登録し、つながっていればその人を更新する。
   * ①で被相続人が被相続人DBとつながっていれば、この人をその方の相続人としてつなぐ。
   */
  const saveToDirectory = useCallback(async (slotId: number) => {
    const slot = principals.find((p) => p.id === slotId);
    if (!slot || !slot.name.trim() || savingSlotId !== null) return;
    const draft = draftFromSlot(slot, slot.record && draftOf(slot.record));
    const deceasedRecord = subject === 'deceased' ? deceased.record : undefined;
    const savedText = slot.record ? '委任者DBの登録内容を更新しました' : '委任者DBに登録しました';
    let stage: 'save' | 'link' = 'save';
    setSavingSlotId(slotId);
    setDirectoryMessage(null);
    try {
      const saved = slot.record
        ? await updatePrincipalRecord(slot.record.id, draft, slot.record.version)
        : await createPrincipal(draft);
      setPrincipals((prev) => prev.map((p) => (p.id === slotId ? { ...p, record: saved } : p)));
      stage = 'link';
      let text = savedText;
      if (deceasedRecord && !deceasedRecord.heirs.some((heir) => heir.id === saved.id)) {
        const linkedRecord = await linkHeirs(deceasedRecord.id, [saved.id]);
        setDeceased((prev) => ({ ...prev, record: linkedRecord }));
        // 委任者の側の「つながっている被相続人」も、つないだ後の内容に合わせる
        const linkedHeir = linkedRecord.heirs.find((heir) => heir.id === saved.id) ?? saved;
        setPrincipals((prev) => prev.map((p) => (p.id === slotId ? { ...p, record: linkedHeir } : p)));
        text = `${savedText}（${deceasedRecord.name}様の相続人としてつなぎました）`;
      }
      setDirectoryMessage({ slotId, kind: 'ok', text });
    } catch (error) {
      const text = error instanceof Error ? error.message : '委任者DBに保存できませんでした';
      if (stage === 'link') {
        if (error instanceof DeceasedApiError && error.status === 404 && error.message.startsWith('被相続人')) {
          setDeceased((prev) => ({ ...prev, record: undefined }));
        }
        setDirectoryMessage({ slotId, kind: 'error', text: `${savedText}が、被相続人とつなげませんでした（${text}）` });
      } else if (error instanceof PrincipalApiError && error.status === 409 && error.current) {
        // 今の内容を控えにし直すので、もう一度押せばこの画面の内容で上書きできる
        const current = error.current;
        setPrincipals((prev) => prev.map((p) => (p.id === slotId ? { ...p, record: current } : p)));
        setDirectoryMessage({ slotId, kind: 'error', text: 'ほかの画面で委任者DBの内容が直されていました。この画面の内容で上書きするなら、もう一度押してください。' });
      } else if (error instanceof PrincipalApiError && error.status === 404) {
        setPrincipals((prev) => prev.map((p) => (p.id === slotId ? { ...p, record: undefined } : p)));
        setDirectoryMessage({ slotId, kind: 'error', text: '委任者DBの登録がゴミ箱へ移されていたため、つながりを外しました。残すなら登録し直してください。' });
      } else {
        setDirectoryMessage({ slotId, kind: 'error', text });
      }
    } finally {
      setSavingSlotId(null);
    }
  }, [principals, savingSlotId, subject, deceased.record]);

  const togglePresetById = useCallback((presetId: MatterPresetId) => {
    setMatterState((prev) => togglePreset(master.presets, prev.selection, prev.activePresetIds, presetId));
  }, [master.presets]);
  const updateMatter = useCallback((matterId: string, patch: Partial<{ checked: boolean; text: string }>) => {
    setMatterState((prev) => ({
      ...prev,
      selection: { ...prev.selection, [matterId]: { ...(prev.selection[matterId] ?? { checked: false, text: '' }), ...patch } },
    }));
  }, []);

  const availableMatters = master.matters[purpose];

  /** 文面を定型文に登録し、登録した事項に印を付け直す。select は登録結果の id から次の選択を作る */
  const register = useCallback(async (
    texts: string[],
    afterId: string | undefined,
    select: (ids: string[], prev: MatterSelection) => MatterSelection,
  ) => {
    if (texts.length === 0 || masterStatus !== 'ok') return false;
    setRegistering(true);
    setRegisterMessage(null);
    try {
      const result = await registerMatters(purpose, texts, afterId);
      setMaster(result.master);
      setMatterState((prev) => ({ ...prev, selection: select(result.ids, prev.selection) }));
      setRegisterMessage({
        kind: 'ok',
        text: result.created > 0 ? `定型文に${result.created}件登録しました` : '同じ文面がすでに定型文にあったので、それに印を付けました',
      });
      return true;
    } catch (error) {
      setRegisterMessage({ kind: 'error', text: error instanceof Error ? error.message : '定型文に登録できませんでした' });
      return false;
    } finally {
      setRegistering(false);
    }
  }, [purpose, masterStatus]);

  // 直した文面を新しい事項として元の事項の隣に足し、元の事項の印と直しは外す
  const registerEditedMatter = useCallback((matterId: string) => {
    const matter = availableMatters.find((m) => m.id === matterId);
    const text = matter ? editedText(matter, selection) : '';
    if (!text) return Promise.resolve(false);
    return register([text], matterId, ([newId], prev) => ({
      ...prev,
      [matterId]: { checked: false, text: '' },
      [newId]: { checked: true, text: '' },
    }));
  }, [availableMatters, selection, register]);

  // 「その他の委任事項」の各行を事項として足し、欄は空にする（同じ文面が二重に刷られないように）
  const registerExtraMatters = useCallback(async () => {
    const ok = await register(splitExtraMatters(extraMatters), undefined, (ids, prev) => ({
      ...prev,
      ...Object.fromEntries(ids.map((id) => [id, { checked: true, text: '' }])),
    }));
    if (ok) setExtraMatters('');
    return ok;
  }, [extraMatters, register]);

  // 選び直した直後に前の人の応答が遅れて届いても上書きさせない
  const pickSeq = useRef(0);
  const pickSubAgent = useCallback(async (person: Operator | null) => {
    const seq = ++pickSeq.current;
    if (!person || person.id === null) {
      setSubAgent(null);
      return;
    }
    const staffId = person.id;
    setSubAgent({ staffId, name: person.fullName, address: '', birthInput: '', status: 'loading' });
    const details = await fetchSubAgentDetails(staffId);
    if (seq !== pickSeq.current) return;
    setSubAgent((prev) =>
      prev && prev.staffId === staffId
        ? details
          ? { ...prev, address: details.address, birthInput: details.birthDate, status: 'ok' }
          : { ...prev, status: 'missing' }
        : prev,
    );
  }, []);
  const updateSubAgent = useCallback((patch: Partial<SubAgentForm>) => {
    setSubAgent((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  // 生年月日の欄ごとの誤り（キーは欄の識別子）。1つでもあれば印刷させない
  const birthErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    const check = (key: string, input: string) => {
      const result = parseBirthDate(input);
      if (!result.ok) errors[key] = result.error;
    };
    if (subject === 'deceased') check('deceased', deceased.birthInput);
    principals.forEach((p) => p.kind === 'individual' && check(`principal-${p.id}`, p.birthInput));
    if (subAgent) check('subAgent', subAgent.birthInput);
    return errors;
  }, [subject, deceased.birthInput, principals, subAgent]);

  const matters = useMemo(
    () => resolveMatters(availableMatters, selection, extraMatters),
    [availableMatters, selection, extraMatters],
  );

  // 委任日を選ぶにしたのに日が入っていない間は空欄で刷る（画面に注意を出す）
  const date = dateMode === 'pick' ? warekiFromIsoDate(dateIso) : '';

  const sheets = useMemo(() => {
    const wareki = (input: string) => {
      const result = parseBirthDate(input);
      return result.ok ? result.text : '';
    };
    return buildSheets({
      purpose,
      documents,
      printDetails,
      nameMode,
      deceased: { name: deceased.name, birthDate: wareki(deceased.birthInput) },
      // record（DB の控え）は刷る内容に混ぜない
      principals: principals.map(({ kind, name, address, representative, birthInput }) => ({
        kind,
        name,
        address,
        representative,
        birthDate: wareki(birthInput),
      })),
      matters,
      date,
      agent: { name: company.name, address: company.address, representative: company.representative },
      subAgent: subAgent
        ? { name: subAgent.name, address: subAgent.address, birthDate: wareki(subAgent.birthInput) }
        : null,
    });
  }, [purpose, documents, printDetails, nameMode, deceased.name, deceased.birthInput, principals, matters, date, company, subAgent]);

  return {
    company,
    subject,
    setSubject,
    purpose,
    forcedKind,
    documents,
    setDocuments,
    printDetails,
    setPrintDetails,
    nameMode,
    setNameMode,
    dateMode,
    setDateMode,
    dateIso,
    setDateIso,
    date,
    deceased,
    updateDeceased,
    pickDeceased,
    unlinkDeceased,
    saveDeceasedToDirectory,
    savingDeceased,
    deceasedMessage,
    heirPrompt,
    acceptHeirs,
    dismissHeirs,
    principals,
    updatePrincipal,
    addPrincipal,
    removePrincipal,
    applyRecord,
    unlinkRecord,
    saveToDirectory,
    savingSlotId,
    directoryMessage,
    availableMatters,
    presets: master.presets,
    masterStatus,
    registering,
    registerMessage,
    registerEditedMatter,
    registerExtraMatters,
    selection,
    activePresetIds,
    togglePresetById,
    updateMatter,
    extraMatters,
    setExtraMatters,
    subAgent,
    pickSubAgent,
    updateSubAgent,
    birthErrors,
    matters,
    sheets,
  };
}
