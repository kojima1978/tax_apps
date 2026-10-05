import {
  AUDIT_RELATION_FIELDS,
  AUDIT_SKIP_FIELDS,
  AUDIT_VOLATILE_KEYS,
  type FieldChange,
} from '@/types/audit-fields';

// Prisma を読み込まずにテストできるよう、差分の計算だけをここへ分けている。

const RELATION_FIELDS = new Set<string>(AUDIT_RELATION_FIELDS);

function normalize(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (v === undefined) return null;
  return v;
}

/** 子レコードの比較用に、保存のたびに変わるキー（id・日時）を取り除く */
function stripVolatile(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripVolatile);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (AUDIT_VOLATILE_KEYS.has(key)) continue;
      out[key] = stripVolatile(v);
    }
    return out;
  }
  return value;
}

function isPrimitive(v: unknown): boolean {
  return v === null || v instanceof Date || (typeof v !== 'object' && typeof v !== 'function');
}

/**
 * 変更履歴に載せる差分を作る。
 * - スカラー値は値そのものを記録する
 * - 子レコード（heirs / progress など）は中身を見比べたうえで「件数」だけを記録する。
 *   更新は deleteMany + create で作り直すので、id の差分には意味が無い
 * - それ以外のリレーション（assignee など）は、対応する *Id のスカラーで足りるので記録しない。
 *   以前はここを素通りさせていたため、保存のたびに `[object Object]` が履歴へ積まれていた
 */
export function diffScalar(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const key of Object.keys(newObj)) {
    if (AUDIT_SKIP_FIELDS.has(key)) continue;

    if (RELATION_FIELDS.has(key)) {
      const oldList = Array.isArray(oldObj[key]) ? (oldObj[key] as unknown[]) : null;
      const newList = Array.isArray(newObj[key]) ? (newObj[key] as unknown[]) : null;
      if (oldList === null && newList === null) continue;
      if (JSON.stringify(stripVolatile(oldList)) === JSON.stringify(stripVolatile(newList))) continue;
      changes.push({ field: key, old: oldList?.length ?? null, new: newList?.length ?? null });
      continue;
    }

    const o = normalize(oldObj[key]);
    const n = normalize(newObj[key]);
    if (!isPrimitive(o) || !isPrimitive(n)) continue;
    if (JSON.stringify(o) !== JSON.stringify(n)) {
      changes.push({ field: key, old: o, new: n });
    }
  }
  return changes;
}
