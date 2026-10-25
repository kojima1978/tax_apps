import { useCallback, useMemo, useRef, useState } from 'react';
import { STORAGE_KEYS } from '@/constants';
import { useCompanyInfo } from '@/shared/staff-directory/company';
import type { Operator } from '@/shared/staff-directory/operator';
import {
  mattersFor,
  resolveMatters,
  togglePreset,
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

/** 入力中の委任者。生年月日は打たれたまま持ち、刷るときに和暦へ直す */
export type PrincipalForm = Omit<PrincipalInput, 'birthDate'> & { id: number; birthInput: string };

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
 * 委任状の入力。どれも保存しない（画面を閉じれば消える）── 委任者の住所・生年月日を
 * ブラウザに残さないため。被相続人と1人目の委任者の名前だけ、書類リストの案件から写す。
 */
export function usePowerOfAttorneyForm() {
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
  const [matterState, setMatterState] = useState<{ selection: MatterSelection; activePresetIds: string[] }>({
    selection: INITIAL_SELECTION,
    activePresetIds: [],
  });
  const { selection, activePresetIds } = matterState;
  const [extraMatters, setExtraMatters] = useState('');
  const [subAgent, setSubAgent] = useState<SubAgentForm | null>(null);

  const updatePrincipal = useCallback((id: number, patch: Partial<PrincipalForm>) => {
    setPrincipals((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);
  const addPrincipal = useCallback(() => {
    setPrincipals((prev) => [...prev, emptyPrincipal(nextId.current++)]);
  }, []);
  const removePrincipal = useCallback((id: number) => {
    setPrincipals((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }, []);

  const togglePresetById = useCallback((presetId: string) => {
    setMatterState((prev) => togglePreset(prev.selection, prev.activePresetIds, presetId));
  }, []);
  const updateMatter = useCallback((matterId: string, patch: Partial<{ checked: boolean; text: string }>) => {
    setMatterState((prev) => ({
      ...prev,
      selection: { ...prev.selection, [matterId]: { ...(prev.selection[matterId] ?? { checked: false, text: '' }), ...patch } },
    }));
  }, []);

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
    () => resolveMatters(purpose, selection, extraMatters),
    [purpose, selection, extraMatters],
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
      principals: principals.map(({ birthInput, ...p }) => ({ ...p, birthDate: wareki(birthInput) })),
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
    availableMatters: mattersFor(purpose),
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
