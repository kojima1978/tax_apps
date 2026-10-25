import { EMPTY_PRINCIPAL_DRAFT, type PoaPrincipal, type PrincipalDraft } from './principalApi';
import type { PrincipalInput } from './record';
import { parseBirthDate } from './wareki';

/** 委任状の画面の委任者1人ぶんの入力（生年月日は打たれたまま） */
export type PrincipalSlot = Omit<PrincipalInput, 'birthDate'> & { birthInput: string };

/** DB の内容を入力欄へ。生年月日は和暦の文字列のまま入れても parseBirthDate が読める */
export const slotFieldsFromRecord = (record: PoaPrincipal): PrincipalSlot => ({
  kind: record.kind,
  name: record.name,
  address: record.address,
  representative: record.representative,
  birthInput: record.birthDate,
});

const normalizedBirth = (input: string) => {
  const result = parseBirthDate(input);
  return result.ok ? result.text : input.trim();
};

/**
 * 入力欄から DB へ送る中身。フリガナ・メモなど委任状の画面に無い項目は base（DB の今の内容）を引き継ぐ。
 * 被相続人は DB 側が空のときだけ画面の値で埋める（別の相続で使った人を上書きしない）。
 */
export const draftFromSlot = (slot: PrincipalSlot, base: PrincipalDraft | undefined, deceasedName: string): PrincipalDraft => ({
  ...(base ?? EMPTY_PRINCIPAL_DRAFT),
  kind: slot.kind,
  name: slot.name.trim(),
  address: slot.address.trim(),
  representative: slot.kind === 'corporate' ? slot.representative.trim() : '',
  birthDate: slot.kind === 'individual' ? slot.birthInput.trim() : '',
  deceasedName: base?.deceasedName || deceasedName.trim(),
});

/** 委任状の画面で直した結果、DB の登録内容と食い違っているか（委任状に刷る項目だけ比べる） */
export const slotDiffersFromRecord = (slot: PrincipalSlot, record: PoaPrincipal): boolean => {
  if (slot.kind !== record.kind) return true;
  if (slot.name.trim() !== record.name || slot.address.trim() !== record.address) return true;
  return slot.kind === 'corporate'
    ? slot.representative.trim() !== record.representative
    : normalizedBirth(slot.birthInput) !== record.birthDate;
};

/** 何も入っていない欄（DB から選んだときに新しい欄を足さずにここへ入れる） */
export const isBlankSlot = (slot: PrincipalSlot): boolean =>
  ![slot.name, slot.address, slot.representative, slot.birthInput].some((value) => value.trim());
