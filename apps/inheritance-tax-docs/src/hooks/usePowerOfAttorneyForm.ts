import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_KEYS } from '@/constants';
import { useCompanyInfo } from '@/shared/staff-directory/company';
import type { Operator } from '@/shared/staff-directory/operator';
import { fetchMatterMaster, registerMatters } from '@/utils/powerOfAttorney/matterMasterApi';
import {
  PrincipalApiError,
  createPrincipal,
  draftOf,
  fetchPrincipal,
  updatePrincipal as updatePrincipalRecord,
  type PoaPrincipal,
} from '@/utils/powerOfAttorney/principalApi';
import { draftFromSlot, isBlankSlot, slotFieldsFromRecord } from '@/utils/powerOfAttorney/principalLink';
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
import { parseBirthDate, todayWareki } from '@/utils/powerOfAttorney/wareki';

/**
 * 入力中の委任者。生年月日は打たれたまま持ち、刷るときに和暦へ直す。
 * record は委任者DBから入れた（または登録した）ときの DB の内容で、直したかどうかの比較と更新の版に使う。
 */
export type PrincipalForm = Omit<PrincipalInput, 'birthDate'> & { id: number; birthInput: string; record?: PoaPrincipal };

export type DirectoryMessage = { slotId: number | null; kind: 'ok' | 'error'; text: string };

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

const emptyPrincipal = (id: number, name = ''): PrincipalForm => ({
  id,
  kind: 'individual',
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
 * 残したい委任者は、押したときだけ委任者DB（サーバ）へ登録する。linkedPrincipalId は
 * 委任者DBの画面の「委任状を作る」から来たときの相手で、1人目の欄へ入れる。
 */
export function usePowerOfAttorneyForm(linkedPrincipalId?: number) {
  const { company } = useCompanyInfo();
  const nextId = useRef(2);

  const [purpose, setPurpose] = useState<Purpose>('inheritance');
  const [documents, setDocuments] = useState<DocumentKind>('both');
  const [printDetails, setPrintDetails] = useState(true);
  const [nameMode, setNameMode] = useState<NameMode>('printed');
  const [printDate, setPrintDate] = useState(true);
  const [deceased, setDeceased] = useState(() => ({ name: readStored(STORAGE_KEYS.deceasedName), birthInput: '' }));
  const [principals, setPrincipals] = useState<PrincipalForm[]>(() => [
    emptyPrincipal(1, readStored(STORAGE_KEYS.clientName)),
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
  const [registerMessage, setRegisterMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

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
    setPrincipals((prev) => [...prev, emptyPrincipal(nextId.current++)]);
  }, []);
  const removePrincipal = useCallback((id: number) => {
    setPrincipals((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }, []);

  // ── 委任者DB ──

  /**
   * DB の内容を欄へ入れる。target が 'new' なら、空の欄が1つだけのときはそこへ、それ以外は欄を足す。
   * 被相続人は空のときだけ埋める（overrideDeceased は委任者DBの画面から来たとき）。
   */
  const applyRecord = useCallback((target: number | 'new', record: PoaPrincipal, overrideDeceased = false) => {
    const fields = { ...slotFieldsFromRecord(record), record };
    setPrincipals((prev) => {
      if (target !== 'new') return prev.map((p) => (p.id === target ? { ...p, ...fields } : p));
      if (prev.length === 1 && isBlankSlot(prev[0])) return [{ ...prev[0], ...fields }];
      return [...prev, { id: nextId.current++, ...fields }];
    });
    if (record.deceasedName) {
      setDeceased((prev) => (overrideDeceased || !prev.name.trim() ? { ...prev, name: record.deceasedName } : prev));
    }
    setDirectoryMessage(null);
  }, []);

  const unlinkRecord = useCallback((slotId: number) => {
    setPrincipals((prev) => prev.map((p) => (p.id === slotId ? { ...p, record: undefined } : p)));
    setDirectoryMessage(null);
  }, []);

  useEffect(() => {
    if (!linkedPrincipalId) return;
    let cancelled = false;
    fetchPrincipal(linkedPrincipalId)
      .then((record) => {
        if (!cancelled) applyRecord(1, record, true);
      })
      .catch((error) => {
        if (!cancelled) setDirectoryMessage({ slotId: null, kind: 'error', text: error instanceof Error ? error.message : '委任者DBから読み込めませんでした' });
      });
    return () => {
      cancelled = true;
    };
  }, [linkedPrincipalId, applyRecord]);

  /** 欄の内容を委任者DBへ。つながっていなければ新しく登録し、つながっていればその人を更新する */
  const saveToDirectory = useCallback(async (slotId: number) => {
    const slot = principals.find((p) => p.id === slotId);
    if (!slot || !slot.name.trim() || savingSlotId !== null) return;
    const draft = draftFromSlot(slot, slot.record && draftOf(slot.record), purpose === 'inheritance' ? deceased.name : '');
    setSavingSlotId(slotId);
    setDirectoryMessage(null);
    try {
      const saved = slot.record
        ? await updatePrincipalRecord(slot.record.id, draft, slot.record.version)
        : await createPrincipal(draft);
      setPrincipals((prev) => prev.map((p) => (p.id === slotId ? { ...p, record: saved } : p)));
      setDirectoryMessage({ slotId, kind: 'ok', text: slot.record ? '委任者DBの登録内容を更新しました' : '委任者DBに登録しました' });
    } catch (error) {
      if (error instanceof PrincipalApiError && error.status === 409 && error.current) {
        // 今の内容を控えにし直すので、もう一度押せばこの画面の内容で上書きできる
        const current = error.current;
        setPrincipals((prev) => prev.map((p) => (p.id === slotId ? { ...p, record: current } : p)));
        setDirectoryMessage({ slotId, kind: 'error', text: 'ほかの画面で委任者DBの内容が直されていました。この画面の内容で上書きするなら、もう一度押してください。' });
      } else if (error instanceof PrincipalApiError && error.status === 404) {
        setPrincipals((prev) => prev.map((p) => (p.id === slotId ? { ...p, record: undefined } : p)));
        setDirectoryMessage({ slotId, kind: 'error', text: '委任者DBの登録がゴミ箱へ移されていたため、つながりを外しました。残すなら登録し直してください。' });
      } else {
        setDirectoryMessage({ slotId, kind: 'error', text: error instanceof Error ? error.message : '委任者DBに保存できませんでした' });
      }
    } finally {
      setSavingSlotId(null);
    }
  }, [principals, savingSlotId, purpose, deceased.name]);

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
    if (purpose === 'inheritance') check('deceased', deceased.birthInput);
    principals.forEach((p) => p.kind === 'individual' && check(`principal-${p.id}`, p.birthInput));
    if (subAgent) check('subAgent', subAgent.birthInput);
    return errors;
  }, [purpose, deceased.birthInput, principals, subAgent]);

  const matters = useMemo(
    () => resolveMatters(availableMatters, selection, extraMatters),
    [availableMatters, selection, extraMatters],
  );

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
      date: printDate ? todayWareki() : '',
      agent: { name: company.name, address: company.address, representative: company.representative },
      subAgent: subAgent
        ? { name: subAgent.name, address: subAgent.address, birthDate: wareki(subAgent.birthInput) }
        : null,
    });
  }, [purpose, documents, printDetails, nameMode, deceased, principals, matters, printDate, company, subAgent]);

  return {
    company,
    purpose,
    setPurpose,
    documents,
    setDocuments,
    printDetails,
    setPrintDetails,
    nameMode,
    setNameMode,
    printDate,
    setPrintDate,
    deceased,
    setDeceased,
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
