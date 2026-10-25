import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { getDb, writeAuditLog, type AuditAction, type PoaMatterMasterRow } from '../db.js';
import {
  MATTER_PRESETS,
  PURPOSES,
  PURPOSE_LABELS,
  type Matter,
  type MatterMaster,
  type MatterPresetId,
  type Purpose,
} from '../../src/constants/powerOfAttorneyMatters.js';

// 1枚の委任状に刷れる量より十分大きく、誤操作で膨れ上がらない程度
const MAX_TEXT_LENGTH = 1000;
const MAX_MATTERS_PER_PURPOSE = 100;
const MAX_REGISTER_TEXTS = 20;

const AUDIT_TARGET = { targetType: 'poa_matter', targetId: 'poa-matters', targetName: '委任事項' } as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= MAX_TEXT_LENGTH ? text : null;
};

const parseMatterList = (value: unknown, seenIds: Set<string>): Matter[] | null => {
  if (!Array.isArray(value) || value.length > MAX_MATTERS_PER_PURPOSE) return null;
  const matters: Matter[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id || seenIds.has(item.id)) return null;
    const text = parseText(item.text);
    if (text === null) return null;
    seenIds.add(item.id);
    matters.push({ id: item.id, text });
  }
  return matters;
};

/**
 * 画面から届いた委任事項マスタを確かめる。提出先のボタンは4つ固定なので、キーの過不足も弾く。
 * ボタンが印を付ける事項は相続手続き用に実在するものだけで、並びはマスタの並びに揃える
 * （変更が無いのに並びの違いだけで「変更あり」と記録しないため）。
 */
const parseMaster = (value: unknown): MatterMaster | null => {
  if (!isRecord(value) || !isRecord(value.matters) || !isRecord(value.presets)) return null;
  if (Object.keys(value.matters).length !== PURPOSES.length || Object.keys(value.presets).length !== MATTER_PRESETS.length) return null;

  const seenIds = new Set<string>();
  const matters = {} as Record<Purpose, Matter[]>;
  for (const purpose of PURPOSES) {
    const list = parseMatterList(value.matters[purpose], seenIds);
    if (!list) return null;
    matters[purpose] = list;
  }

  const presets = {} as Record<MatterPresetId, string[]>;
  for (const { id } of MATTER_PRESETS) {
    const ids = value.presets[id];
    if (!Array.isArray(ids) || ids.some((matterId) => typeof matterId !== 'string')) return null;
    const chosen = new Set(ids as string[]);
    if (chosen.size !== ids.length || [...chosen].some((matterId) => !matters.inheritance.some((matter) => matter.id === matterId))) return null;
    presets[id] = matters.inheritance.filter((matter) => chosen.has(matter.id)).map((matter) => matter.id);
  }
  return { matters, presets };
};

const getRow = (): PoaMatterMasterRow =>
  getDb().prepare('SELECT * FROM poa_matter_master WHERE id = 1').get() as PoaMatterMasterRow;

const toResponse = (row: PoaMatterMasterRow) => ({
  version: row.version,
  updatedAt: row.updated_at,
  ...(JSON.parse(row.payload_json) as MatterMaster),
});

const saveMaster = (master: MatterMaster): PoaMatterMasterRow => {
  getDb().prepare(`
    UPDATE poa_matter_master
    SET payload_json = ?, version = version + 1, updated_at = datetime('now')
    WHERE id = 1
  `).run(JSON.stringify(master));
  return getRow();
};

/** 操作履歴に載せる形。変更前後の差は項目名ごとに並ぶので、id ではなく文面と提出先の名前で残す */
const auditSnapshot = (master: MatterMaster) => Object.fromEntries(PURPOSES.map((purpose) => [
  PURPOSE_LABELS[purpose],
  master.matters[purpose].map((matter) => {
    if (purpose !== 'inheritance') return { 文面: matter.text };
    const presets = MATTER_PRESETS.filter((preset) => master.presets[preset.id].includes(matter.id)).map((preset) => preset.label);
    return { 文面: matter.text, 提出先ボタン: presets.join('・') || 'なし' };
  }),
]));

const classifyChange = (before: MatterMaster, after: MatterMaster): AuditAction => {
  const beforeIds = PURPOSES.flatMap((purpose) => before.matters[purpose].map((matter) => matter.id));
  const afterIds = PURPOSES.flatMap((purpose) => after.matters[purpose].map((matter) => matter.id));
  if (afterIds.some((id) => !beforeIds.includes(id))) return 'create';
  if (beforeIds.some((id) => !afterIds.includes(id))) return 'delete';
  if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) return 'reorder';
  return 'update';
};

const actorFrom = (req: { header(name: string): string | undefined }): string | undefined =>
  decodeOperatorName(req.header('x-operator-name'));

const decodeOperatorName = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return value; }
};

export function createPoaMattersRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(toResponse(getRow()));
  });

  // マスタ管理の「委任事項」タブから、全体をまとめて保存する
  router.put('/', (req, res) => {
    const master = parseMaster(req.body);
    const expectedVersion = req.body?.version;
    if (!master || !Number.isInteger(expectedVersion)) {
      res.status(400).json({ error: '委任事項の内容が正しくありません（空の事項は保存できません）' });
      return;
    }
    const db = getDb();
    const result = db.transaction(() => {
      const row = getRow();
      // 委任状の画面から「定型文に登録」された事項を、開きっぱなしの古い一覧で消さない
      if (row.version !== expectedVersion) return { conflict: true as const };
      if (row.payload_json === JSON.stringify(master)) return { row, unchanged: true };
      const before = JSON.parse(row.payload_json) as MatterMaster;
      const saved = saveMaster(master);
      writeAuditLog({
        ...AUDIT_TARGET,
        action: classifyChange(before, master),
        actor: actorFrom(req),
        before: auditSnapshot(before),
        after: auditSnapshot(master),
      });
      return { row: saved, unchanged: false };
    })();
    if ('conflict' in result) {
      res.status(409).json({ error: 'ほかの画面で委任事項が変わりました。読み直してから直してください' });
      return;
    }
    res.json({ ok: true, unchanged: result.unchanged, ...toResponse(result.row) });
  });

  /**
   * 委任状の画面の「定型文に登録」。直した文面やその他の行を、その用途の事項として足す。
   * afterId があればその事項のすぐ後ろに（元にした事項の隣に並ぶように）、無ければ末尾に足す。
   * 同じ文面がもうあれば足さずにその id を返す（2回押しても増えない）。
   */
  router.post('/register', (req, res) => {
    const purpose = req.body?.purpose as Purpose;
    const rawTexts: unknown = req.body?.texts;
    const afterId: unknown = req.body?.afterId;
    const texts = Array.isArray(rawTexts) ? rawTexts.map(parseText) : null;
    if (!PURPOSES.includes(purpose) || !texts || texts.length === 0 || texts.length > MAX_REGISTER_TEXTS
      || texts.some((text) => text === null) || (afterId !== undefined && typeof afterId !== 'string')) {
      res.status(400).json({ error: '登録する文面が正しくありません' });
      return;
    }

    const db = getDb();
    const result = db.transaction(() => {
      const row = getRow();
      const before = JSON.parse(row.payload_json) as MatterMaster;
      const list = [...before.matters[purpose]];
      const afterIndex = typeof afterId === 'string' ? list.findIndex((matter) => matter.id === afterId) : -1;
      let insertAt = afterIndex >= 0 ? afterIndex + 1 : list.length;
      const ids: string[] = [];
      let created = 0;
      for (const text of texts as string[]) {
        const existing = list.find((matter) => matter.text === text);
        if (existing) {
          ids.push(existing.id);
          continue;
        }
        const matter = { id: `matter-${randomUUID()}`, text };
        list.splice(insertAt, 0, matter);
        insertAt += 1;
        created += 1;
        ids.push(matter.id);
      }
      if (created === 0) return { row, ids, created };
      if (list.length > MAX_MATTERS_PER_PURPOSE) return { tooMany: true as const };
      const after: MatterMaster = { ...before, matters: { ...before.matters, [purpose]: list } };
      const saved = saveMaster(after);
      writeAuditLog({
        ...AUDIT_TARGET,
        action: 'create',
        actor: actorFrom(req),
        before: auditSnapshot(before),
        after: auditSnapshot(after),
      });
      return { row: saved, ids, created };
    })();
    if ('tooMany' in result) {
      res.status(400).json({ error: `委任事項は1つの用途につき${MAX_MATTERS_PER_PURPOSE}件までです` });
      return;
    }
    res.json({ ok: true, ids: result.ids, created: result.created, ...toResponse(result.row) });
  });

  return router;
}
