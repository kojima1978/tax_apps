import { EMPTY_PRINCIPAL_DRAFT, type PoaPrincipal, type PrincipalDraft } from './principalApi';
import type { PrincipalInput } from './record';
import { parseBirthDate } from './wareki';

/** 委任状の画面の委任者1人ぶんの入力（生年月日は打たれたまま） */
export type PrincipalSlot = Omit<PrincipalInput, 'birthDate'> & { birthInput: string };

/**
 * 画面の委任者の欄。record は委任者DBから入れた（または登録した）ときの DB の内容で、
 * 直したかどうかの比較と更新の版に使う。
 */
export type PrincipalForm = PrincipalSlot & { id: number; record?: PoaPrincipal };

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
 * 被相続人とのつながりは被相続人DBの側で持つので、ここでは触らない。
 */
export const draftFromSlot = (slot: PrincipalSlot, base: PrincipalDraft | undefined): PrincipalDraft => ({
  ...(base ?? EMPTY_PRINCIPAL_DRAFT),
  kind: slot.kind,
  name: slot.name.trim(),
  address: slot.address.trim(),
  representative: slot.kind === 'corporate' ? slot.representative.trim() : '',
  birthDate: slot.kind === 'individual' ? slot.birthInput.trim() : '',
});

/** 委任状の画面で直した結果、DB の登録内容と食い違っているか（委任状に刷る項目だけ比べる） */
export const slotDiffersFromRecord = (slot: PrincipalSlot, record: PoaPrincipal): boolean => {
  if (slot.kind !== record.kind) return true;
  if (slot.name.trim() !== record.name || slot.address.trim() !== record.address) return true;
  return slot.kind === 'corporate'
    ? slot.representative.trim() !== record.representative
    : normalizedBirth(slot.birthInput) !== record.birthDate;
};

/** 被相続人の欄が被相続人DBの登録内容と食い違っているか（氏名と生年月日だけ比べる） */
export const deceasedDiffersFromRecord = (input: { name: string; birthInput: string }, record: { name: string; birthDate: string }): boolean =>
  input.name.trim() !== record.name || normalizedBirth(input.birthInput) !== record.birthDate;

/** 何も入っていない欄（DB から選んだときに新しい欄を足さずにここへ入れる） */
export const isBlankSlot = (slot: PrincipalSlot): boolean =>
  ![slot.name, slot.address, slot.representative, slot.birthInput].some((value) => value.trim());

/**
 * 被相続人の相続人をまとめて欄へ入れる。空の欄から順に埋め、足りなければ欄を足す。
 * 同じ人（委任者DBの id）がもう入っていれば入れない（同じ人を2回刷らないため）。
 */
export function mergeHeirs(
  slots: PrincipalForm[],
  heirs: PoaPrincipal[],
  nextId: () => number,
): { slots: PrincipalForm[]; added: number; skipped: number } {
  const present = new Set(slots.flatMap((slot) => (slot.record ? [slot.record.id] : [])));
  const incoming = heirs.filter((heir) => !present.has(heir.id));
  const queue = [...incoming];
  const filled = slots.map((slot) => {
    if (!isBlankSlot(slot) || slot.record || queue.length === 0) return slot;
    const heir = queue.shift()!;
    return { ...slot, ...slotFieldsFromRecord(heir), record: heir };
  });
  const appended = queue.map((heir) => ({ id: nextId(), ...slotFieldsFromRecord(heir), record: heir }));
  return { slots: [...filled, ...appended], added: incoming.length, skipped: heirs.length - incoming.length };
}
