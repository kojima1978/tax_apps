/**
 * 委任状の委任事項の選び方。文面そのものは委任事項マスタ（サーバ）が持ち、
 * 初期値は `@/constants/powerOfAttorneyMatters` にある。
 */
import {
  DEFAULT_MATTER_MASTER,
  MATTER_PRESETS,
  type Matter,
  type MatterMaster,
  type MatterPresetId,
  type Purpose,
} from '@/constants/powerOfAttorneyMatters';

export { DEFAULT_MATTER_MASTER, MATTER_PRESETS };
export type { Matter, MatterMaster, MatterPresetId, Purpose };

/** 事項ごとの選択。text はこの1回だけの言い回しの直し（空ならひな形どおり） */
export type MatterSelection = Record<string, { checked: boolean; text: string }>;

/** 「その他の委任事項」の欄を1行1事項に分ける */
export const splitExtraMatters = (extra: string): string[] =>
  extra
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

/** 直した文面のうち、ひな形と違うもの（定型文に登録できるもの）。違わなければ空 */
export const editedText = (matter: Matter, selection: MatterSelection): string => {
  const text = selection[matter.id]?.text.trim() ?? '';
  return text && text !== matter.text ? text : '';
};

/**
 * 刷る事項の文面を並べる。選んだ事項（マスタの並び）→「その他の委任事項」（1行1事項）の順。
 * 直した文面が空なら、ひな形の文面へ戻す（空の事項を刷らない）。
 */
export function resolveMatters(matters: Matter[], selection: MatterSelection, extra: string): string[] {
  const chosen = matters
    .filter((matter) => selection[matter.id]?.checked)
    .map((matter) => selection[matter.id].text.trim() || matter.text);
  return [...chosen, ...splitExtraMatters(extra)];
}

/** 提出先の種類を付け外ししたときの選択。外すときは、まだ選んでいる他の種類の事項を残す */
export function togglePreset(
  presets: MatterMaster['presets'],
  selection: MatterSelection,
  activePresetIds: MatterPresetId[],
  presetId: MatterPresetId,
): { selection: MatterSelection; activePresetIds: MatterPresetId[] } {
  const turningOn = !activePresetIds.includes(presetId);
  const nextActive = turningOn ? [...activePresetIds, presetId] : activePresetIds.filter((id) => id !== presetId);
  const keep = new Set(nextActive.flatMap((id) => presets[id]));
  const next = { ...selection };
  for (const id of presets[presetId]) {
    const text = next[id]?.text ?? '';
    next[id] = { checked: turningOn || keep.has(id), text };
  }
  return { selection: next, activePresetIds: nextActive };
}
