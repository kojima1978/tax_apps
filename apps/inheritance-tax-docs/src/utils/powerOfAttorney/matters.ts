/**
 * 委任状の委任事項。文面は事務所の委任状のひな形どおり（勝手に言い回しを変えると窓口で差し戻される）。
 *
 * 委任状の「１．」の下に、選んだ事項をこの並びのまま刷る。並びを変えるとこれまでの委任状と順序が食い違うので、
 * 足すときは近い事項の隣に挟む。
 */

export type Purpose = 'inheritance' | 'personal';

export type Matter = { id: string; text: string };

/** 相続手続き用（被相続人の名前を見出しに刷る） */
export const INHERITANCE_MATTERS: Matter[] = [
  {
    id: 'bank-statements',
    text: '被相続人名義の全取引に係る残高証明書、利息計算書、取引明細書等の発行請求および当該書類の受領に関する一切の権限',
  },
  {
    id: 'bank-procedures',
    text: '被相続人名義の全取引に関する相続手続きに関し、関係書類へ記入および、解約、手続きに関するすべての権限',
  },
  {
    id: 'deceased-koseki',
    text: '被相続人の出生から死亡にいたるまでの戸籍謄本、除籍謄本、改製原戸籍謄本及び再製原戸籍謄本並びにその附票の交付申請並びに受領に関する一切の権限',
  },
  {
    id: 'heir-koseki',
    text: '相続人及び受遺者の戸籍謄本、除籍謄本、改製原戸籍謄本及び再製原戸籍謄本並びに相続人を確認するために必要となる戸籍謄本、除籍謄本、改製原戸籍謄本及び再製原戸籍謄本の交付申請並びに受領に関する一切の権限',
  },
  {
    id: 'resident-records',
    text: '被相続人及び相続人及び受遺者の住民票の写し、除票の写し及び戸籍の（除）附票の交付申請並びに受領に関する一切の権限',
  },
  {
    // 登記事項証明書は誰でも請求できる（委任状が要らない）ので、法務局は一覧図の写しだけ
    id: 'statutory-heir-info',
    text: '被相続人に係る法定相続情報一覧図の保管及び交付の申出並びに法定相続情報一覧図の写しの受領に関する一切の権限',
  },
  {
    id: 'property-certificates',
    text: '被相続人所有（共有名義のものを含む）の不動産の評価証明書・名寄帳・課税証明書・無資産証明書の交付申請並びに受領に関する一切の権限',
  },
  {
    id: 'care-facility',
    text: '被相続人の相続税申告および関連手続きに伴い、被相続人が入居・入所していた施設が保管する「施設入所時における契約書の写し」および「介護保険被保険者証の写し」の交付請求ならびに受領に関する一切の件',
  },
];

/** 委任者本人の手続き用（被相続人は刷らない） */
export const PERSONAL_MATTERS: Matter[] = [
  {
    id: 'own-property-certificates',
    text: '委任者所有（共有名義のものを含む）の不動産の評価証明書・名寄帳・課税証明書・無資産証明書の交付申請並びに受領に関する一切の権限',
  },
];

export const mattersFor = (purpose: Purpose): Matter[] =>
  purpose === 'personal' ? PERSONAL_MATTERS : INHERITANCE_MATTERS;

/** 提出先の種類。選ぶとその窓口で要る事項に印が付く（外すと外れる）。印は後から1つずつ付け外しできる */
export const MATTER_PRESETS: { id: string; label: string; matterIds: string[] }[] = [
  { id: 'koseki', label: '戸籍・住民票の取得', matterIds: ['deceased-koseki', 'heir-koseki', 'resident-records'] },
  { id: 'bank', label: '金融機関', matterIds: ['bank-statements', 'bank-procedures'] },
  { id: 'property', label: '固定資産評価証明', matterIds: ['property-certificates'] },
  { id: 'legal-affairs', label: '法務局', matterIds: ['statutory-heir-info'] },
];

/** 事項ごとの選択。text はこの1回だけの言い回しの直し（空ならひな形どおり） */
export type MatterSelection = Record<string, { checked: boolean; text: string }>;

/**
 * 刷る事項の文面を並べる。選んだ事項（ひな形の並び）→「その他の委任事項」（1行1事項）の順。
 * 直した文面が空なら、ひな形の文面へ戻す（空の事項を刷らない）。
 */
export function resolveMatters(purpose: Purpose, selection: MatterSelection, extra: string): string[] {
  const chosen = mattersFor(purpose)
    .filter((matter) => selection[matter.id]?.checked)
    .map((matter) => selection[matter.id].text.trim() || matter.text);
  const extras = extra
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return [...chosen, ...extras];
}

/** 提出先の種類を付け外ししたときの選択。外すときは、まだ選んでいる他の種類の事項を残す */
export function togglePreset(
  selection: MatterSelection,
  activePresetIds: string[],
  presetId: string,
): { selection: MatterSelection; activePresetIds: string[] } {
  const turningOn = !activePresetIds.includes(presetId);
  const nextActive = turningOn ? [...activePresetIds, presetId] : activePresetIds.filter((id) => id !== presetId);
  const keep = new Set(MATTER_PRESETS.filter((p) => nextActive.includes(p.id)).flatMap((p) => p.matterIds));
  const target = MATTER_PRESETS.find((p) => p.id === presetId)?.matterIds ?? [];
  const next = { ...selection };
  for (const id of target) {
    const text = next[id]?.text ?? '';
    next[id] = { checked: turningOn || keep.has(id), text };
  }
  return { selection: next, activePresetIds: nextActive };
}
