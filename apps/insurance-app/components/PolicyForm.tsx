'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DISPLAY_POLICY_TYPES, isIncomeProtectionPolicyType, normalizePolicyType } from '@/types';
import type { Policy, PolicyType, FamilyMember, SurrenderValuePoint, ValuationSettings, BeneficiaryAllocation } from '@/types';
import { AlertTriangle, Clipboard, FileUp, Info, Plus, RotateCcw, Save, Trash2, Upload, X } from 'lucide-react';
import { mergeRelationshipSuggestions } from '@/utils/relationshipOptions';
import { ApiError, fetchPolicyPrompt, savePolicyPrompt } from '@/lib/api';
import { DEFAULT_POLICY_PROMPT, LEGACY_DEFAULT_POLICY_PROMPTS, normalizePromptText } from '@/lib/policyPrompt';
import { CommaInput, CommaInputRaw } from './CommaInput';
import SurrenderValueEditor from './SurrenderValueEditor';
import { applyValuationRateToPolicy, derivePaymentExchangeRate } from '@/utils/currencyUtils';
import { getBeneficiaryAllocations, normalizeBeneficiaryAllocations } from '@/utils/beneficiaryUtils';

interface PolicyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (policy: Policy) => void;
  onAddFamilyMember?: (member: FamilyMember) => void;
  familyMembers: FamilyMember[];
  existingPolicies?: Policy[];
  editingPolicy: Policy | null;
  valuationSettings: ValuationSettings;
}

interface UnresolvedNameRef {
  draftId: string;
  field: 'insured' | 'beneficiary';
}

interface UnresolvedName {
  field: 'insured' | 'beneficiary';
  label: string;
  originalName: string;
  mode: 'new' | 'existing' | 'skip';
  selectedMemberId: string;
  relationship: string;
  birthDate: string;
  gender: FamilyMember['gender'];
  refs?: UnresolvedNameRef[];
}

// AI取込JSONは形が不定なので、値は unknown のまま受け取り各パーサで正規化する
type ImportRecord = Record<string, unknown>;

interface ImportDraft {
  id: string;
  data: Partial<Policy>;
  insuredId: string;
  beneficiaryId: string;
  linkBeneficiaryToInsured: boolean;
  insuredName: string;
  beneficiaryName: string;
  warnings: string[];
}

const yenFromForeign =(amount: number, exchangeRate: number) => Math.round((amount || 0) * (exchangeRate || 0));

const DEATH_BENEFIT_TYPES: PolicyType[] = ['終身保険', '定期保険', '収入保障保険', '変額終身保険', '養老保険'];
const MEDICAL_BENEFIT_TYPES: PolicyType[] = ['医療保険', 'がん保険'];
const DIAGNOSIS_BENEFIT_TYPES: PolicyType[] = ['医療保険', 'がん保険'];
const MATURITY_BENEFIT_TYPES: PolicyType[] = ['終身保険', '変額終身保険', '養老保険'];
const BENEFICIARY_TYPES: PolicyType[] = [...DEATH_BENEFIT_TYPES];
const FINITE_END_AGE_TYPES: PolicyType[] = ['定期保険', '収入保障保険', '養老保険'];
const WHOLE_LIFE_COVERAGE_TYPES: PolicyType[] = ['終身保険', '変額終身保険'];

// 生年月日と基準日から満年齢を計算（不明な場合は null）
const calcAgeAt = (birthDate: string, targetDate: string): number | null => {
  if (!birthDate || !targetDate) return null;
  const birth = new Date(birthDate);
  const target = new Date(targetDate);
  if (isNaN(birth.getTime()) || isNaN(target.getTime())) return null;
  let age = target.getFullYear() - birth.getFullYear();
  const monthDiff = target.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && target.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

const calcAgeAtFiscalYearStart = (birthDate: string, fiscalYear: number): number | null => {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 2200) return null;
  return calcAgeAt(birthDate, `${fiscalYear}-04-01`);
};

const getCurrentFiscalYear = () => {
  const today = new Date();
  return today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear();
};

const formatJapaneseEraYear = (year: number) => {
  const era = year >= 2019
    ? { name: '令和', year: year - 2018 }
    : year >= 1989
      ? { name: '平成', year: year - 1988 }
      : year >= 1926
        ? { name: '昭和', year: year - 1925 }
        : year >= 1912
          ? { name: '大正', year: year - 1911 }
          : { name: '明治', year: year - 1867 };
  return `${era.name}${era.year === 1 ? '元' : era.year}年`;
};

const formatFiscalYearOption = (year: number) =>
  `${year}年度（${formatJapaneseEraYear(year)}度）`;

const normalizePersonName = (name: unknown) => {
  let n = String(name || '');
  n = n.replace(/(様|殿|くん|ちゃん|様方)$/, '');
  n = n.replace(/[（\(].*?[\)）]/g, '');
  n = n.replace(/[・．.、,]/g, '');
  n = n.replace(/\s+/g, '');
  return n.trim();
};

const hasSearchableName = (member: FamilyMember) =>
  Boolean(normalizePersonName(member.name) || normalizePersonName(member.nameKana));

const isEmptyFamilyPlaceholder = (member: FamilyMember) => !hasSearchableName(member);

const formatFamilyOptionLabel = (member: FamilyMember) => {
  const relationship = member.relationship || '続柄未入力';
  const name = member.name || '氏名未入力';
  return `${relationship}: ${name}`;
};

const getDefaultFamilyMemberId = (members: FamilyMember[]) =>
  members.find(hasSearchableName)?.id || '';

const buildDefaultFormData = (members: FamilyMember[]): Partial<Policy> => {
  const insuredId = getDefaultFamilyMemberId(members);
  const contractDate = new Date().toISOString().split('T')[0];
  const insured = members.find(m => m.id === insuredId);
  return {
    companyName: '',
    policyType: '終身保険',
    policyNumber: '',
    contractDate,
    contractAge: calcAgeAt(insured?.birthDate || '', contractDate) ?? 30,
    insuredId,
    beneficiaryId: insuredId,
    beneficiaryAllocations: insuredId ? [{ beneficiaryId: insuredId, percentage: 100 }] : [],
    pensionRecipientId: insuredId,
    pensionSuccessorRecipientId: '',
    pensionStartMode: 'age',
    pensionStartFiscalYear: getCurrentFiscalYear(),
    pensionPayoutYears: 10,
    deathBenefitDisease: 0,
    deathBenefitAccident: 0,
    hospDayDisease: 0,
    hospDayAccident: 0,
    diagnosisBenefit: 0,
    policyEndAge: 999,
    currency: 'JPY',
    exchangeRate: 0,
    foreignPremiumAmount: 0,
    foreignDeathBenefitDisease: 0,
    foreignDeathBenefitAccident: 0,
    foreignHospDayDisease: 0,
    foreignHospDayAccident: 0,
    foreignDiagnosisBenefit: 0,
    foreignMaturityBenefit: 0,
    paymentFrequency: 'monthly',
    premiumAmount: 0,
    paymentEndAge: 60,
    premiumPaymentCompleted: false,
    maturityBenefit: 0,
  };
};

// 保存前の整形: 不正な行を除き、同じ年齢は後の行を優先し、年齢順に並べる
const normalizeSurrenderValues = (points?: SurrenderValuePoint[]): SurrenderValuePoint[] | undefined => {
  if (!Array.isArray(points) || points.length === 0) return undefined;
  const byAge = new Map<number, SurrenderValuePoint>();
  points.forEach(point => {
    const age = Number(point?.age);
    const amount = Number(point?.amount);
    if (!Number.isFinite(age) || age < 0 || age > 120) return;
    if (!Number.isFinite(amount) || amount < 0) return;
    byAge.set(age, {
      age,
      amount: Math.round(amount),
      ...(point.foreignAmount !== undefined ? { foreignAmount: point.foreignAmount } : {}),
    });
  });
  const sorted = [...byAge.values()].sort((a, b) => a.age - b.age);
  return sorted.length > 0 ? sorted : undefined;
};

const LEGACY_PROMPT_STORAGE_KEY = 'insurance-policy-import-prompt';

const createUnresolvedName = (
  field: UnresolvedName['field'],
  label: string,
  originalName: unknown,
  refs?: UnresolvedNameRef[],
): UnresolvedName => ({
  field,
  label,
  originalName: String(originalName || '').trim(),
  mode: 'new',
  selectedMemberId: '',
  relationship: '',
  birthDate: '',
  gender: field === 'insured' ? 'male' : 'female',
  refs,
});

const getUnresolvedNameError = (item: UnresolvedName): string => {
  if (item.mode === 'new') {
    if (!item.originalName.replace(/様$/, '').trim()) return '名前を確認してください。';
    if (!item.relationship.trim()) return '続柄を入力してください。';
  }
  if (item.mode === 'existing' && !item.selectedMemberId) {
    return '既存の家族を選択してください。';
  }
  return '';
};

const PolicyForm: React.FC<PolicyFormProps> = ({
  isOpen,
  onClose,
  onAdd,
  onAddFamilyMember,
  familyMembers,
  existingPolicies = [],
  editingPolicy,
  valuationSettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importDrafts, setImportDrafts] = useState<ImportDraft[]>([]);
  const [pendingImportMembers, setPendingImportMembers] = useState<FamilyMember[]>([]);
  const [formImportWarnings, setFormImportWarnings] = useState<string[]>([]);
  const [policyPrompt, setPolicyPrompt] = useState(DEFAULT_POLICY_PROMPT);
  const [promptDraft, setPromptDraft] = useState(DEFAULT_POLICY_PROMPT);
  const [promptCopied, setPromptCopied] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [promptSaving, setPromptSaving] = useState(false);
  
  // マッチング未解決の名前管理
  const [unresolvedNames, setUnresolvedNames] = useState<UnresolvedName[]>([]);
  const [linkBeneficiaryToInsured, setLinkBeneficiaryToInsured] = useState(false);
  const allVisibleMembers = useMemo(
    () => [...pendingImportMembers, ...familyMembers],
    [familyMembers, pendingImportMembers],
  );
  const relationshipSuggestions = useMemo(
    () => mergeRelationshipSuggestions(allVisibleMembers.map(member => member.relationship)),
    [allVisibleMembers],
  );
  const namedFamilyMembers = useMemo(
    () => allVisibleMembers.filter(hasSearchableName),
    [allVisibleMembers],
  );
  const unresolvedNameErrors = useMemo(
    () => unresolvedNames.map(getUnresolvedNameError),
    [unresolvedNames],
  );
  const hasUnresolvedNameErrors = unresolvedNameErrors.some(Boolean);

  useEffect(() => {
    let cancelled = false;

    const readLegacyPrompt = () => {
      try {
        return window.localStorage.getItem(LEGACY_PROMPT_STORAGE_KEY)?.trim() || '';
      } catch {
        return '';
      }
    };

    const removeLegacyPrompt = () => {
      try {
        window.localStorage.removeItem(LEGACY_PROMPT_STORAGE_KEY);
      } catch {
        // ignore unavailable storage
      }
    };

    const isDefaultPrompt = (prompt: string) =>
      normalizePromptText(prompt) === normalizePromptText(DEFAULT_POLICY_PROMPT) ||
      LEGACY_DEFAULT_POLICY_PROMPTS.some(legacy => normalizePromptText(legacy) === normalizePromptText(prompt));

    const fetchPromptWithRetry = async () => {
      try {
        return await fetchPolicyPrompt();
      } catch (err) {
        const isTransientGatewayError = err instanceof ApiError
          && [502, 503, 504].includes(err.status);
        if (!isTransientGatewayError) throw err;
        await new Promise(resolve => window.setTimeout(resolve, 750));
        return fetchPolicyPrompt();
      }
    };

    const loadPrompt = async () => {
      const legacyPrompt = readLegacyPrompt();
      try {
        const saved = await fetchPromptWithRetry();
        let nextPrompt = saved.prompt?.trim() || DEFAULT_POLICY_PROMPT;
        const hasLegacyCustomPrompt = legacyPrompt && !isDefaultPrompt(legacyPrompt);
        const databasePromptIsDefault = isDefaultPrompt(nextPrompt);

        if (hasLegacyCustomPrompt && (saved.source === 'default' || databasePromptIsDefault)) {
          nextPrompt = (await savePolicyPrompt(legacyPrompt)).prompt;
        } else if (databasePromptIsDefault) {
          // カスタマイズしていない場合は旧デフォルトを最新のデフォルトに差し替える
          nextPrompt = DEFAULT_POLICY_PROMPT;
        }

        removeLegacyPrompt();
        if (!cancelled) {
          setPolicyPrompt(nextPrompt);
          setPromptDraft(nextPrompt);
        }
      } catch (err) {
        console.warn('Policy prompt could not be loaded; using the local default.', err);
        if (!cancelled && legacyPrompt && !isDefaultPrompt(legacyPrompt)) {
          setPolicyPrompt(legacyPrompt);
          setPromptDraft(legacyPrompt);
        }
      }
    };

    loadPrompt();
    return () => {
      cancelled = true;
    };
  }, []);

  const [formData, setFormData] = useState<Partial<Policy>>(() => buildDefaultFormData(familyMembers));

  // 開いた瞬間・編集対象が変わった瞬間にフォームを初期化する（レンダー中の派生state更新）
  const formSessionKey = isOpen ? (editingPolicy?.id ?? '__new__') : null;
  const [initializedFormKey, setInitializedFormKey] = useState<string | null>(null);

  if (formSessionKey !== initializedFormKey) {
    setInitializedFormKey(formSessionKey);
    if (formSessionKey !== null) {
      const source = editingPolicy ?? buildDefaultFormData(familyMembers);
      const normalized = source.currency === 'USD'
        ? applyValuationRateToPolicy(source as Policy, valuationSettings.usdJpyRate)
        : source;
      setFormData({
        ...normalized,
        beneficiaryAllocations: getBeneficiaryAllocations(normalized as Policy),
        ...(source.currency === 'USD' && source.paymentFrequency === 'single' && !source.paymentCurrency
          ? { paymentCurrency: editingPolicy ? 'USD' : 'JPY' }
          : {}),
      });
      setShowPasteArea(false);
      setShowPromptEditor(false);
      setPasteText('');
      setImportDrafts([]);
      setPendingImportMembers([]);
      setFormImportWarnings([]);
      setUnresolvedNames([]);
      setLinkBeneficiaryToInsured(false);
      setPromptCopied(false);
      setPromptSaved(false);
    }
  }

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const normalizeRawPolicyJson = (rawJson: ImportRecord): ImportRecord => {
    const keyMap: Record<string, string> = {
      '保険会社': 'companyName',
      '保険会社名': 'companyName',
      '保険種類': 'policyType',
      '証券番号': 'policyNumber',
      '契約日': 'contractDate',
      '契約年齢': 'contractAge',
      '被保険者': 'insuredName',
      '被保険者名': 'insuredName',
      '被保険者生年月日': 'insuredBirthDate',
      '生年月日': 'insuredBirthDate',
      '保険対象者': 'insuredName',
      '受取人': 'beneficiaryName',
      '受取人名': 'beneficiaryName',
      '保険金受取人': 'beneficiaryName',
      '死亡保険金受取人': 'beneficiaryName',
      '死亡保障疾病': 'deathBenefitDisease',
      '死亡保障（疾病）': 'deathBenefitDisease',
      '死亡保険金': 'deathBenefitDisease',
      '死亡保険金額': 'deathBenefitDisease',
      '死亡保険金月額': 'deathBenefitDisease',
      '保険金額': 'deathBenefitDisease',
      '死亡保障災害': 'deathBenefitAccident',
      '死亡保障（災害）': 'deathBenefitAccident',
      '災害死亡保障': 'deathBenefitAccident',
      '災害死亡保険金': 'deathBenefitAccident',
      '入院日額疾病': 'hospDayDisease',
      '入院日額（疾病）': 'hospDayDisease',
      '入院給付金日額': 'hospDayDisease',
      '疾病入院日額': 'hospDayDisease',
      '入院日額災害': 'hospDayAccident',
      '入院日額（災害）': 'hospDayAccident',
      '災害入院日額': 'hospDayAccident',
      '診断一時金': 'diagnosisBenefit',
      '診断給付金': 'diagnosisBenefit',
      'がん診断一時金': 'diagnosisBenefit',
      'がん診断給付金': 'diagnosisBenefit',
      '保険期間': 'policyEndAge',
      '保障期間': 'policyEndAge',
      '満期年齢': 'policyEndAge',
      '保険期間終了年齢': 'policyEndAge',
      '保障終了年齢': 'policyEndAge',
      '年金受取終了年齢': 'policyEndAge',
      '受取終了年齢': 'policyEndAge',
      '通貨': 'currency',
      '為替レート': 'contractExchangeRate',
      '換算レート': 'contractExchangeRate',
      '適用為替レート': 'contractExchangeRate',
      '契約時為替レート': 'contractExchangeRate',
      '保険料USD': 'foreignPremiumAmount',
      '保険料ドル': 'foreignPremiumAmount',
      '死亡保障疾病USD': 'foreignDeathBenefitDisease',
      '死亡保険金USD': 'foreignDeathBenefitDisease',
      '死亡保険金月額USD': 'foreignDeathBenefitDisease',
      '死亡保障災害USD': 'foreignDeathBenefitAccident',
      '災害死亡保険金USD': 'foreignDeathBenefitAccident',
      '入院日額疾病USD': 'foreignHospDayDisease',
      '入院給付金日額USD': 'foreignHospDayDisease',
      '入院日額災害USD': 'foreignHospDayAccident',
      '診断一時金USD': 'foreignDiagnosisBenefit',
      '診断給付金USD': 'foreignDiagnosisBenefit',
      '満期保険金USD': 'foreignMaturityBenefit',
      '年金原資USD': 'foreignMaturityBenefit',
      '解約返戻金USD': 'foreignMaturityBenefit',
      '払方': 'paymentFrequency',
      '払込方法': 'paymentFrequency',
      '保険料': 'premiumAmount',
      '払込終了年齢': 'paymentEndAge',
      '払込満了年齢': 'paymentEndAge',
      '払込期間': 'paymentEndAge',
      '年金受取開始年齢': 'paymentEndAge',
      '受取開始年齢': 'paymentEndAge',
      '満期保険金': 'maturityBenefit',
      '年金原資': 'maturityBenefit',
      '年金受取総額': 'maturityBenefit',
      '解約返戻金': 'maturityBenefit',
      '返戻金': 'maturityBenefit',
      '解約返戻金推移': 'surrenderValues',
      '年齢別解約返戻金': 'surrenderValues',
      '解約返戻金表': 'surrenderValues',
      '返戻金推移': 'surrenderValues',
      'コンサルタントメモ': 'consultantNote',
      'メモ': 'consultantNote',
    };

    const json: ImportRecord = {};
    for (const [k, v] of Object.entries(rawJson || {})) {
      const trimmedKey = k.trim();
      const mappedKey = keyMap[trimmedKey] || trimmedKey;
      json[mappedKey] = v;
    }
    return json;
  };

  const parseImportNum = (v: unknown) => {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    const text = String(v).replace(/,/g, '');
    const manMatch = text.match(/([\d.]+)\s*万/);
    if (manMatch) return Math.round(Number(manMatch[1]) * 10000);
    const cleaned = text.match(/\d+/);
    return cleaned ? parseInt(cleaned[0], 10) : 0;
  };

  const parseImportDecimal = (v: unknown) => {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    const cleaned = String(v).replace(/,/g, '').match(/[\d.]+/);
    return cleaned ? Number(cleaned[0]) : 0;
  };

  const parseImportAge = (v: unknown) => {
    const text = String(v ?? '').trim();
    if (!text) return 0;
    if (/(終身|一生涯)/.test(text)) return 999;
    return parseImportNum(text);
  };

  // AI取込JSONの「解約返戻金推移」を年齢別データに変換
  // [{年齢,金額}] / [{経過年数,解約返戻金}] / [[年齢,金額]] / {"60":1200000} のいずれにも対応
  const parseImportSurrenderValues = (
    value: unknown,
    contractAge: number,
    currency: Policy['currency'],
    exchangeRate: number,
  ): SurrenderValuePoint[] | undefined => {
    if (!value) return undefined;

    const entries: { rawAge: unknown; rawAmount: unknown; isElapsed: boolean; isForeign: boolean }[] = [];
    const pushObject = (obj: ImportRecord) => {
      const findKey = (pattern: RegExp) => Object.keys(obj).find(k => pattern.test(k.trim()));
      const elapsedKey = findKey(/^(経過年数|経過|年数|経過年|年目)$/);
      const ageKey = findKey(/^(年齢|歳|age)$/i);
      const foreignKey = findKey(/(USD|ドル)/);
      const amountKey = findKey(/(金額|解約返戻金|返戻金|amount|value)/i);
      const rawAge = ageKey !== undefined ? obj[ageKey] : (elapsedKey !== undefined ? obj[elapsedKey] : undefined);
      const rawAmount = foreignKey !== undefined ? obj[foreignKey] : (amountKey !== undefined ? obj[amountKey] : undefined);
      if (rawAge === undefined || rawAmount === undefined) return;
      entries.push({
        rawAge,
        rawAmount,
        isElapsed: ageKey === undefined && elapsedKey !== undefined,
        isForeign: foreignKey !== undefined,
      });
    };

    if (Array.isArray(value)) {
      value.forEach(item => {
        if (Array.isArray(item) && item.length >= 2) {
          entries.push({ rawAge: item[0], rawAmount: item[1], isElapsed: false, isForeign: false });
        } else if (item && typeof item === 'object') {
          pushObject(item as ImportRecord);
        }
      });
    } else if (typeof value === 'object') {
      Object.entries(value as ImportRecord).forEach(([k, v]) => {
        entries.push({ rawAge: k, rawAmount: v, isElapsed: /年目|経過/.test(k), isForeign: false });
      });
    } else {
      return undefined;
    }

    const points: SurrenderValuePoint[] = [];
    entries.forEach(({ rawAge, rawAmount, isElapsed, isForeign }) => {
      const ageText = String(rawAge ?? '');
      const ageNum = parseImportNum(ageText);
      if (!ageNum && ageNum !== 0) return;
      const elapsed = isElapsed || (/年目|経過/.test(ageText) && !/歳|才/.test(ageText));
      const age = elapsed ? contractAge + ageNum : ageNum;
      if (!Number.isFinite(age) || age < 0 || age > 120) return;

      const useForeign = currency === 'USD' && (isForeign || exchangeRate > 0);
      const amountNum = isForeign ? parseImportDecimal(rawAmount) : parseImportNum(rawAmount);
      if (!Number.isFinite(amountNum) || amountNum < 0) return;

      points.push(useForeign && isForeign
        ? { age, amount: yenFromForeign(amountNum, exchangeRate), foreignAmount: amountNum }
        : { age, amount: Math.round(amountNum) });
    });

    if (points.length === 0) return undefined;
    const byAge = new Map<number, SurrenderValuePoint>();
    points.forEach(point => byAge.set(point.age, point));
    return [...byAge.values()].sort((a, b) => a.age - b.age);
  };

  const parseImportDate = (v: unknown) => {
    if (!v) return '';
    const d = String(v);
    const stdMatch = d.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (stdMatch) return `${stdMatch[1]}-${stdMatch[2].padStart(2, '0')}-${stdMatch[3].padStart(2, '0')}`;
    const japaneseDateMatch = d.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})/);
    if (japaneseDateMatch) return `${japaneseDateMatch[1]}-${japaneseDateMatch[2].padStart(2, '0')}-${japaneseDateMatch[3].padStart(2, '0')}`;
    return '';
  };

  const parseImportPolicyType = (v: unknown): PolicyType => {
    const type = String(v || '');
    if (type.includes('収入保障定期')) return '収入保障保険';
    if (type.includes('収入保障')) return '収入保障保険';
    if (type.includes('がん') || type.includes('ガン') || type.includes('癌')) return 'がん保険';
    if (type.includes('医療')) return '医療保険';
    if (type.includes('年金')) return '個人年金保険';
    if (type.includes('変額')) return '変額終身保険';
    if (type.includes('養老')) return '養老保険';
    if (type.includes('定期') && !type.includes('終身')) return '定期保険';
    const normalized = normalizePolicyType(type);
    if (DISPLAY_POLICY_TYPES.includes(normalized)) return normalized;
    return '終身保険';
  };

  const parseImportFrequency = (v: unknown): Policy['paymentFrequency'] => {
    const f = String(v || '').trim().toLowerCase();
    if (f.includes('single') || f.includes('lump') || f.includes('一時')) return 'single';
    if (f.includes('annual') || f.includes('year') || f.includes('年')) return 'annual';
    if (f.includes('monthly') || f.includes('month') || f.includes('月')) return 'monthly';
    return 'monthly';
  };

  const extractImportRecords = (parsed: unknown): ImportRecord[] => {
    if (Array.isArray(parsed)) return parsed as ImportRecord[];
    if (!parsed || typeof parsed !== 'object') return [];
    const root = parsed as ImportRecord;

    for (const key of ['policies', '保険証券', '証券', 'items', 'data']) {
      if (Array.isArray(root[key])) return root[key] as ImportRecord[];
    }
    for (const key of ['policy', '証券', '保険証券', 'data']) {
      const child = root[key];
      if (child && typeof child === 'object') return [child as ImportRecord];
    }
    return [root];
  };

  const findMemberIdByName = (members: FamilyMember[], nameStr: unknown) => {
    const target = normalizePersonName(nameStr);
    if (!target) return '';

    const candidates = members
      .map(member => ({
        id: member.id,
        name: normalizePersonName(member.name),
        kana: normalizePersonName(member.nameKana),
      }))
      .filter(member => member.name || member.kana);

    const exactMatch = candidates.find(member => member.name === target || member.kana === target);
    if (exactMatch) return exactMatch.id;

    const partialMatch = candidates.find(member => (
      (member.name && (member.name.includes(target) || target.includes(member.name))) ||
      (member.kana && (member.kana.includes(target) || target.includes(member.kana)))
    ));
    return partialMatch?.id || '';
  };

  const addPreviewUnresolved = (
    map: Map<string, UnresolvedName>,
    draftId: string,
    field: UnresolvedName['field'],
    label: string,
    originalName: unknown,
    birthDate = '',
  ) => {
    const name = String(originalName || '').trim();
    const key = normalizePersonName(name) || `${field}:${name}`;
    const ref = { draftId, field };
    const existing = map.get(key);
    if (existing) {
      existing.refs = [...(existing.refs || []), ref];
      if (!existing.birthDate && birthDate) existing.birthDate = birthDate;
      if (!existing.label.includes(label)) existing.label = '被保険者/受取人';
      return;
    }

    const initialPlaceholder = familyMembers.some(hasSearchableName)
      ? undefined
      : familyMembers.find(isEmptyFamilyPlaceholder);
    const item = createUnresolvedName(field, label, name, [ref]);
    if (field === 'insured') item.relationship = initialPlaceholder?.relationship || '本人';
    if (birthDate) item.birthDate = birthDate;
    map.set(key, item);
  };

  const buildImportDraft = (
    rawJson: ImportRecord,
    unresolvedMap: Map<string, UnresolvedName>,
  ): ImportDraft => {
    const json = normalizeRawPolicyJson(rawJson);
    const draftId = uuidv4();
    const currencyText = String(json.currency || '').trim().toUpperCase();
    const hasForeignAmounts = [
      json.foreignPremiumAmount,
      json.foreignDeathBenefitDisease,
      json.foreignDeathBenefitAccident,
      json.foreignHospDayDisease,
      json.foreignHospDayAccident,
      json.foreignDiagnosisBenefit,
      json.foreignMaturityBenefit,
    ].some(value => parseImportDecimal(value) > 0);
    const currency: Policy['currency'] = currencyText.includes('USD') || currencyText.includes('ドル') || hasForeignAmounts ? 'USD' : 'JPY';
    const contractExchangeRate = currency === 'USD'
      ? parseImportDecimal(json.contractExchangeRate ?? json.exchangeRate)
      : 0;
    const exchangeRate = currency === 'USD' ? valuationSettings.usdJpyRate : 0;
    const foreignPremiumAmount = parseImportDecimal(json.foreignPremiumAmount);
    const foreignDeathBenefitDisease = parseImportDecimal(json.foreignDeathBenefitDisease);
    const foreignDeathBenefitAccident = parseImportDecimal(json.foreignDeathBenefitAccident);
    const foreignHospDayDisease = parseImportDecimal(json.foreignHospDayDisease);
    const foreignHospDayAccident = parseImportDecimal(json.foreignHospDayAccident);
    const foreignDiagnosisBenefit = parseImportDecimal(json.foreignDiagnosisBenefit);
    const foreignMaturityBenefit = parseImportDecimal(json.foreignMaturityBenefit);
    const policyType = parseImportPolicyType(json.policyType);
    const isPensionImport = policyType === '個人年金保険';
    const hasDeathBenefit = DEATH_BENEFIT_TYPES.includes(policyType);
    const hasMedicalBenefit = MEDICAL_BENEFIT_TYPES.includes(policyType);
    const hasDiagnosisBenefit = DIAGNOSIS_BENEFIT_TYPES.includes(policyType);
    const hasMaturityBenefit = isPensionImport || MATURITY_BENEFIT_TYPES.includes(policyType);
    const hasAccidentDeathBenefit = hasDeathBenefit && !isIncomeProtectionPolicyType(policyType);
    const importContractAge = parseImportNum(json.contractAge);

    const data: Partial<Policy> = {
      companyName: json.companyName ? String(json.companyName).replace(/様$/, '').trim() : '',
      policyType,
      policyNumber: json.policyNumber ? String(json.policyNumber).trim() : '',
      contractDate: parseImportDate(json.contractDate),
      contractAge: importContractAge,
      deathBenefitDisease: hasDeathBenefit
        ? (currency === 'USD' && foreignDeathBenefitDisease > 0 ? yenFromForeign(foreignDeathBenefitDisease, exchangeRate) : parseImportNum(json.deathBenefitDisease))
        : 0,
      deathBenefitAccident: hasAccidentDeathBenefit
        ? (currency === 'USD' && foreignDeathBenefitAccident > 0 ? yenFromForeign(foreignDeathBenefitAccident, exchangeRate) : parseImportNum(json.deathBenefitAccident))
        : 0,
      hospDayDisease: hasMedicalBenefit
        ? (currency === 'USD' && foreignHospDayDisease > 0 ? yenFromForeign(foreignHospDayDisease, exchangeRate) : parseImportNum(json.hospDayDisease))
        : 0,
      hospDayAccident: hasMedicalBenefit
        ? (currency === 'USD' && foreignHospDayAccident > 0 ? yenFromForeign(foreignHospDayAccident, exchangeRate) : parseImportNum(json.hospDayAccident))
        : 0,
      diagnosisBenefit: hasDiagnosisBenefit
        ? (currency === 'USD' && foreignDiagnosisBenefit > 0 ? yenFromForeign(foreignDiagnosisBenefit, exchangeRate) : parseImportNum(json.diagnosisBenefit))
        : 0,
      policyEndAge: parseImportAge(json.policyEndAge),
      currency,
      exchangeRate,
      contractExchangeRate: contractExchangeRate > 0 ? contractExchangeRate : undefined,
      foreignPremiumAmount,
      foreignDeathBenefitDisease: hasDeathBenefit ? foreignDeathBenefitDisease : 0,
      foreignDeathBenefitAccident: hasAccidentDeathBenefit ? foreignDeathBenefitAccident : 0,
      foreignHospDayDisease: hasMedicalBenefit ? foreignHospDayDisease : 0,
      foreignHospDayAccident: hasMedicalBenefit ? foreignHospDayAccident : 0,
      foreignDiagnosisBenefit: hasDiagnosisBenefit ? foreignDiagnosisBenefit : 0,
      foreignMaturityBenefit: hasMaturityBenefit ? foreignMaturityBenefit : 0,
      paymentFrequency: parseImportFrequency(json.paymentFrequency),
      premiumAmount: currency === 'USD' && foreignPremiumAmount > 0 ? yenFromForeign(foreignPremiumAmount, exchangeRate) : parseImportNum(json.premiumAmount),
      paymentEndAge: parseImportAge(json.paymentEndAge),
      maturityBenefit: hasMaturityBenefit
        ? (currency === 'USD' && foreignMaturityBenefit > 0 ? yenFromForeign(foreignMaturityBenefit, exchangeRate) : parseImportNum(json.maturityBenefit))
        : 0,
      surrenderValues: hasMaturityBenefit
        ? parseImportSurrenderValues(json.surrenderValues, importContractAge, currency, exchangeRate)
        : undefined,
      consultantNote: json.consultantNote ? String(json.consultantNote).trim() : undefined,
    };

    const existingMemberIds = new Set(familyMembers.map(member => member.id));
    const insuredName = String(json.insuredName || '').trim();
    const insuredBirthDate = parseImportDate(json.insuredBirthDate);
    const beneficiaryName = String(json.beneficiaryName || '').trim();
    const insuredId = typeof json.insuredId === 'string' && existingMemberIds.has(json.insuredId)
      ? json.insuredId
      : findMemberIdByName(familyMembers, insuredName);

    if (!insuredId && insuredName) {
      addPreviewUnresolved(unresolvedMap, draftId, 'insured', '被保険者', insuredName, insuredBirthDate);
    }

    const beneficiaryIsSameAsInsured = Boolean(
      beneficiaryName && normalizePersonName(beneficiaryName) === normalizePersonName(insuredName),
    );
    const linkBeneficiaryToInsured = Boolean(
      beneficiaryName.match(/^(本人|被保険者|同上|被保険者と同じ|左記に同じ)$/) || beneficiaryIsSameAsInsured,
    );

    let beneficiaryId = typeof json.beneficiaryId === 'string' && existingMemberIds.has(json.beneficiaryId)
      ? json.beneficiaryId
      : '';
    if (linkBeneficiaryToInsured) {
      beneficiaryId = insuredId;
    } else {
      beneficiaryId = beneficiaryId || findMemberIdByName(familyMembers, beneficiaryName);
      if (!beneficiaryId && beneficiaryName) {
        addPreviewUnresolved(unresolvedMap, draftId, 'beneficiary', '受取人', beneficiaryName);
      }
    }

    const duplicate = data.policyNumber
      ? existingPolicies.find(policy => policy.policyNumber && policy.policyNumber === data.policyNumber)
      : undefined;
    const warnings: string[] = [];
    if (!data.companyName) warnings.push('保険会社が未入力です');
    if (!data.contractDate) warnings.push('契約日が未入力または判別できません');
    if (!insuredName && !insuredId) warnings.push('被保険者が未入力です');
    if (!data.premiumAmount) warnings.push('保険料が0円です');
    if (data.currency === 'USD' && valuationSettings.usdJpyRate <= 0) {
      warnings.push('ドル建てですが、基本情報の現在評価用為替レートが未入力です');
    }
    if (!data.policyEndAge) warnings.push('保険期間が未入力です');
    if (data.paymentEndAge && data.contractAge && data.paymentEndAge < data.contractAge) {
      warnings.push('払込終了年齢が契約年齢より若くなっています');
    }
    if (duplicate) warnings.push(`証券番号「${data.policyNumber}」は既存証券と重複しています`);

    return {
      id: draftId,
      data,
      insuredId,
      beneficiaryId,
      linkBeneficiaryToInsured,
      insuredName,
      beneficiaryName,
      warnings,
    };
  };

  const prepareJsonImport = (parsed: unknown) => {
    const records = extractImportRecords(parsed);
    if (records.length === 0) throw new Error('JSONに証券データがありません');
    if (records.length > 1) throw new Error('複数件のJSONはフォーム反映できません。1件ずつ取り込んでください。');

    const unresolvedMap = new Map<string, UnresolvedName>();
    const draft = buildImportDraft(records[0], unresolvedMap);
    setPendingImportMembers([]);
    setImportDrafts([]);
    setFormImportWarnings([]);
    setLinkBeneficiaryToInsured(false);
    setFormErrors({});

    const unresolved = [...unresolvedMap.values()];
    if (unresolved.length > 0) {
      setImportDrafts([draft]);
      setUnresolvedNames(unresolved);
      setShowPasteArea(false);
      return;
    }

    reflectImportDraftToForm(draft);
    setUnresolvedNames([]);
  };

  const parseImportJsonText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('JSONが空です');

    const candidates = [trimmed];
    const fencedMatches = trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi);
    for (const match of fencedMatches) {
      if (match[1]?.trim()) candidates.push(match[1].trim());
    }

    const objectStart = trimmed.indexOf('{');
    const arrayStart = trimmed.indexOf('[');
    const starts = [objectStart, arrayStart].filter(index => index >= 0);
    if (starts.length > 0) {
      const start = Math.min(...starts);
      const close = trimmed[start] === '[' ? ']' : '}';
      const end = trimmed.lastIndexOf(close);
      if (end > start) candidates.push(trimmed.slice(start, end + 1));
    }

    const uniqueCandidates = [...new Set(candidates)];
    for (const candidate of uniqueCandidates) {
      try {
        return JSON.parse(candidate);
      } catch {
        // Try the next likely JSON fragment.
      }
    }

    throw new Error('JSONの解析に失敗しました');
  };

  const reflectImportDraftToForm = (draft: ImportDraft, members: FamilyMember[] = []) => {
    members.forEach(member => onAddFamilyMember?.(member));
    // 取込データに契約年齢がない場合は被保険者の生年月日と契約日から自動計算
    const insuredMember = [...members, ...familyMembers].find(m => m.id === draft.insuredId);
    const autoContractAge = !draft.data.contractAge
      ? calcAgeAt(insuredMember?.birthDate || '', draft.data.contractDate || '')
      : null;
    const importedBeneficiaryId = draft.beneficiaryId || '';
    setFormData(prev => ({
      ...prev,
      ...draft.data,
      ...(autoContractAge !== null ? { contractAge: autoContractAge } : {}),
      insuredId: draft.insuredId || '',
      beneficiaryId: importedBeneficiaryId,
      beneficiaryAllocations: importedBeneficiaryId
        ? [{ beneficiaryId: importedBeneficiaryId, percentage: 100 }]
        : [],
    }));
    setFormImportWarnings(draft.warnings);
    setImportDrafts([]);
    setPendingImportMembers([]);
    setPasteText('');
    setShowPasteArea(false);
    setFormErrors({});
  };

  const updateUnresolvedName = (index: number, changes: Partial<UnresolvedName>) => {
    setUnresolvedNames(prev => prev.map((item, i) => i === index ? { ...item, ...changes } : item));
  };

  const handleUnresolvedModeChange = (index: number, value: string) => {
    if (value.startsWith('existing:')) {
      updateUnresolvedName(index, {
        mode: 'existing',
        selectedMemberId: value.replace('existing:', ''),
      });
      return;
    }

    updateUnresolvedName(index, {
      mode: value as UnresolvedName['mode'],
      selectedMemberId: '',
    });
  };

  const applyUnresolvedNames = () => {
    if (hasUnresolvedNameErrors) return;

    const resolvedIds: Partial<Record<UnresolvedName['field'], string>> = {};
    const draftResolvedIds: Record<string, Partial<Record<UnresolvedName['field'], string>>> = {};
    const createdImportMembers: FamilyMember[] = [];
    const hasPreviewRefs = unresolvedNames.some(item => item.refs && item.refs.length > 0);
    const reusableInitialMemberId = familyMembers.some(hasSearchableName)
      ? null
      : familyMembers.find(isEmptyFamilyPlaceholder)?.id ?? null;
    let usedReusableInitialMember = false;

    for (const item of unresolvedNames) {
      let finalId = '';

      if (item.mode === 'existing') {
        finalId = item.selectedMemberId;
      } else if (item.mode === 'new') {
        const name = item.originalName.replace(/様$/, '').trim();
        const relationship = item.relationship.trim();

        if (!name || !relationship) {
          return;
        }

        const shouldReuseInitialMember =
          item.field === 'insured' && Boolean(reusableInitialMemberId) && !usedReusableInitialMember;
        const newMember: FamilyMember = {
          id: shouldReuseInitialMember ? reusableInitialMemberId! : uuidv4(),
          name,
          nameKana: '',
          relationship,
          birthDate: item.birthDate,
          gender: item.gender,
        };
        if (hasPreviewRefs) {
          createdImportMembers.push(newMember);
        } else {
          onAddFamilyMember?.(newMember);
        }
        if (shouldReuseInitialMember) usedReusableInitialMember = true;
        finalId = newMember.id;
      }

      if (finalId) {
        if (item.refs?.length) {
          for (const ref of item.refs) {
            draftResolvedIds[ref.draftId] = {
              ...(draftResolvedIds[ref.draftId] || {}),
              [ref.field]: finalId,
            };
          }
        } else {
          resolvedIds[item.field] = finalId;
          if (item.field === 'insured' && linkBeneficiaryToInsured) {
            resolvedIds.beneficiary = finalId;
          }
        }
      }
    }

    if (hasPreviewRefs) {
      const nextImportMembers = [...pendingImportMembers];
      for (const member of createdImportMembers) {
        const index = nextImportMembers.findIndex(existing => existing.id === member.id);
        if (index >= 0) nextImportMembers[index] = { ...nextImportMembers[index], ...member };
        else nextImportMembers.push(member);
      }

      const nextDrafts = importDrafts.map(draft => {
        const resolved = draftResolvedIds[draft.id];
        if (!resolved) return draft;
        const insuredId = resolved.insured || draft.insuredId;
        return {
          ...draft,
          insuredId,
          beneficiaryId: resolved.beneficiary || (draft.linkBeneficiaryToInsured && resolved.insured ? resolved.insured : draft.beneficiaryId),
        };
      });

      const draft = nextDrafts[0];
      if (draft) reflectImportDraftToForm(draft, nextImportMembers);
      else {
        setPendingImportMembers(nextImportMembers);
        setImportDrafts(nextDrafts);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        insuredId: resolvedIds.insured || prev.insuredId,
        beneficiaryId: resolvedIds.beneficiary || prev.beneficiaryId,
        beneficiaryAllocations: resolvedIds.beneficiary
          ? [{ beneficiaryId: resolvedIds.beneficiary, percentage: 100 }]
          : prev.beneficiaryAllocations,
      }));
    }
    setUnresolvedNames([]);
    setLinkBeneficiaryToInsured(false);
  };

  const skipUnresolvedNames = () => {
    const draft = importDrafts[0];
    if (draft) {
      reflectImportDraftToForm(draft, pendingImportMembers);
    }
    setUnresolvedNames([]);
    setLinkBeneficiaryToInsured(false);
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        prepareJsonImport(parseImportJsonText(content));
      } catch (err) {
        console.error('JSON Import Error:', err);
        alert(err instanceof Error ? err.message : 'JSONの解析に失敗しました。JSONのみ、または```jsonのコードブロックで出力された内容を指定してください。');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    try {
      const latestPasteText = pasteTextareaRef.current?.value ?? pasteText;
      if (!latestPasteText.trim()) return;
      prepareJsonImport(parseImportJsonText(latestPasteText));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'JSONの解析に失敗しました。JSONのみ、または```jsonのコードブロックで貼り付けてください。');
    }
  };

  const setField = <K extends keyof Policy>(field: K, value: Policy[K]) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const getMoneyValue = (yenField: keyof Policy, foreignField: keyof Policy) => (
    formData.currency === 'USD'
      ? Number(formData[foreignField] || 0)
      : Number(formData[yenField] || 0)
  );

  const setMoneyField = (yenField: keyof Policy, foreignField: keyof Policy, value: number) => {
    setFormData(prev => {
      const isUsd = prev.currency === 'USD';
      const exchangeRate = valuationSettings.usdJpyRate;
      const preserveActualJpyPremium = yenField === 'premiumAmount'
        && prev.paymentFrequency === 'single'
        && prev.paymentCurrency === 'JPY'
        && (prev.actualPremiumPaidJpy || 0) > 0;
      return {
        ...prev,
        [foreignField]: isUsd ? value : 0,
        [yenField]: preserveActualJpyPremium
          ? prev.actualPremiumPaidJpy
          : isUsd ? yenFromForeign(value, exchangeRate) : value,
      };
    });
  };

  const setCurrency = (currency: Policy['currency']) => {
    setFormData(prev => {
      if (currency !== 'USD') {
        return {
          ...prev,
          currency: 'JPY',
          exchangeRate: 0,
          contractExchangeRate: undefined,
          paymentCurrency: undefined,
          premiumPaymentDate: undefined,
          actualPremiumPaidJpy: undefined,
          paymentExchangeRate: undefined,
          foreignPremiumAmount: 0,
          foreignDeathBenefitDisease: 0,
          foreignDeathBenefitAccident: 0,
          foreignHospDayDisease: 0,
          foreignHospDayAccident: 0,
          foreignDiagnosisBenefit: 0,
          foreignMaturityBenefit: 0,
          surrenderValues: prev.surrenderValues?.map(({ age, amount }) => ({ age, amount })),
        };
      }
      const nextRate = valuationSettings.usdJpyRate;
      return {
        ...prev,
        currency: 'USD',
        exchangeRate: nextRate,
        paymentCurrency: prev.paymentFrequency === 'single' ? (prev.paymentCurrency || 'JPY') : prev.paymentCurrency,
        // 円で入力済みの返戻金はドル額に変換しておく（外貨欄が0のまま円換算だけ残るのを防ぐ）
        surrenderValues: prev.surrenderValues?.map(point => (
          point.foreignAmount !== undefined
            ? point
            : { ...point, foreignAmount: nextRate > 0 ? Math.round(point.amount / nextRate) : 0 }
        )),
      };
    });
  };

  const setBeneficiaryAllocations = (allocations: BeneficiaryAllocation[]) => {
    setFormData(prev => ({
      ...prev,
      beneficiaryId: allocations[0]?.beneficiaryId || '',
      beneficiaryAllocations: allocations,
    }));
    setFormErrors(prev => ({ ...prev, beneficiaryId: '', beneficiaryAllocations: '' }));
  };

  const updateBeneficiaryAllocation = (
    index: number,
    field: keyof BeneficiaryAllocation,
    value: string | number,
  ) => {
    const allocations = getBeneficiaryAllocations(formData as Policy).map((allocation, allocationIndex) => (
      allocationIndex === index ? { ...allocation, [field]: value } : allocation
    ));
    setBeneficiaryAllocations(allocations);
  };

  const addBeneficiaryAllocation = () => {
    const current = getBeneficiaryAllocations(formData as Policy);
    const usedIds = new Set(current.map(allocation => allocation.beneficiaryId));
    const nextMember = familyMembers.find(member => !usedIds.has(member.id));
    if (!nextMember) return;
    const count = current.length + 1;
    const basePercentage = Math.floor((100 / count) * 100) / 100;
    const allocations = [
      ...current.map(allocation => ({ ...allocation, percentage: basePercentage })),
      {
        beneficiaryId: nextMember.id,
        percentage: Number((100 - basePercentage * current.length).toFixed(2)),
      },
    ];
    setBeneficiaryAllocations(allocations);
  };

  const removeBeneficiaryAllocation = (index: number) => {
    const remaining = getBeneficiaryAllocations(formData as Policy).filter((_, allocationIndex) => allocationIndex !== index);
    if (remaining.length === 1) remaining[0] = { ...remaining[0], percentage: 100 };
    setBeneficiaryAllocations(remaining);
  };

  const defaultFiniteEndAge = (contractAge?: number) => Math.max(60, Number(contractAge || 50) + 10);

  const setPolicyType = (policyType: PolicyType) => {
    setFormData(prev => {
      const next: Partial<Policy> = { ...prev, policyType };
      const hasDeathBenefit = DEATH_BENEFIT_TYPES.includes(policyType);
      const hasMedicalBenefit = MEDICAL_BENEFIT_TYPES.includes(policyType);
      const hasDiagnosisBenefit = DIAGNOSIS_BENEFIT_TYPES.includes(policyType);
      const hasMaturityBenefit = policyType === '個人年金保険' || MATURITY_BENEFIT_TYPES.includes(policyType);
      const hasBeneficiary = BENEFICIARY_TYPES.includes(policyType);
      const isIncomeProtectionType = isIncomeProtectionPolicyType(policyType);

      if (WHOLE_LIFE_COVERAGE_TYPES.includes(policyType)) {
        next.policyEndAge = 999;
      }
      if (FINITE_END_AGE_TYPES.includes(policyType) && prev.policyEndAge === 999) {
        next.policyEndAge = defaultFiniteEndAge(prev.contractAge);
      }

      if (policyType === '個人年金保険') {
        const startAge = prev.paymentEndAge === 999 ? defaultFiniteEndAge(prev.contractAge) : Number(prev.paymentEndAge || defaultFiniteEndAge(prev.contractAge));
        next.paymentEndAge = startAge;
        next.policyEndAge = prev.policyEndAge && prev.policyEndAge !== 999 && prev.policyEndAge > startAge
          ? prev.policyEndAge
          : startAge + 10;
        next.pensionRecipientId = prev.pensionRecipientId || prev.insuredId || '';
        next.pensionSuccessorRecipientId = prev.pensionSuccessorRecipientId || '';
        next.pensionStartMode = prev.pensionStartMode || 'age';
        next.pensionPayoutYears = prev.pensionPayoutYears
          || (next.policyEndAge !== 999 ? Math.max(1, Number(next.policyEndAge) - startAge) : 20);
        next.pensionStartFiscalYear = prev.pensionStartFiscalYear || getCurrentFiscalYear();
      }

      if (!hasBeneficiary) {
        next.beneficiaryId = '';
        next.beneficiaryAllocations = [];
      } else if (!prev.beneficiaryId) {
        next.beneficiaryId = prev.insuredId;
        next.beneficiaryAllocations = prev.insuredId
          ? [{ beneficiaryId: prev.insuredId, percentage: 100 }]
          : [];
      }

      if (!hasDeathBenefit) {
        next.deathBenefitDisease = 0;
        next.deathBenefitAccident = 0;
        next.foreignDeathBenefitDisease = 0;
        next.foreignDeathBenefitAccident = 0;
      } else if (isIncomeProtectionType) {
        next.deathBenefitAccident = 0;
        next.foreignDeathBenefitAccident = 0;
      }

      if (!hasMedicalBenefit) {
        next.hospDayDisease = 0;
        next.hospDayAccident = 0;
        next.foreignHospDayDisease = 0;
        next.foreignHospDayAccident = 0;
      }

      if (!hasDiagnosisBenefit) {
        next.diagnosisBenefit = 0;
        next.foreignDiagnosisBenefit = 0;
      }

      if (!hasMaturityBenefit) {
        next.maturityBenefit = 0;
        next.foreignMaturityBenefit = 0;
        next.surrenderValues = [];
      }

      return next as Policy;
    });
  };

  // 契約日・被保険者の変更時に契約年齢を満年齢で自動計算（手入力で上書き可）
  const setFieldWithContractAge = (field: 'contractDate' | 'insuredId', value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      const member = allVisibleMembers.find(m => m.id === next.insuredId);
      const age = calcAgeAt(member?.birthDate || '', next.contractDate || '');
      if (age !== null) next.contractAge = age;
      return next;
    });
  };

  const handlePromptEditorToggle = () => {
    if (showPromptEditor) {
      setShowPromptEditor(false);
      return;
    }
    setPromptDraft(policyPrompt);
    setPromptCopied(false);
    setPromptSaved(false);
    setShowPasteArea(false);
    setShowPromptEditor(true);
  };

  const handlePasteAreaToggle = () => {
    setShowPromptEditor(false);
    setShowPasteArea(current => !current);
  };

  const handleSavePrompt = async () => {
    const nextPrompt = promptDraft.trim();
    if (!nextPrompt) {
      alert('プロンプトを入力してください。');
      return;
    }

    setPromptSaving(true);
    try {
      const saved = await savePolicyPrompt(nextPrompt);
      setPolicyPrompt(saved.prompt);
      setPromptDraft(saved.prompt);
      setPromptSaved(true);
      window.setTimeout(() => setPromptSaved(false), 1800);
    } catch (err) {
      const message = err && typeof err === 'object' && 'error' in err
        ? String((err as { error?: unknown }).error)
        : 'プロンプトを保存できませんでした。';
      alert(message);
    } finally {
      setPromptSaving(false);
    }
  };

  const handleResetPromptDraft = () => {
    setPromptDraft(DEFAULT_POLICY_PROMPT);
    setPromptCopied(false);
    setPromptSaved(false);
  };

  const handleCopyPrompt = async (text = policyPrompt) => {
    try {
      await navigator.clipboard.writeText(text);
      setPromptCopied(true);
      window.setTimeout(() => setPromptCopied(false), 1800);
    } catch {
      alert('プロンプトをコピーできませんでした。');
    }
  };

  const isPension = formData.policyType === '個人年金保険';
  const selectedPolicyType = formData.policyType || '終身保険';
  const isIncomeProtection = isIncomeProtectionPolicyType(selectedPolicyType);
  const hasDeathBenefitFields = DEATH_BENEFIT_TYPES.includes(selectedPolicyType);
  const hasMedicalBenefitFields = MEDICAL_BENEFIT_TYPES.includes(selectedPolicyType);
  const hasDiagnosisBenefitFields = DIAGNOSIS_BENEFIT_TYPES.includes(selectedPolicyType);
  const hasMaturityBenefitField = isPension || MATURITY_BENEFIT_TYPES.includes(selectedPolicyType);
  const hasBeneficiaryField = BENEFICIARY_TYPES.includes(selectedPolicyType);
  const hasAccidentDeathBenefitField = hasDeathBenefitFields && !isIncomeProtection;
  const isWholeLifeCoverage = WHOLE_LIFE_COVERAGE_TYPES.includes(selectedPolicyType);
  const isContractDateOptional = isWholeLifeCoverage || isPension;
  const isUsdPolicy = formData.currency === 'USD';
  const currencyUnit = isUsdPolicy ? 'USD' : '円';
  const isWholeLifePayment = formData.paymentEndAge === 999;
  const pensionStartMode = formData.pensionStartMode || 'age';
  const pensionStartFiscalYear = Number(formData.pensionStartFiscalYear || getCurrentFiscalYear());
  const pensionInsured = allVisibleMembers.find(member => member.id === formData.insuredId);
  const fiscalYearOptions = useMemo(() => {
    const currentFiscalYear = getCurrentFiscalYear();
    const years = Array.from({ length: 91 }, (_, index) => currentFiscalYear - 10 + index);
    if (pensionStartFiscalYear >= 1900 && pensionStartFiscalYear <= 2200 && !years.includes(pensionStartFiscalYear)) {
      years.push(pensionStartFiscalYear);
    }
    return years.sort((a, b) => a - b);
  }, [pensionStartFiscalYear]);
  const autoContractAge = useMemo(() => {
    const member = allVisibleMembers.find(m => m.id === formData.insuredId);
    return calcAgeAt(member?.birthDate || '', formData.contractDate || '');
  }, [allVisibleMembers, formData.contractDate, formData.insuredId]);
  const isContractAgeOverridden = autoContractAge !== null
    && Number(formData.contractAge) !== autoContractAge;
  const pensionStartAge = pensionStartMode === 'fiscalYear'
    ? calcAgeAtFiscalYearStart(pensionInsured?.birthDate || '', pensionStartFiscalYear) ?? 0
    : Number(formData.paymentEndAge || 0);
  const pensionPayoutYears = Number(
    formData.pensionPayoutYears
    || (formData.policyEndAge !== 999 && pensionStartAge > 0
      ? Math.max(1, Number(formData.policyEndAge || 0) - pensionStartAge)
      : 10)
  );
  const pensionAnnualPayout = pensionPayoutYears > 0
    ? (formData.maturityBenefit || 0) / pensionPayoutYears
    : 0;
  const paymentCurrency = formData.paymentCurrency || 'JPY';
  const derivedPaymentExchangeRate = derivePaymentExchangeRate(
    formData.actualPremiumPaidJpy,
    formData.foreignPremiumAmount,
  );

  const surrenderValues = formData.surrenderValues ?? [];

  const setSurrenderValues = (points: SurrenderValuePoint[]) => {
    setFormData(prev => ({ ...prev, surrenderValues: points }));
  };

  // 被保険者の現在年齢（クイック追加のボタン用）
  const insuredCurrentAge = useMemo(() => {
    const member = allVisibleMembers.find(m => m.id === formData.insuredId);
    return calcAgeAt(member?.birthDate || '', new Date().toISOString().split('T')[0]);
  }, [allVisibleMembers, formData.insuredId]);

  // 返戻率の目安に使う払込累計（年額ベースの概算）
  const paidAtAge = useMemo(() => (age: number) => {
    const contractAge = Number(formData.contractAge || 0);
    if (age < contractAge) return 0;
    const premium = Number(formData.premiumAmount || 0);
    if (formData.paymentFrequency === 'single') return premium;
    const annual = formData.paymentFrequency === 'monthly' ? premium * 12 : premium;
    const elapsedYears = age - contractAge;
    const endAge = Number(formData.paymentEndAge || 0);
    const paymentYears = endAge === 999 ? elapsedYears : Math.min(elapsedYears, Math.max(0, endAge - contractAge));
    return Math.round(annual * paymentYears);
  }, [formData.contractAge, formData.premiumAmount, formData.paymentFrequency, formData.paymentEndAge]);

  const surrenderEditor = hasMaturityBenefitField ? (
    <SurrenderValueEditor
      points={surrenderValues}
      onChange={setSurrenderValues}
      currency={isUsdPolicy ? 'USD' : 'JPY'}
      exchangeRate={Number(formData.exchangeRate || 0)}
      contractAge={Number(formData.contractAge || 0)}
      paymentEndAge={Number(formData.paymentEndAge || 0)}
      policyEndAge={Number(formData.policyEndAge || 0)}
      currentAge={insuredCurrentAge}
      paidAtAge={paidAtAge}
    />
  ) : null;

  const [calcTotal, setCalcTotal] = useState<number | null>(null);

  const handleCalcTotal = () => {
    const freqMult = formData.paymentFrequency === 'monthly' ? 12 : formData.paymentFrequency === 'annual' ? 1 : 0;
    const paymentYears = Math.max(0, (formData.paymentEndAge || 0) - (formData.contractAge || 0));
    const total = formData.paymentFrequency === 'single'
      ? (formData.premiumAmount || 0)
      : (formData.premiumAmount || 0) * freqMult * paymentYears;
    setCalcTotal(total);
  };

  const handleClose = () => {
    setFormErrors({});
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const memberIds = new Set(familyMembers.map(member => member.id));
    if (!formData.companyName) errors.companyName = '保険会社は必須です';
    if (!isContractDateOptional && !formData.contractDate) errors.contractDate = '契約日は必須です';
    if (!formData.insuredId) errors.insuredId = '被保険者を選択してください';
    else if (!memberIds.has(formData.insuredId)) errors.insuredId = '被保険者が家族情報に存在しません';
    const beneficiaryAllocations = getBeneficiaryAllocations(formData as Policy);
    if (beneficiaryAllocations.some(allocation => !memberIds.has(allocation.beneficiaryId))) {
      errors.beneficiaryAllocations = '受取人が家族情報に存在しません';
    }
    if (new Set(beneficiaryAllocations.map(allocation => allocation.beneficiaryId)).size !== beneficiaryAllocations.length) {
      errors.beneficiaryAllocations = '同じ受取人を複数行に設定できません';
    }
    if (beneficiaryAllocations.some(allocation => allocation.percentage <= 0 || allocation.percentage > 100)) {
      errors.beneficiaryAllocations = '受取割合は0%を超え100%以下で入力してください';
    }
    const beneficiaryPercentageTotal = beneficiaryAllocations.reduce((sum, allocation) => sum + allocation.percentage, 0);
    if (beneficiaryAllocations.length > 0 && Math.abs(beneficiaryPercentageTotal - 100) > 0.001) {
      errors.beneficiaryAllocations = `受取割合の合計を100%にしてください（現在 ${beneficiaryPercentageTotal.toLocaleString('ja-JP')}%）`;
    }
    if (formData.pensionRecipientId && !memberIds.has(formData.pensionRecipientId)) errors.pensionRecipientId = '年金受取人が家族情報に存在しません';
    if (formData.pensionSuccessorRecipientId && !memberIds.has(formData.pensionSuccessorRecipientId)) errors.pensionSuccessorRecipientId = '継続受取人が家族情報に存在しません';
    if (!isWholeLifeCoverage && (formData.policyEndAge === undefined || isNaN(formData.policyEndAge))) {
      errors.policyEndAge = '保険期間は数値が必要です';
    }
    if (formData.paymentEndAge === undefined || isNaN(formData.paymentEndAge)) errors.paymentEndAge = '払込終了年齢は数値が必要です';
    if (isUsdPolicy && valuationSettings.usdJpyRate <= 0) {
      errors.exchangeRate = '基本情報で現在評価用USD/JPYレートを入力してください';
    }
    if (isUsdPolicy && formData.paymentFrequency === 'single') {
      if (!isWholeLifeCoverage && !formData.premiumPaymentDate) {
        errors.premiumPaymentDate = '支払日を入力してください';
      }
      if (!isWholeLifeCoverage && paymentCurrency === 'JPY' && (!formData.actualPremiumPaidJpy || formData.actualPremiumPaidJpy <= 0)) {
        errors.actualPremiumPaidJpy = '実際に支払った円額を入力してください';
      }
      if (paymentCurrency === 'USD' && (!formData.foreignPremiumAmount || formData.foreignPremiumAmount <= 0)) {
        errors.foreignPremiumAmount = '一時払保険料のドル額を入力してください';
      }
    }
    if (!isPension && hasBeneficiaryField && beneficiaryAllocations.length === 0) {
      errors.beneficiaryAllocations = '死亡保障がある保険は受取人を1名以上選択してください';
    }
    if (!isPension && hasDeathBenefitFields && (!formData.deathBenefitDisease || formData.deathBenefitDisease <= 0)) {
      errors.deathBenefitDisease = isIncomeProtection ? '死亡保険金月額を入力してください' : '死亡保障額を入力してください';
    }
    if (!isPension && hasMedicalBenefitFields && (formData.hospDayDisease || 0) <= 0 && (formData.diagnosisBenefit || 0) <= 0) {
      errors.hospDayDisease = '入院日額または診断一時金を入力してください';
      errors.diagnosisBenefit = '入院日額または診断一時金を入力してください';
    }
    if (formData.policyType === '養老保険' && (!formData.maturityBenefit || formData.maturityBenefit <= 0)) {
      errors.maturityBenefit = '養老保険は満期保険金を入力してください';
    }
    if (!isPension && FINITE_END_AGE_TYPES.includes(selectedPolicyType) && formData.policyEndAge === 999) {
      errors.policyEndAge = 'この保険種類は保険期間の終了年齢を入力してください';
    }
    if (isPension) {
      if (!formData.pensionRecipientId) {
        errors.pensionRecipientId = '年金受取人を選択してください';
      }
      if (pensionStartMode === 'age') {
        if (!formData.paymentEndAge || formData.paymentEndAge <= 0 || formData.paymentEndAge === 999) {
          errors.paymentEndAge = '年金受取開始年齢は必須です';
        }
      } else {
        if (!formData.pensionStartFiscalYear || pensionStartFiscalYear < 1900 || pensionStartFiscalYear > 2200) {
          errors.pensionStartFiscalYear = '年金受取開始年度を入力してください';
        } else if (!pensionInsured?.birthDate || pensionStartAge <= 0) {
          errors.pensionStartFiscalYear = '年度から開始年齢を計算するには被保険者の生年月日が必要です';
        }
      }
      if (!formData.pensionPayoutYears || formData.pensionPayoutYears <= 0 || formData.pensionPayoutYears > 100) {
        errors.pensionPayoutYears = '年金受取年数は1〜100年で入力してください';
      }
      if (!formData.maturityBenefit || formData.maturityBenefit <= 0) {
        errors.maturityBenefit = '年金原資（受取総額）は必須です';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const finalPolicy: Policy = {
      ...(formData as Policy),
      id: formData.id || uuidv4(),
      paymentEndAge: isPension ? pensionStartAge : Number(formData.paymentEndAge),
      policyEndAge: isPension
        ? pensionStartAge + pensionPayoutYears
        : isWholeLifeCoverage ? 999 : Number(formData.policyEndAge),
      pensionRecipientId: isPension ? formData.pensionRecipientId : undefined,
      pensionSuccessorRecipientId: isPension ? formData.pensionSuccessorRecipientId : undefined,
      pensionStartMode: isPension ? pensionStartMode : undefined,
      pensionStartFiscalYear: isPension && pensionStartMode === 'fiscalYear' ? pensionStartFiscalYear : undefined,
      pensionPayoutYears: isPension ? pensionPayoutYears : undefined,
      exchangeRate: isUsdPolicy ? valuationSettings.usdJpyRate : 0,
      paymentCurrency: isUsdPolicy && formData.paymentFrequency === 'single' ? paymentCurrency : undefined,
      premiumPaymentDate: isUsdPolicy && formData.paymentFrequency === 'single' ? formData.premiumPaymentDate : undefined,
      actualPremiumPaidJpy: isUsdPolicy && formData.paymentFrequency === 'single' && paymentCurrency === 'JPY'
        && Number(formData.actualPremiumPaidJpy || 0) > 0
        ? Number(formData.actualPremiumPaidJpy)
        : undefined,
      paymentExchangeRate: isUsdPolicy && formData.paymentFrequency === 'single' && paymentCurrency === 'JPY'
        ? derivedPaymentExchangeRate
        : undefined,
      annualPremium: (formData.paymentFrequency === 'monthly' ? (formData.premiumAmount || 0) * 12 : (formData.premiumAmount || 0)),
      beneficiaryId: beneficiaryAllocations[0]?.beneficiaryId || '',
      beneficiaryAllocations: normalizeBeneficiaryAllocations(beneficiaryAllocations),
    };
    if (isUsdPolicy && formData.paymentFrequency === 'single' && paymentCurrency === 'JPY') {
      finalPolicy.premiumAmount = Number(formData.actualPremiumPaidJpy || 0) > 0
        ? Number(formData.actualPremiumPaidJpy)
        : yenFromForeign(Number(formData.foreignPremiumAmount || 0), valuationSettings.usdJpyRate);
      finalPolicy.annualPremium = finalPolicy.premiumAmount;
    }
    if (!hasDeathBenefitFields) {
      finalPolicy.deathBenefitDisease = 0;
      finalPolicy.deathBenefitAccident = 0;
      finalPolicy.foreignDeathBenefitDisease = 0;
      finalPolicy.foreignDeathBenefitAccident = 0;
      finalPolicy.beneficiaryId = '';
      finalPolicy.beneficiaryAllocations = [];
    } else if (!hasAccidentDeathBenefitField) {
      finalPolicy.deathBenefitAccident = 0;
      finalPolicy.foreignDeathBenefitAccident = 0;
    }
    if (!hasMedicalBenefitFields) {
      finalPolicy.hospDayDisease = 0;
      finalPolicy.hospDayAccident = 0;
      finalPolicy.foreignHospDayDisease = 0;
      finalPolicy.foreignHospDayAccident = 0;
    }
    if (!hasDiagnosisBenefitFields) {
      finalPolicy.diagnosisBenefit = 0;
      finalPolicy.foreignDiagnosisBenefit = 0;
    }
    if (!hasMaturityBenefitField) {
      finalPolicy.maturityBenefit = 0;
      finalPolicy.foreignMaturityBenefit = 0;
      finalPolicy.surrenderValues = undefined;
    } else {
      finalPolicy.surrenderValues = normalizeSurrenderValues(finalPolicy.surrenderValues);
    }
    if (finalPolicy.currency !== 'USD') {
      finalPolicy.currency = 'JPY';
      finalPolicy.exchangeRate = 0;
      finalPolicy.contractExchangeRate = undefined;
      finalPolicy.paymentCurrency = undefined;
      finalPolicy.premiumPaymentDate = undefined;
      finalPolicy.actualPremiumPaidJpy = undefined;
      finalPolicy.paymentExchangeRate = undefined;
      finalPolicy.foreignPremiumAmount = 0;
      finalPolicy.foreignDeathBenefitDisease = 0;
      finalPolicy.foreignDeathBenefitAccident = 0;
      finalPolicy.foreignHospDayDisease = 0;
      finalPolicy.foreignHospDayAccident = 0;
      finalPolicy.foreignDiagnosisBenefit = 0;
      finalPolicy.foreignMaturityBenefit = 0;
      finalPolicy.surrenderValues = finalPolicy.surrenderValues?.map(({ age, amount }) => ({ age, amount }));
    }
    onAdd(finalPolicy);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="form-overlay">
      <div className="form-container wide-form">
        <div className="modal-header">
          <div className="title-with-icon">
            <h3>{editingPolicy ? '保険証券の編集' : '保険証券の詳細登録'}</h3>
          </div>
          <div className="header-actions">
            <button type="button" className="json-import-btn-outline" onClick={handlePasteAreaToggle}>
              <Upload size={16} /> JSON貼り付け
            </button>
            <button type="button" className="json-import-btn-outline" onClick={() => fileInputRef.current?.click()}>
              <FileUp size={16} /> JSONファイル
            </button>
            <button
              type="button"
              className={`json-import-btn-outline ${showPromptEditor ? 'is-active' : ''}`}
              onClick={handlePromptEditorToggle}
            >
              <Clipboard size={16} /> プロンプト
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleJsonImport}
            />
            <button type="button" className="close-btn" onClick={handleClose}><X size={20} /></button>
          </div>
        </div>

        {showPromptEditor && (
          <div className="prompt-editor full-width">
            <div className="prompt-editor-header">
              <h4>画像認識プロンプト</h4>
            </div>
            <textarea
              value={promptDraft}
              onChange={(e) => {
                setPromptDraft(e.target.value);
                setPromptSaved(false);
              }}
              rows={14}
              className="prompt-editor-textarea"
            />
            <div className="prompt-editor-actions">
              <button type="button" className="json-paste-apply-btn" onClick={handleSavePrompt} disabled={promptSaving}>
                <Save size={16} /> {promptSaving ? '保存中' : promptSaved ? '保存済み' : '保存'}
              </button>
              <button type="button" className="json-paste-cancel-btn" onClick={() => handleCopyPrompt(promptDraft)}>
                <Clipboard size={16} /> {promptCopied ? 'コピー済み' : 'コピー'}
              </button>
              <button type="button" className="json-paste-cancel-btn" onClick={handleResetPromptDraft}>
                <RotateCcw size={16} /> 初期値に戻す
              </button>
              <button type="button" className="json-paste-cancel-btn" onClick={() => setShowPromptEditor(false)}>
                閉じる
              </button>
            </div>
          </div>
        )}

        {(unresolvedNames.length > 0 || formImportWarnings.length > 0) && (
          <div className="form-notice-stack full-width">
            {unresolvedNames.length > 0 && (
          <div className="resolve-wizard full-width">
            <div className="resolve-wizard-header">
              <Upload size={20} className="resolve-icon" />
              <h4>家族情報の確認が必要です</h4>
            </div>
            <p className="resolve-instruction">
              JSON内の名前が家族情報にありません。既存家族へ紐付けるか、続柄などを確認して新しい家族として追加してください。
            </p>
            <datalist id="policy-relationship-suggestions">
              {relationshipSuggestions.map(value => <option key={value} value={value} />)}
            </datalist>
            <div className="resolve-table-wrap">
              <table className="resolve-table">
                <thead>
                  <tr>
                    <th>JSON項目</th>
                    <th>名前</th>
                    <th>登録方法</th>
                    <th>続柄 <span className="resolve-th-hint">候補選択・直接入力</span></th>
                    <th>生年月日（任意）</th>
                    <th>性別</th>
                  </tr>
                </thead>
                <tbody>
                  {unresolvedNames.map((item, index) => {
                    const modeValue = item.mode === 'existing' ? `existing:${item.selectedMemberId}` : item.mode;
                    const isNew = item.mode === 'new';
                    const rowError = unresolvedNameErrors[index];
                    const errorId = `unresolved-name-error-${index}`;

                    return (
                      <tr key={`${item.field}-${item.originalName}-${index}`}>
                        <td>{item.label}</td>
                        <td><strong>{item.originalName}</strong></td>
                        <td>
                          <select
                            value={modeValue}
                            onChange={e => handleUnresolvedModeChange(index, e.target.value)}
                            className="resolve-select"
                            aria-invalid={Boolean(rowError && item.mode === 'existing')}
                            aria-describedby={rowError && item.mode === 'existing' ? errorId : undefined}
                          >
                            <option value="new">新しい家族として追加</option>
                            <option value="skip">手動で選ぶ</option>
                            {namedFamilyMembers.length > 0 && (
                              <optgroup label="既存の家族に紐付け">
                                {namedFamilyMembers.map(m => (
                                  <option key={m.id} value={`existing:${m.id}`}>{formatFamilyOptionLabel(m)}</option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          {rowError && item.mode === 'existing' && <span id={errorId} className="resolve-row-error">{rowError}</span>}
                        </td>
                        <td>
                          <input
                            type="text"
                            list="policy-relationship-suggestions"
                            value={item.relationship}
                            placeholder="例: 本人、長男など"
                            disabled={!isNew}
                            onChange={e => updateUnresolvedName(index, { relationship: e.target.value })}
                            className="resolve-input"
                            aria-invalid={Boolean(rowError && isNew)}
                            aria-describedby={rowError && isNew ? errorId : undefined}
                          />
                          {rowError && isNew && <span id={errorId} className="resolve-row-error">{rowError}</span>}
                        </td>
                        <td>
                          <input
                            type="date"
                            value={item.birthDate}
                            disabled={!isNew}
                            onChange={e => updateUnresolvedName(index, { birthDate: e.target.value })}
                            className="resolve-input"
                            aria-label={`${item.originalName}の生年月日`}
                          />
                        </td>
                        <td>
                          <select
                            value={item.gender}
                            disabled={!isNew}
                            onChange={e => updateUnresolvedName(index, { gender: e.target.value as FamilyMember['gender'] })}
                            className="resolve-select"
                          >
                            <option value="male">男</option>
                            <option value="female">女</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="resolve-note">続柄は候補にない表記も直接入力できます。生年月日が不明な場合は空欄のまま追加し、あとで世帯・家族情報から入力できます。</p>
            </div>
            <div className="resolve-btn-group">
              <button type="button" className="resolve-btn-new" onClick={applyUnresolvedNames} disabled={hasUnresolvedNameErrors}>
                確認内容で追加して反映
              </button>
              <button type="button" className="resolve-btn-skip" onClick={skipUnresolvedNames}>
                すべて手動で選ぶ
              </button>
            </div>
          </div>
            )}

            {formImportWarnings.length > 0 && (
              <div className="json-import-alert full-width">
                <AlertTriangle size={16} />
                <div className="json-import-warning-list">
                  {formImportWarnings.map((warning, index) => (
                    <span key={`form-import-warning-${index}`}>{warning}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showPasteArea && (
          <div className="json-paste-area full-width">
            <textarea
              ref={pasteTextareaRef}
              placeholder="GeminiのJSON出力をここに貼り付けてください..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={5}
              className="json-paste-textarea"
            />
            <div className="json-paste-actions">
              <button type="button" className="json-paste-apply-btn" onClick={handlePasteImport}>適用する</button>
              <button type="button" className="json-paste-cancel-btn" onClick={() => setShowPasteArea(false)}>閉じる</button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid-form">
          <section>
            <h4>基本情報</h4>
            <div className={`form-group ${formErrors.companyName ? 'has-error' : ''}`}><label>保険会社 <span className="required-mark">*</span></label><input type="text" required value={formData.companyName} onChange={e => setField('companyName', e.target.value)} />{formErrors.companyName && <span className="field-error">{formErrors.companyName}</span>}</div>
            <div className="form-group"><label>証券番号</label><input type="text" value={formData.policyNumber} onChange={e => setField('policyNumber', e.target.value)} placeholder="例: 2709300566" /></div>
            <div className="form-group">
              <label>保険種類</label>
              <select value={formData.policyType} onChange={e => setPolicyType(e.target.value as PolicyType)}>
                {DISPLAY_POLICY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>通貨</label>
              <select value={formData.currency || 'JPY'} onChange={e => setCurrency(e.target.value as Policy['currency'])}>
                <option value="JPY">円建て</option>
                <option value="USD">ドル建て（USD）</option>
              </select>
              <span className="field-hint">ドル建ては外貨額を入力し、基本情報の共通レートで円換算します</span>
            </div>
            {isUsdPolicy && (
              <div className={`form-group ${formErrors.exchangeRate ? 'has-error' : ''}`}>
                <label>現在評価用の共通為替レート</label>
                <div className="fixed-field-value">
                  {valuationSettings.usdJpyRate > 0
                    ? `1 USD = ${valuationSettings.usdJpyRate.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}円`
                    : '基本情報で未設定'}
                </div>
                <span className="field-hint">
                  基準日: {valuationSettings.fxRateDate || '未設定'}。変更は基本情報から行います
                </span>
                {formErrors.exchangeRate && <span className="field-error">{formErrors.exchangeRate}</span>}
              </div>
            )}
            {isUsdPolicy && (
              <div className="form-group">
                <label>契約時為替レート（任意）</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={formData.contractExchangeRate || ''}
                  onChange={e => setField('contractExchangeRate', Number(e.target.value))}
                  placeholder="証券記載値がある場合"
                />
                <span className="field-hint">現在評価用の共通レートとは分けて証券ごとに記録します</span>
              </div>
            )}
            <div className={`form-group ${formErrors.insuredId ? 'has-error' : ''}`}>
              <label>被保険者 <span className="required-mark">*</span></label>
              <select value={formData.insuredId || ''} onChange={e => setFieldWithContractAge('insuredId', e.target.value)}>
                <option value="">選択してください</option>
                {familyMembers.map(m => <option key={m.id} value={m.id}>{formatFamilyOptionLabel(m)}</option>)}
              </select>
              {formErrors.insuredId && <span className="field-error">{formErrors.insuredId}</span>}
            </div>
            {hasBeneficiaryField && (
              <div className={`form-group beneficiary-allocation-group ${formErrors.beneficiaryAllocations ? 'has-error' : ''}`}>
                <div className="beneficiary-allocation-heading">
                  <label className="beneficiary-allocation-label">死亡保険金受取人・受取割合 <span className="required-mark">*</span></label>
                  <button
                    type="button"
                    className="beneficiary-add-button"
                    onClick={addBeneficiaryAllocation}
                    disabled={getBeneficiaryAllocations(formData as Policy).length >= familyMembers.length}
                  >
                    <Plus size={13} aria-hidden="true" />
                    受取人を追加
                  </button>
                </div>
                <div className="beneficiary-allocation-list">
                  {getBeneficiaryAllocations(formData as Policy).map((allocation, index, allocations) => (
                    <div className="beneficiary-allocation-row" key={`${allocation.beneficiaryId}-${index}`}>
                      <select
                        aria-label={`受取人 ${index + 1}`}
                        value={allocation.beneficiaryId}
                        onChange={event => updateBeneficiaryAllocation(index, 'beneficiaryId', event.target.value)}
                      >
                        <option value="">選択してください</option>
                        {familyMembers.map(member => (
                          <option
                            key={member.id}
                            value={member.id}
                            disabled={allocations.some((item, itemIndex) => itemIndex !== index && item.beneficiaryId === member.id)}
                          >
                            {formatFamilyOptionLabel(member)}
                          </option>
                        ))}
                      </select>
                      <div className="beneficiary-percentage-input">
                        <input
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          inputMode="decimal"
                          aria-label={`受取割合 ${index + 1}`}
                          value={allocation.percentage}
                          onChange={event => updateBeneficiaryAllocation(index, 'percentage', Number(event.target.value))}
                        />
                        <span>%</span>
                      </div>
                      <button
                        type="button"
                        className="beneficiary-remove-button"
                        onClick={() => removeBeneficiaryAllocation(index)}
                        aria-label={`${index + 1}人目の受取人を削除`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="beneficiary-allocation-total">
                  合計
                  <strong>
                    {getBeneficiaryAllocations(formData as Policy)
                      .reduce((sum, allocation) => sum + allocation.percentage, 0)
                      .toLocaleString('ja-JP')}%
                  </strong>
                </div>
                <span className="field-hint">受取割合の合計が100%になるように設定してください</span>
                {formErrors.beneficiaryAllocations && <span className="field-error">{formErrors.beneficiaryAllocations}</span>}
              </div>
            )}
            <div className={`form-group ${formErrors.contractDate ? 'has-error' : ''}`}>
              <label>契約日 {!isContractDateOptional && <span className="required-mark">*</span>}</label>
              <input type="date" value={formData.contractDate} onChange={e => setFieldWithContractAge('contractDate', e.target.value)} />
              {isContractDateOptional && <span className="field-hint">任意入力（未入力時は契約年齢を分析に使用します）</span>}
              {formErrors.contractDate && <span className="field-error">{formErrors.contractDate}</span>}
            </div>
            <div className="form-group">
              <label>契約年齢（歳）</label>
              <input
                type="number"
                value={formData.contractAge ?? 0}
                onChange={e => setField('contractAge', Number(e.target.value))}
              />
              <span className="field-hint">契約日・被保険者の生年月日から自動計算（満年齢）。手入力で上書きできます</span>
              <button
                type="button"
                className="contract-age-reset"
                onClick={() => autoContractAge !== null && setField('contractAge', autoContractAge)}
                disabled={autoContractAge === null || !isContractAgeOverridden}
              >
                <RotateCcw size={14} aria-hidden="true" />
                {autoContractAge === null
                  ? '生年月日を入力すると自動計算できます'
                  : isContractAgeOverridden
                    ? `自動計算（${autoContractAge}歳）に戻す`
                    : `自動計算値（${autoContractAge}歳）`}
              </button>
            </div>
          </section>

          <section>
            <h4>{isPension ? '年金受取内容' : '保障内容'}</h4>
            {isPension ? (
              <>
                <div className="form-context-note" role="note">
                  <Info size={15} aria-hidden="true" />
                  <span>受取人、開始時期、受取年数、年金原資から年間年金額を表示します。</span>
                </div>
                <div className={`form-group ${formErrors.pensionRecipientId ? 'has-error' : ''}`}>
                  <label>年金受取人 <span className="required-mark">*</span></label>
                  <select
                    value={formData.pensionRecipientId || ''}
                    onChange={e => setField('pensionRecipientId', e.target.value)}
                  >
                    <option value="">選択してください</option>
                    {familyMembers.map(member => (
                      <option key={member.id} value={member.id}>{formatFamilyOptionLabel(member)}</option>
                    ))}
                  </select>
                  {formErrors.pensionRecipientId && <span className="field-error">{formErrors.pensionRecipientId}</span>}
                </div>
                <div className={`form-group ${formErrors.pensionSuccessorRecipientId ? 'has-error' : ''}`}>
                  <label>死亡時の継続受取人</label>
                  <select
                    value={formData.pensionSuccessorRecipientId || ''}
                    onChange={e => setField('pensionSuccessorRecipientId', e.target.value)}
                  >
                    <option value="">指定なし</option>
                    {familyMembers.map(member => (
                      <option key={member.id} value={member.id}>{formatFamilyOptionLabel(member)}</option>
                    ))}
                  </select>
                  <span className="field-hint">年金受取人が死亡した場合に残りの年金を受け取る方</span>
                  {formErrors.pensionSuccessorRecipientId && <span className="field-error">{formErrors.pensionSuccessorRecipientId}</span>}
                </div>
                <div className="form-group">
                  <label>年金受取開始の指定方法</label>
                  <select
                    value={pensionStartMode}
                    onChange={e => setField('pensionStartMode', e.target.value as Policy['pensionStartMode'])}
                  >
                    <option value="age">年齢で指定</option>
                    <option value="fiscalYear">年度で指定</option>
                  </select>
                </div>
                {pensionStartMode === 'age' ? (
                  <div className={`form-group ${formErrors.paymentEndAge ? 'has-error' : ''}`}>
                    <label>年金受取開始年齢（歳）<span className="required-mark">*</span></label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={formData.paymentEndAge}
                      onChange={e => setField('paymentEndAge', Number(e.target.value))}
                    />
                    <span className="field-hint">払込終了後に年金を受け取り始める満年齢</span>
                    {formErrors.paymentEndAge && <span className="field-error">{formErrors.paymentEndAge}</span>}
                  </div>
                ) : (
                  <div className={`form-group ${formErrors.pensionStartFiscalYear ? 'has-error' : ''}`}>
                    <label>年金受取開始年度<span className="required-mark">*</span></label>
                    <select
                      value={pensionStartFiscalYear}
                      onChange={e => setField('pensionStartFiscalYear', Number(e.target.value))}
                    >
                      {fiscalYearOptions.map(year => (
                        <option key={year} value={year}>{formatFiscalYearOption(year)}</option>
                      ))}
                    </select>
                    <span className="field-hint">
                      4月1日時点の満年齢で分析します
                      {pensionStartAge > 0 ? `（${pensionStartAge}歳相当）` : ''}
                    </span>
                    {formErrors.pensionStartFiscalYear && <span className="field-error">{formErrors.pensionStartFiscalYear}</span>}
                  </div>
                )}
                <div className={`form-group ${formErrors.pensionPayoutYears ? 'has-error' : ''}`}>
                  <label>年金受取年数（年）<span className="required-mark">*</span></label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={pensionPayoutYears}
                    onChange={e => setField('pensionPayoutYears', Number(e.target.value))}
                  />
                  <span className="field-hint">例: 10年確定年金の場合は「10」</span>
                  {formErrors.pensionPayoutYears && <span className="field-error">{formErrors.pensionPayoutYears}</span>}
                </div>
                <CommaInput
                  label={`年金原資（受取総額）(${currencyUnit})`}
                  value={getMoneyValue('maturityBenefit', 'foreignMaturityBenefit')}
                  onChange={v => setMoneyField('maturityBenefit', 'foreignMaturityBenefit', v)}
                  decimalPlaces={isUsdPolicy ? 2 : 0}
                  required
                  hint={isUsdPolicy ? `円換算: ${(formData.maturityBenefit || 0).toLocaleString()}円` : '年金原資、年金受取総額、年金年額×受取年数など'}
                  error={formErrors.maturityBenefit}
                />
                <div className="pension-preview">
                  <span>年金表示</span>
                  <strong>
                    {pensionPayoutYears > 0 && formData.maturityBenefit
                      ? `${pensionStartMode === 'fiscalYear' ? `${pensionStartFiscalYear}年度（${pensionStartAge}歳相当）` : `${pensionStartAge}歳`}から${pensionPayoutYears}年間・年額${Math.round(pensionAnnualPayout).toLocaleString()}円`
                      : '開始時期、受取年数、年金原資を入力すると計算します'}
                  </strong>
                </div>
              </>
            ) : (
              <>
                <div className="form-context-note" role="note">
                  <Info size={15} aria-hidden="true" />
                  <span>
                    {hasDeathBenefitFields && '死亡保障額・受取人を入力します。'}
                    {hasMedicalBenefitFields && '入院日額・診断一時金を入力します。'}
                    {hasMaturityBenefitField && '満期保険金や解約返戻金の目安も入力できます。'}
                  </span>
                </div>
                {hasDeathBenefitFields && (
                  <>
                    <CommaInput
                      label={`${isIncomeProtection ? '死亡保険金月額' : '死亡保障（疾病）'} (${currencyUnit})`}
                      value={getMoneyValue('deathBenefitDisease', 'foreignDeathBenefitDisease')}
                      onChange={v => setMoneyField('deathBenefitDisease', 'foreignDeathBenefitDisease', v)}
                      decimalPlaces={isUsdPolicy ? 2 : 0}
                      required
                      hint={isUsdPolicy ? `円換算: ${(formData.deathBenefitDisease || 0).toLocaleString()}円` : undefined}
                      error={formErrors.deathBenefitDisease}
                    />
                    {hasAccidentDeathBenefitField && (
                      <CommaInput
                        label={`死亡保障（災害）(${currencyUnit})`}
                        value={getMoneyValue('deathBenefitAccident', 'foreignDeathBenefitAccident')}
                        onChange={v => setMoneyField('deathBenefitAccident', 'foreignDeathBenefitAccident', v)}
                        decimalPlaces={isUsdPolicy ? 2 : 0}
                        hint={isUsdPolicy ? `円換算: ${(formData.deathBenefitAccident || 0).toLocaleString()}円` : undefined}
                      />
                    )}
                  </>
                )}
                {hasMedicalBenefitFields && (
                  <>
                    <CommaInput
                      label={`入院日額（疾病）(${currencyUnit})`}
                      value={getMoneyValue('hospDayDisease', 'foreignHospDayDisease')}
                      onChange={v => setMoneyField('hospDayDisease', 'foreignHospDayDisease', v)}
                      decimalPlaces={isUsdPolicy ? 2 : 0}
                      hint={isUsdPolicy ? `円換算: ${(formData.hospDayDisease || 0).toLocaleString()}円` : undefined}
                      error={formErrors.hospDayDisease}
                    />
                    <CommaInput
                      label={`入院日額（災害）(${currencyUnit})`}
                      value={getMoneyValue('hospDayAccident', 'foreignHospDayAccident')}
                      onChange={v => setMoneyField('hospDayAccident', 'foreignHospDayAccident', v)}
                      decimalPlaces={isUsdPolicy ? 2 : 0}
                      hint={isUsdPolicy ? `円換算: ${(formData.hospDayAccident || 0).toLocaleString()}円` : undefined}
                    />
                  </>
                )}
                {hasDiagnosisBenefitFields && (
                  <CommaInput
                    label={`診断一時金 (${currencyUnit})`}
                    value={getMoneyValue('diagnosisBenefit', 'foreignDiagnosisBenefit')}
                    onChange={v => setMoneyField('diagnosisBenefit', 'foreignDiagnosisBenefit', v)}
                    decimalPlaces={isUsdPolicy ? 2 : 0}
                    hint={isUsdPolicy ? `円換算: ${(formData.diagnosisBenefit || 0).toLocaleString()}円` : undefined}
                    error={formErrors.diagnosisBenefit}
                  />
                )}
                {isWholeLifeCoverage ? (
                  <div className="form-group">
                    <label>保険期間</label>
                    <div className="fixed-field-value">終身</div>
                    <span className="field-hint">終身保険のため、保障終了年齢の入力は不要です</span>
                  </div>
                ) : (
                  <div className={`form-group ${formErrors.policyEndAge ? 'has-error' : ''}`}>
                    <label>保険期間（歳/999=終身）<span className="required-mark">*</span></label>
                    <input type="number" value={formData.policyEndAge} onChange={e => setField('policyEndAge', Number(e.target.value))} />
                    {formErrors.policyEndAge && <span className="field-error">{formErrors.policyEndAge}</span>}
                  </div>
                )}
              </>
            )}
          </section>

          <section>
            <h4>コスト・貯蓄性</h4>
            <div className="form-group">
              <label>払方</label>
              <select value={formData.paymentFrequency} onChange={e => setField('paymentFrequency', e.target.value as Policy['paymentFrequency'])}>
                <option value="monthly">月払</option>
                <option value="annual">年払</option>
                <option value="single">一時払</option>
              </select>
            </div>
            <CommaInput
              label={isUsdPolicy && formData.paymentFrequency === 'single'
                ? '契約上の一時払保険料 (USD)'
                : `保険料（1回あたり）(${currencyUnit})`}
              value={getMoneyValue('premiumAmount', 'foreignPremiumAmount')}
              onChange={v => setMoneyField('premiumAmount', 'foreignPremiumAmount', v)}
              decimalPlaces={isUsdPolicy ? 2 : 0}
              hint={isUsdPolicy
                ? formData.paymentFrequency === 'single' && paymentCurrency === 'JPY' && (formData.actualPremiumPaidJpy || 0) > 0
                  ? `コスト計上額: ${Number(formData.actualPremiumPaidJpy).toLocaleString()}円`
                  : `共通レート円換算: ${(formData.premiumAmount || 0).toLocaleString()}円`
                : undefined}
              error={formErrors.foreignPremiumAmount}
            />
            {isUsdPolicy && formData.paymentFrequency === 'single' && (
              <>
                <div className="form-group">
                  <label>支払通貨 <span className="required-mark">*</span></label>
                  <select
                    value={paymentCurrency}
                    onChange={e => setField('paymentCurrency', e.target.value as Policy['paymentCurrency'])}
                  >
                    <option value="JPY">円で支払った</option>
                    <option value="USD">ドルで支払った</option>
                  </select>
                </div>
                <div className={`form-group ${formErrors.premiumPaymentDate ? 'has-error' : ''}`}>
                  <label>支払日 {!isWholeLifeCoverage && <span className="required-mark">*</span>}</label>
                  <input
                    type="date"
                    value={formData.premiumPaymentDate || ''}
                    onChange={e => setField('premiumPaymentDate', e.target.value)}
                  />
                  {isWholeLifeCoverage && <span className="field-hint">任意入力</span>}
                  {formErrors.premiumPaymentDate && <span className="field-error">{formErrors.premiumPaymentDate}</span>}
                </div>
                {paymentCurrency === 'JPY' && (
                  <CommaInput
                    label="実際の一時払保険料（円）"
                    value={Number(formData.actualPremiumPaidJpy || 0)}
                    onChange={value => setFormData(prev => ({
                      ...prev,
                      actualPremiumPaidJpy: value,
                      premiumAmount: value,
                    }))}
                    required={!isWholeLifeCoverage}
                    hint={isWholeLifeCoverage
                      ? '任意入力。未入力時のコストは契約上のドル額を現在の共通レートで円換算した概算です'
                      : 'コスト計算には、支払日の実際の円支払額を使用します'}
                    error={formErrors.actualPremiumPaidJpy}
                  />
                )}
                <div className="form-group">
                  <label>支払時為替レート</label>
                  <div className="fixed-field-value">
                    {paymentCurrency === 'JPY' && derivedPaymentExchangeRate > 0
                      ? `1 USD = ${derivedPaymentExchangeRate.toLocaleString('ja-JP', { maximumFractionDigits: 4 })}円`
                      : paymentCurrency === 'USD' ? 'ドルで直接支払い' : '円額とドル額から自動計算'}
                  </div>
                </div>
              </>
            )}
            {formData.paymentFrequency !== 'single' && (
              <label className="payment-completed-check">
                <input
                  type="checkbox"
                  checked={Boolean(formData.premiumPaymentCompleted)}
                  onChange={e => setField('premiumPaymentCompleted', e.target.checked)}
                />
                <span>
                  <strong>保険料の払込は終了済み</strong>
                  <small>現在の月額負担と残り払込額には含めません</small>
                </span>
              </label>
            )}
            {!isPension && (
              <>
                <div className={`form-group ${formErrors.paymentEndAge ? 'has-error' : ''}`}>
                  <label>払込終了年齢（歳）<span className="required-mark">*</span></label>
                  <div className="payment-end-row">
                    <input
                      type="number"
                      value={isWholeLifePayment ? '' : formData.paymentEndAge}
                      disabled={isWholeLifePayment}
                      placeholder={isWholeLifePayment ? '終身払い' : undefined}
                      onChange={e => setField('paymentEndAge', Number(e.target.value))}
                    />
                    <label className="wholelife-pay-check">
                      <input
                        type="checkbox"
                        checked={isWholeLifePayment}
                        onChange={e => setField('paymentEndAge', e.target.checked ? 999 : 60)}
                      />
                      終身払い
                    </label>
                  </div>
                  {formErrors.paymentEndAge && <span className="field-error">{formErrors.paymentEndAge}</span>}
                </div>
                {hasMaturityBenefitField && (
                  <CommaInput
                    label={`${formData.policyType === '養老保険' ? '満期保険金' : '解約返戻金・満期保険金'} (${currencyUnit})`}
                    value={getMoneyValue('maturityBenefit', 'foreignMaturityBenefit')}
                    onChange={v => setMoneyField('maturityBenefit', 'foreignMaturityBenefit', v)}
                    decimalPlaces={isUsdPolicy ? 2 : 0}
                    required={formData.policyType === '養老保険'}
                    hint={isUsdPolicy ? `円換算: ${(formData.maturityBenefit || 0).toLocaleString()}円` : undefined}
                    error={formErrors.maturityBenefit}
                  />
                )}
              </>
            )}
            {isPension && (
              <div className="form-group">
                <label className="label-with-btn">払込総額 (円) <button type="button" className="calc-btn" onClick={handleCalcTotal}>計算</button></label>
                <CommaInputRaw value={calcTotal ?? 0} onChange={setCalcTotal} placeholder="直接入力 or 計算ボタン" />
              </div>
            )}
            {surrenderEditor}
          </section>

          <div className="form-actions full-width">
            <button type="submit" className="save-btn">{editingPolicy ? '変更を保存' : '保存して一覧に追加'}</button>
            <button type="button" onClick={handleClose} className="cancel-btn">キャンセル</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PolicyForm;
