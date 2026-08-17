import { describe, expect, it } from 'vitest';
import { TABLE11F1_UNIT } from '../lib/calc';
import type { DetailSpec } from './detail';
import { TABLE11F1_SPEC } from './table11f1';
import { TABLE11F2_SPEC } from './table11f2';
import { TABLE11F3_SPEC } from './table11f3';
import { TABLE11F4_SPEC } from './table11f4';

const SPECS: Record<string, DetailSpec> = {
  table11f1: TABLE11F1_SPEC,
  table11f2: TABLE11F2_SPEC,
  table11f3: TABLE11F3_SPEC,
  table11f4: TABLE11F4_SPEC,
};

/** 入力画面に出せる欄（用紙の枠を持つ欄＋枠を持たない `extra`） */
function knownFields(spec: DetailSpec): Set<string> {
  return new Set([
    ...spec.rows.flat().flatMap((f) => (f.field === undefined ? [] : [f.field])),
    ...(spec.extra ?? []).map((f) => f.field),
  ]);
}

describe('付表の入力画面の並び（DetailSpec.panel）', () => {
  // 並びは名前で書くので、欄の名前を変えたときに静かに欠落しうる。ここで機械的に拾う
  it('並びに書いた欄はすべて様式の定義にある', () => {
    for (const [form, spec] of Object.entries(SPECS)) {
      const known = knownFields(spec);
      const unknown = (spec.panel ?? []).flat().filter((field) => !known.has(field));
      expect({ form, unknown }).toEqual({ form, unknown: [] });
    }
  });

  it('並びを持つ様式は、入力できる欄をすべて並べている', () => {
    for (const [form, spec] of Object.entries(SPECS)) {
      if (spec.panel === undefined) continue;
      const listed = new Set(spec.panel.flat());
      // 持分割合の分母は分子と1組にして出す。単価欄は他の欄から作る表示専用
      const skip = new Set(['shareD', TABLE11F1_UNIT]);
      const missing = [...knownFields(spec)].filter((field) => !skip.has(field) && !listed.has(field));
      expect({ form, missing }).toEqual({ form, missing: [] });
    }
  });
});
